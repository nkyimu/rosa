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
import {
  scoreIntentsWithVenice,
  getGroupRecommendationsFromVenice,
  getVeniceStatus,
} from "./venice-privacy.js";
import { recordPrivacyEvent, generatePrivacyReport } from "./privacy-attestation.js";

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
  // Cache: paramsHash → raw ABI-encoded params (recovered from tx calldata)
  private paramsCache = new Map<`0x${string}`, `0x${string}`>();
  private lastScannedBlock = 0n;

  /** Decode JOIN_CIRCLE intent params from raw ABI bytes */
  private decodeParams(rawParams: `0x${string}`): JoinCircleParams | null {
    try {
      const decoded = decodeAbiParameters(INTENT_PARAMS_SCHEMA, rawParams);
      return {
        contributionAmount: decoded[0],
        cycleDuration: decoded[1],
        preferredSize: Number(decoded[2]),
      };
    } catch {
      return null;
    }
  }

  /**
   * Build paramsHash → rawParams cache by scanning IntentSubmitted events
   * and recovering the original params from transaction input calldata.
   */
  private async buildParamsCache(): Promise<void> {
    try {
      const currentBlock = await publicClient.getBlockNumber();
      // Scan from last scanned block (or last 5000 blocks on first run)
      // Scan last 2000 blocks max on first run (Celo Sepolia is fast, ~5s blocks)
      const SCAN_DEPTH = 2000n;
      const fromBlock = this.lastScannedBlock > 0n
        ? this.lastScannedBlock + 1n
        : currentBlock > SCAN_DEPTH ? currentBlock - SCAN_DEPTH : 0n;

      if (fromBlock > currentBlock) return;

      console.log(`[matcher] Scanning blocks ${fromBlock}–${currentBlock} for IntentSubmitted events...`);

      // Get IntentSubmitted events
      const logs = await publicClient.getLogs({
        address: CONTRACT_ADDRESSES.intentRegistry,
        event: {
          type: 'event' as const,
          name: 'IntentSubmitted',
          inputs: [
            { name: 'intentId', type: 'uint256', indexed: true },
            { name: 'intentType', type: 'uint8', indexed: true },
            { name: 'creator', type: 'address', indexed: true },
            { name: 'expiresAt', type: 'uint256', indexed: false },
          ],
        },
        fromBlock,
        toBlock: currentBlock,
      });

      console.log(`[matcher] Found ${logs.length} IntentSubmitted event(s) in range`);

      const { keccak256 } = await import("viem");

      for (const log of logs) {
        const txHash = log.transactionHash;
        if (!txHash) continue;

        try {
          const tx = await publicClient.getTransaction({ hash: txHash });
          // submitIntent(uint8,bytes,uint256) — skip 4-byte selector
          const argsData = ('0x' + tx.input.slice(10)) as `0x${string}`;
          const decoded = decodeAbiParameters(
            parseAbiParameters("uint8 intentType, bytes params, uint256 expiresAt"),
            argsData
          );
          const rawParams = decoded[1] as `0x${string}`;
          const hash = keccak256(rawParams) as `0x${string}`;
          this.paramsCache.set(hash, rawParams);
          console.log(`[matcher] Cached params for intent ${log.args?.intentId} (hash: ${hash.slice(0, 10)}...)`);
        } catch (err) {
          console.warn(`[matcher] Could not recover params from tx ${txHash}: ${err}`);
        }
      }

      this.lastScannedBlock = currentBlock;
    } catch (err: any) {
      console.error("[matcher] Failed to build params cache:", err?.message ?? err);
      console.error("[matcher] Stack:", err?.stack?.split('\n')[0]);
    }
  }

  /** Fetch all open JOIN_CIRCLE intents from the registry */
  async scanJoinIntents(): Promise<Intent[]> {
    console.log("[matcher] Scanning for open JOIN_CIRCLE intents...");

    // Always refresh params cache first (awaited — ensures cache is populated before scan)
    await this.buildParamsCache();
    console.log(`[matcher] Params cache has ${this.paramsCache.size} entries`);

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

      // Look up raw params from cache using the stored paramsHash
      const rawParams = this.paramsCache.get(raw.paramsHash);
      if (!rawParams) {
        console.warn(`[matcher] No cached params for intent ${raw.id} (hash: ${raw.paramsHash})`);
        continue;
      }

      const params = this.decodeParams(rawParams);
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
   * Group intents with Venice privacy layer:
   * 1. Score each intent for risk via Venice (private inference)
   * 2. Get Venice's grouping recommendations
   * 3. Fall back to local matching if Venice unavailable
   * 4. Return groups as IntentGroup[] for deployment
   */
  async groupByVeniceScoring(intents: Intent[]): Promise<IntentGroup[]> {
    const veniceStatus = getVeniceStatus();
    console.log(`[matcher] Venice mode: ${veniceStatus.mode}, model: ${veniceStatus.model} (TEE: ${veniceStatus.isTEE})`);

    if (veniceStatus.mode !== "enabled") {
      console.log("[matcher] Venice disabled — using local compatibility matching");
      return this.groupByCompatibility(intents);
    }

    try {
      // Get risk scores from Venice
      const riskScores = await scoreIntentsWithVenice(intents);

      // Get group recommendations from Venice
      const recommendations = await getGroupRecommendationsFromVenice(intents, riskScores);

      // Convert Venice recommendations to IntentGroup format
      if (recommendations.length === 0) {
        console.log("[matcher] No groups from Venice — falling back to local matching");
        return this.groupByCompatibility(intents);
      }

      const groups: IntentGroup[] = [];

      for (const rec of recommendations) {
        // Validate group size
        if (rec.group.length < MATCHER_CONFIG.minGroupSize) {
          console.log(`[matcher] Skipping Venice group: too small (${rec.group.length} < ${MATCHER_CONFIG.minGroupSize})`);
          continue;
        }

        if (rec.group.length > MATCHER_CONFIG.maxGroupSize) {
          console.log(`[matcher] Skipping Venice group: too large (${rec.group.length} > ${MATCHER_CONFIG.maxGroupSize})`);
          continue;
        }

        // Build IntentGroup from indices
        const groupIntents = rec.group.map((idx) => intents[idx]).filter(Boolean);
        if (groupIntents.length === 0) continue;

        const amounts = groupIntents
          .map((i) => i.params.contributionAmount)
          .sort((a, b) => (a < b ? -1 : 1));
        const median = amounts[Math.floor(amounts.length / 2)] ?? amounts[0]!;

        groups.push({
          intents: groupIntents,
          targetContributionAmount: median,
          cycleDuration: groupIntents[0]!.params.cycleDuration,
        });

        console.log(
          `[matcher] ✓ Venice group: ${groupIntents.length} members, ` +
          `${median} wei, confidence ${(rec.confidence * 100).toFixed(1)}%, ` +
          `ROI ${(rec.estimatedROI * 100).toFixed(1)}%`
        );

        recordPrivacyEvent({
          type: "grouping_decision",
          intentsAnalyzed: intents.length,
          groupsRecommended: groups.length,
          veniceModel: veniceStatus.model,
          timestamp: Date.now(),
        });
      }

      return groups;
    } catch (err) {
      console.error("[matcher] Venice grouping error:", err instanceof Error ? err.message : String(err));
      console.log("[matcher] Falling back to local compatibility matching");
      return this.groupByCompatibility(intents);
    }
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
        CONTRACT_ADDRESSES.moolaLendingPool, // lendingPool (zero address = no yield)
        CONTRACT_ADDRESSES.cUSD,             // aToken (using cUSD as placeholder)
        0n,                                  // minTrustScore (0 for testnet demo)
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
    // Wait for nonce to update after createCircle + initialize txs
    await new Promise((r) => setTimeout(r, 5000));

    const solution = encodeAbiParameters(
      parseAbiParameters("address circleAddress"),
      [circleAddress]
    );
    const intentIds = group.intents.map((i) => BigInt(i.id));

    const nonce = await publicClient.getTransactionCount({ address: agentAccount.address });
    const batchHash = await walletClient.writeContract({
      address: CONTRACT_ADDRESSES.intentRegistry,
      abi: intentRegistryAbi,
      functionName: "batchFulfill",
      args: [intentIds, solution],
      account: agentAccount,
      chain: walletClient.chain,
      nonce,
    });
    console.log(`[matcher] Batch fulfill tx: ${batchHash}`);

    return circleAddress;
  }

  /** Main matcher tick — scan, group with Venice, deploy */
  async tick(): Promise<void> {
    try {
      const intents = await this.scanJoinIntents();
      if (intents.length === 0) return;

      // Use Venice-enhanced grouping (falls back to local if unavailable)
      const groups = await this.groupByVeniceScoring(intents);
      console.log(`[matcher] Found ${groups.length} deployable group(s) via Venice scoring`);

      for (const group of groups) {
        try {
          const circleAddr = await this.matchAndDeploy(group);
          console.log(`[matcher] ✓ Circle deployed at ${circleAddr}`);
        } catch (err) {
          console.error("[matcher] Failed to deploy group:", err instanceof Error ? err.message : String(err));
        }
      }
    } catch (err) {
      console.error("[matcher] tick error:", err);
    }
  }
}
