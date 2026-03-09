import { encodeAbiParameters, decodeAbiParameters, parseAbiParameters } from "viem";
import {
  publicClient,
  walletClient,
  getIntentRegistry,
  getCircleFactory,
  getSaveCircle,
  IntentType,
  type OnChainIntent,
  intentRegistryAbi,
  circleFactoryAbi,
  saveCircleAbi,
} from "./contracts.js";
import {
  CONTRACT_ADDRESSES,
  agentAccount,
  MATCHER_CONFIG,
  CYCLE_DURATIONS,
  DRY_RUN,
} from "./config.js";

// ─── Intent Params Schema ─────────────────────────────────────────────────────
// Encoded as: (uint256 contributionAmount, uint256 cycleDuration, uint8 preferredSize)
const INTENT_PARAMS_SCHEMA = parseAbiParameters(
  "uint256 contributionAmount, uint256 cycleDuration, uint8 preferredSize"
);

export type JoinCircleParams = {
  contributionAmount: bigint;
  cycleDuration: bigint;
  preferredSize: number;
};

export type Intent = OnChainIntent & {
  params: JoinCircleParams;
};

export type IntentGroup = {
  intents: Intent[];
  targetContributionAmount: bigint; // median of the group
  cycleDuration: bigint;
};

// ─── IntentMatcher ────────────────────────────────────────────────────────────

export class IntentMatcher {
  private intentRegistry = getIntentRegistry();
  private circleFactory = getCircleFactory();

  /** Decode JOIN_CIRCLE intent params from bytes */
  private decodeParams(paramsHash: `0x${string}`): JoinCircleParams | null {
    // NOTE: paramsHash in the contract is keccak256(params) — the raw params
    // are emitted in the IntentSubmitted event or stored separately.
    // For this prototype we treat stored paramsHash as the encoded params
    // (in production you'd read from calldata / event logs).
    try {
      const decoded = decodeAbiParameters(INTENT_PARAMS_SCHEMA, paramsHash);
      return {
        contributionAmount: decoded[0],
        cycleDuration: decoded[1],
        preferredSize: Number(decoded[2]),
      };
    } catch {
      return null;
    }
  }

  /** Fetch all open JOIN_CIRCLE intents from the registry */
  async scanJoinIntents(): Promise<Intent[]> {
    console.log("[matcher] Scanning for open JOIN_CIRCLE intents...");

    let rawIntents: readonly OnChainIntent[];
    try {
      rawIntents = await publicClient.readContract({
        address: CONTRACT_ADDRESSES.intentRegistry,
        abi: intentRegistryAbi,
        functionName: "getOpenIntents",
        args: [IntentType.JOIN_CIRCLE],
      });
    } catch (err) {
      console.error("[matcher] Failed to fetch intents:", err);
      return [];
    }

    const now = BigInt(Math.floor(Date.now() / 1000));
    const intents: Intent[] = [];

    for (const raw of rawIntents) {
      if (raw.fulfilled || raw.cancelled) continue;
      if (raw.expiresAt > 0n && raw.expiresAt < now) continue;

      const params = this.decodeParams(raw.paramsHash);
      if (!params) {
        console.warn(`[matcher] Could not decode params for intent ${raw.id}`);
        continue;
      }

      intents.push({ ...raw, params });
    }

    console.log(`[matcher] Found ${intents.length} open JOIN_CIRCLE intents`);
    return intents;
  }

  /**
   * Group intents by compatibility:
   * - Same cycle duration (exact match)
   * - Contribution amount within ±MATCHER_CONFIG.amountTolerancePct%
   */
  groupByCompatibility(intents: Intent[]): IntentGroup[] {
    // Sort by cycle duration first, then contribution amount
    const sorted = [...intents].sort((a, b) => {
      if (a.params.cycleDuration !== b.params.cycleDuration) {
        return a.params.cycleDuration < b.params.cycleDuration ? -1 : 1;
      }
      return a.params.contributionAmount < b.params.contributionAmount ? -1 : 1;
    });

    const groups: IntentGroup[] = [];
    const used = new Set<bigint>();

    for (const anchor of sorted) {
      if (used.has(anchor.id)) continue;

      const group: Intent[] = [anchor];
      used.add(anchor.id);

      const toleranceFactor = BigInt(MATCHER_CONFIG.amountTolerancePct);
      const anchorAmt = anchor.params.contributionAmount;

      for (const candidate of sorted) {
        if (used.has(candidate.id)) continue;
        if (candidate.params.cycleDuration !== anchor.params.cycleDuration) continue;

        // Check ±10% band
        const diff = candidate.params.contributionAmount > anchorAmt
          ? candidate.params.contributionAmount - anchorAmt
          : anchorAmt - candidate.params.contributionAmount;

        const pct = (diff * 100n) / anchorAmt;
        if (pct <= toleranceFactor) {
          group.push(candidate);
          used.add(candidate.id);
        }

        if (group.length >= MATCHER_CONFIG.maxGroupSize) break;
      }

      if (group.length >= MATCHER_CONFIG.minGroupSize) {
        // Compute median contribution amount for the group
        const amounts = group
          .map((i) => i.params.contributionAmount)
          .sort((a, b) => (a < b ? -1 : 1));
        const median = amounts[Math.floor(amounts.length / 2)] ?? amounts[0]!;

        groups.push({
          intents: group,
          targetContributionAmount: median,
          cycleDuration: anchor.params.cycleDuration,
        });
      }
    }

    return groups;
  }

  /**
   * Deploy a SaveCircle via CircleFactory for a matched group,
   * then fulfill all their intents via batchFulfill.
   */
  async matchAndDeploy(group: IntentGroup): Promise<string> {
    if (!walletClient || !agentAccount) {
      throw new Error("Wallet client not configured — set AGENT_PRIVATE_KEY");
    }

    console.log(
      `[matcher] Deploying circle for ${group.intents.length} members ` +
      `(${group.targetContributionAmount} wei, ${group.cycleDuration}s cycles)`
    );

    // DEMO MODE: Skip actual transactions
    if (DRY_RUN) {
      const demoAddress = "0x" + "deadbeef".repeat(5);
      console.log(`[matcher] 🏜️  DRY_RUN: Would deploy circle at ${demoAddress}`);
      console.log(
        `[matcher] 🏜️  DRY_RUN: Would batch-fulfill ${group.intents.length} intents`
      );
      return demoAddress as `0x${string}`;
    }

    // 1. Deploy circle via factory
    const { request: createRequest } = await publicClient.simulateContract({
      address: CONTRACT_ADDRESSES.circleFactory,
      abi: circleFactoryAbi,
      functionName: "createCircle",
      args: [
        agentAccount.address,
        CONTRACT_ADDRESSES.circleTrust,
        CONTRACT_ADDRESSES.moolaLendingPool,
        50n, // minTrustScore (50/100)
        group.cycleDuration,
      ],
      account: agentAccount,
    });

    const createHash = await walletClient.writeContract(createRequest);
    const createReceipt = await publicClient.waitForTransactionReceipt({ hash: createHash });
    console.log(`[matcher] Circle factory tx: ${createHash}`);

    // Extract circle address from CircleCreated event
    const circleCreatedLog = createReceipt.logs.find(
      (log) => log.topics[0] === "0x" + "CircleCreated".padEnd(64, "0") // rough check
    );
    // In production parse the event properly; for now get from getAllCircles
    const allCircles = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.circleFactory,
      abi: circleFactoryAbi,
      functionName: "getAllCircles",
    });
    const circleAddress = allCircles[allCircles.length - 1];
    if (!circleAddress) throw new Error("No circle address returned");

    console.log(`[matcher] New circle at: ${circleAddress}`);

    // 2. Initialize the circle with cUSD + contribution amount
    const { request: initRequest } = await publicClient.simulateContract({
      address: circleAddress,
      abi: saveCircleAbi,
      functionName: "initialize",
      args: [CONTRACT_ADDRESSES.cUSD, group.targetContributionAmount],
      account: agentAccount,
    });
    await walletClient.writeContract(initRequest);

    // 3. Encode solution (circle address) and batch-fulfill all intents
    const solution = encodeAbiParameters(
      parseAbiParameters("address circleAddress"),
      [circleAddress]
    );
    const intentIds = group.intents.map((i) => i.id);

    const { request: batchRequest } = await publicClient.simulateContract({
      address: CONTRACT_ADDRESSES.intentRegistry,
      abi: intentRegistryAbi,
      functionName: "batchFulfill",
      args: [intentIds, solution],
      account: agentAccount,
    });

    const batchHash = await walletClient.writeContract(batchRequest);
    console.log(`[matcher] Batch fulfill tx: ${batchHash}`);

    return circleAddress;
  }

  /** Main matcher tick — scan, group, deploy */
  async tick(): Promise<void> {
    try {
      const intents = await this.scanJoinIntents();
      if (intents.length === 0) return;

      const groups = this.groupByCompatibility(intents);
      console.log(`[matcher] Found ${groups.length} deployable group(s)`);

      for (const group of groups) {
        try {
          const circleAddr = await this.matchAndDeploy(group);
          console.log(`[matcher] ✓ Circle deployed at ${circleAddr}`);
        } catch (err) {
          console.error("[matcher] Failed to deploy group:", err);
        }
      }
    } catch (err) {
      console.error("[matcher] tick error:", err);
    }
  }
}
