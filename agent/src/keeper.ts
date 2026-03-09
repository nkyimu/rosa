import { formatUnits } from "viem";
import {
  publicClient,
  walletClient,
  getSaveCircle,
  getCircleFactory,
  CircleState,
  saveCircleAbi,
  circleFactoryAbi,
  erc20Abi,
} from "./contracts.js";
import {
  CONTRACT_ADDRESSES,
  agentAccount,
  KEEPER_CONFIG,
  DRY_RUN,
} from "./config.js";

// ─── CircleKeeper ─────────────────────────────────────────────────────────────

export class CircleKeeper {
  /** Get all active circles from the factory */
  private async getActiveCircles(): Promise<`0x${string}`[]> {
    try {
      const circles = await publicClient.readContract({
        address: CONTRACT_ADDRESSES.circleFactory,
        abi: circleFactoryAbi,
        functionName: "getAllCircles",
      });
      return [...circles] as `0x${string}`[];
    } catch (err) {
      console.error("[keeper] Failed to fetch circles:", err);
      return [];
    }
  }

  /** Check a circle's state */
  private async getCircleState(address: `0x${string}`): Promise<CircleState> {
    const state = await publicClient.readContract({
      address,
      abi: saveCircleAbi,
      functionName: "getState",
    });
    return state as CircleState;
  }

  /**
   * Check all members for missed contributions.
   * A missed contribution is when roundStartTime + roundDuration has passed
   * and a member has not contributed in the current round.
   */
  private async checkAndPenalizeMissed(address: `0x${string}`): Promise<void> {
    if (!walletClient || !agentAccount) return;

    const [members, roundStart, roundDuration, currentRound] = await Promise.all([
      publicClient.readContract({ address, abi: saveCircleAbi, functionName: "getMembers" }),
      publicClient.readContract({ address, abi: saveCircleAbi, functionName: "roundStartTime" }),
      publicClient.readContract({ address, abi: saveCircleAbi, functionName: "roundDuration" }),
      publicClient.readContract({ address, abi: saveCircleAbi, functionName: "currentRound" }),
    ]);

    const now = BigInt(Math.floor(Date.now() / 1000));
    const roundEnd = roundStart + roundDuration;

    // Only penalize if the round has ended
    if (now <= roundEnd) return;

    for (const member of members) {
      // Check if member has contributed this round by checking their totalContributed
      // In a real implementation you'd track per-round contributions via events
      const penaltyCount = await publicClient.readContract({
        address,
        abi: saveCircleAbi,
        functionName: "penaltyCount",
        args: [member],
      });

      // Heuristic: try to penalize — contract will revert if not applicable
      if (DRY_RUN) {
        console.log(`[keeper] 🏜️  DRY_RUN: Would penalize ${member} in circle ${address}`);
      } else {
        try {
          const { request } = await publicClient.simulateContract({
            address,
            abi: saveCircleAbi,
            functionName: "penalize",
            args: [member],
            account: agentAccount,
          });
          const hash = await walletClient.writeContract(request);
          console.log(`[keeper] Penalized ${member} in circle ${address} — tx: ${hash}`);
        } catch {
          // Member contributed or penalty not applicable — expected, skip silently
        }
      }
    }
  }

  /**
   * Check if round rotation is due and advance it.
   */
  private async checkAndAdvanceRound(address: `0x${string}`): Promise<void> {
    if (!walletClient || !agentAccount) return;

    const [roundStart, roundDuration, rotationIndex, memberCount] = await Promise.all([
      publicClient.readContract({ address, abi: saveCircleAbi, functionName: "roundStartTime" }),
      publicClient.readContract({ address, abi: saveCircleAbi, functionName: "roundDuration" }),
      publicClient.readContract({ address, abi: saveCircleAbi, functionName: "rotationIndex" }),
      publicClient.readContract({ address, abi: saveCircleAbi, functionName: "getMemberCount" }),
    ]);

    const now = BigInt(Math.floor(Date.now() / 1000));
    const roundEnd = roundStart + roundDuration;

    if (now <= roundEnd) return; // Not due yet

    // All rotations done → circle is complete
    if (rotationIndex >= memberCount) {
      console.log(`[keeper] Circle ${address} — all rotations complete`);
      return;
    }

    console.log(`[keeper] Round rotation due for circle ${address}`);
    // The circle advances when the current rotation recipient calls claimRotation
    // The agent can trigger this if the recipient hasn't claimed (after grace period)
    // For now just log — in production you'd check a grace period and force-advance
  }

  /**
   * Sweep idle cUSD balance to Moola for yield.
   */
  private async sweepIdleCapital(address: `0x${string}`): Promise<void> {
    if (!walletClient || !agentAccount) return;

    const tokenAddress = await publicClient.readContract({
      address,
      abi: saveCircleAbi,
      functionName: "tokenAddress",
    });

    if (tokenAddress === "0x0000000000000000000000000000000000000000") return;

    const balance = await publicClient.readContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [address],
    });

    if (balance < KEEPER_CONFIG.minSweepAmount) return;

    // Keep enough to cover next rotation payout, sweep the rest
    const contributionAmount = await publicClient.readContract({
      address,
      abi: saveCircleAbi,
      functionName: "contributionAmount",
    });
    const memberCount = await publicClient.readContract({
      address,
      abi: saveCircleAbi,
      functionName: "getMemberCount",
    });

    const nextPayout = contributionAmount * memberCount;
    const sweepable = balance > nextPayout ? balance - nextPayout : 0n;

    if (sweepable < KEEPER_CONFIG.minSweepAmount) return;

    console.log(
      `[keeper] Sweeping ${formatUnits(sweepable, 18)} cUSD to yield vault for ${address}`
    );

    if (DRY_RUN) {
      console.log(`[keeper] 🏜️  DRY_RUN: Would sweep ${formatUnits(sweepable, 18)} cUSD`);
      return;
    }

    try {
      const { request } = await publicClient.simulateContract({
        address,
        abi: saveCircleAbi,
        functionName: "sweepToYield",
        args: [sweepable],
        account: agentAccount,
      });
      const hash = await walletClient.writeContract(request);
      console.log(`[keeper] Sweep tx: ${hash}`);
    } catch (err) {
      console.error(`[keeper] Sweep failed for ${address}:`, err);
    }
  }

  /**
   * Harvest yield if there's enough to be worth the gas.
   */
  private async harvestYieldIfProfitable(address: `0x${string}`): Promise<void> {
    if (!walletClient || !agentAccount) return;

    const totalYield = await publicClient.readContract({
      address,
      abi: saveCircleAbi,
      functionName: "totalYieldGenerated",
    });

    if (totalYield < KEEPER_CONFIG.minYieldToHarvest) return;

    console.log(
      `[keeper] Harvesting ${formatUnits(totalYield, 18)} cUSD yield for ${address}`
    );

    if (DRY_RUN) {
      console.log(`[keeper] 🏜️  DRY_RUN: Would harvest ${formatUnits(totalYield, 18)} cUSD yield`);
      return;
    }

    try {
      const { request } = await publicClient.simulateContract({
        address,
        abi: saveCircleAbi,
        functionName: "harvestYield",
        account: agentAccount,
      });
      const hash = await walletClient.writeContract(request);
      console.log(`[keeper] Harvest tx: ${hash}`);
    } catch (err) {
      console.error(`[keeper] Harvest failed for ${address}:`, err);
    }
  }

  /** Main keeper tick — process all active circles */
  async tick(): Promise<void> {
    try {
      const circles = await this.getActiveCircles();
      if (circles.length === 0) {
        console.log("[keeper] No circles to maintain");
        return;
      }

      console.log(`[keeper] Maintaining ${circles.length} circle(s)...`);

      for (const circleAddress of circles) {
        try {
          const state = await this.getCircleState(circleAddress);

          if (state !== CircleState.ACTIVE) {
            console.log(`[keeper] Circle ${circleAddress} is not active (state: ${CircleState[state]}), skipping`);
            continue;
          }

          // Run all keeper tasks in parallel for efficiency
          await Promise.allSettled([
            this.checkAndPenalizeMissed(circleAddress),
            this.checkAndAdvanceRound(circleAddress),
            this.sweepIdleCapital(circleAddress),
            this.harvestYieldIfProfitable(circleAddress),
          ]);

          console.log(`[keeper] ✓ Processed circle ${circleAddress}`);
        } catch (err) {
          console.error(`[keeper] Error processing circle ${circleAddress}:`, err);
        }
      }
    } catch (err) {
      console.error("[keeper] tick error:", err);
    }
  }
}
