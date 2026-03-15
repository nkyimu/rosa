import { formatUnits } from "viem";
import { publicClient, walletClient, CircleState, saveCircleAbi, circleFactoryAbi, erc20Abi, } from "./contracts.js";
import { CONTRACT_ADDRESSES, agentAccount, KEEPER_CONFIG, DRY_RUN, } from "./config.js";
import { checkCreditHealth, handleDefault } from "./credit.js";
import { matchBarterIntents } from "./barter.js";
import { addActivity } from "./activity.js";
// ─── CircleKeeper ─────────────────────────────────────────────────────────────
export class CircleKeeper {
    /** Get all active circles from the factory */
    async getActiveCircles() {
        try {
            const circles = await publicClient.readContract({
                address: CONTRACT_ADDRESSES.circleFactory,
                abi: circleFactoryAbi,
                functionName: "getAllCircles",
            });
            return [...circles];
        }
        catch (err) {
            console.error("[keeper] Failed to fetch circles:", err);
            return [];
        }
    }
    /** Check a circle's state */
    async getCircleState(address) {
        const state = await publicClient.readContract({
            address,
            abi: saveCircleAbi,
            functionName: "getState",
        });
        return state;
    }
    /**
     * Check all members for missed contributions.
     * A missed contribution is when roundStartTime + roundDuration has passed
     * and a member has not contributed in the current round.
     */
    async checkAndPenalizeMissed(address) {
        if (!walletClient || !agentAccount)
            return;
        const [members, roundStart, roundDuration, currentRound] = await Promise.all([
            publicClient.readContract({ address, abi: saveCircleAbi, functionName: "getMembers" }),
            publicClient.readContract({ address, abi: saveCircleAbi, functionName: "roundStartTime" }),
            publicClient.readContract({ address, abi: saveCircleAbi, functionName: "roundDuration" }),
            publicClient.readContract({ address, abi: saveCircleAbi, functionName: "currentRound" }),
        ]);
        const now = BigInt(Math.floor(Date.now() / 1000));
        const roundEnd = roundStart + roundDuration;
        // Only penalize if the round has ended
        if (now <= roundEnd)
            return;
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
            }
            else {
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
                }
                catch {
                    // Member contributed or penalty not applicable — expected, skip silently
                }
            }
        }
    }
    /**
     * Check for overdue/defaulted credit lines
     * Called periodically by keeper loop
     */
    async checkCreditHealth() {
        try {
            const defaultedCredits = await checkCreditHealth();
            if (defaultedCredits.length > 0) {
                addActivity("CIRCLE_HEALTH", `Credit health check: ${defaultedCredits.length} credit(s) defaulted`, `Default triggered on credits: ${defaultedCredits.join(", ")}`, 0.8);
                console.log(`[keeper] Credit health: ${defaultedCredits.length} defaulted`);
                for (const creditId of defaultedCredits) {
                    try {
                        await handleDefault(creditId);
                    }
                    catch (err) {
                        console.error(`[keeper] Error handling default for credit ${creditId}:`, err);
                    }
                }
            }
        }
        catch (err) {
            console.error("[keeper] Error checking credit health:", err);
        }
    }
    /**
     * Find and match barter intents
     * Called periodically by keeper loop
     */
    async checkBarterMatches() {
        try {
            const matches = await matchBarterIntents();
            if (matches.length > 0) {
                addActivity("CIRCLE_MATCH", `Barter matching: ${matches.length} match(es) found`, `Top match: ${matches[0].matchId} (${matches[0].compatibility}% compatible)`, matches[0].compatibility / 100);
                console.log(`[keeper] Barter matches: ${matches.length} found`);
            }
        }
        catch (err) {
            console.error("[keeper] Error checking barter matches:", err);
        }
    }
    /**
     * Check if round rotation is due and advance it.
     */
    async checkAndAdvanceRound(address) {
        if (!walletClient || !agentAccount)
            return;
        const [roundStart, roundDuration, rotationIndex, memberCount] = await Promise.all([
            publicClient.readContract({ address, abi: saveCircleAbi, functionName: "roundStartTime" }),
            publicClient.readContract({ address, abi: saveCircleAbi, functionName: "roundDuration" }),
            publicClient.readContract({ address, abi: saveCircleAbi, functionName: "rotationIndex" }),
            publicClient.readContract({ address, abi: saveCircleAbi, functionName: "getMemberCount" }),
        ]);
        const now = BigInt(Math.floor(Date.now() / 1000));
        const roundEnd = roundStart + roundDuration;
        if (now <= roundEnd)
            return; // Not due yet
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
    async sweepIdleCapital(address) {
        if (!walletClient || !agentAccount)
            return;
        const tokenAddress = await publicClient.readContract({
            address,
            abi: saveCircleAbi,
            functionName: "tokenAddress",
        });
        if (tokenAddress === "0x0000000000000000000000000000000000000000")
            return;
        const balance = await publicClient.readContract({
            address: tokenAddress,
            abi: erc20Abi,
            functionName: "balanceOf",
            args: [address],
        });
        if (balance < KEEPER_CONFIG.minSweepAmount)
            return;
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
        if (sweepable < KEEPER_CONFIG.minSweepAmount)
            return;
        console.log(`[keeper] Sweeping ${formatUnits(sweepable, 18)} cUSD to yield vault for ${address}`);
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
        }
        catch (err) {
            console.error(`[keeper] Sweep failed for ${address}:`, err);
        }
    }
    /**
     * Harvest yield if there's enough to be worth the gas.
     */
    async harvestYieldIfProfitable(address) {
        if (!walletClient || !agentAccount)
            return;
        const totalYield = await publicClient.readContract({
            address,
            abi: saveCircleAbi,
            functionName: "totalYieldGenerated",
        });
        if (totalYield < KEEPER_CONFIG.minYieldToHarvest)
            return;
        console.log(`[keeper] Harvesting ${formatUnits(totalYield, 18)} cUSD yield for ${address}`);
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
        }
        catch (err) {
            console.error(`[keeper] Harvest failed for ${address}:`, err);
        }
    }
    /** Main keeper tick — process all active circles and credit/barter management */
    async tick() {
        try {
            const circles = await this.getActiveCircles();
            if (circles.length === 0) {
                console.log("[keeper] No circles to maintain");
            }
            else {
                console.log(`[keeper] Maintaining ${circles.length} circle(s)...`);
                for (const circleAddress of circles) {
                    try {
                        const state = await this.getCircleState(circleAddress);
                        if (state !== CircleState.ACTIVE) {
                            console.log(`[keeper] Circle ${circleAddress} is not active (state: ${CircleState[state]}), skipping`);
                            continue;
                        }
                        // Run all keeper tasks in parallel for efficiency
                        if (walletClient && agentAccount) {
                            await Promise.allSettled([
                                this.checkAndPenalizeMissed(circleAddress),
                                this.checkAndAdvanceRound(circleAddress),
                                this.sweepIdleCapital(circleAddress),
                                this.harvestYieldIfProfitable(circleAddress),
                            ]);
                        }
                        else {
                            console.warn(`[keeper] Wallet client not available — skipping transaction tasks for ${circleAddress}`);
                        }
                        console.log(`[keeper] ✓ Processed circle ${circleAddress}`);
                    }
                    catch (err) {
                        console.error(`[keeper] Error processing circle ${circleAddress}:`, err);
                    }
                }
            }
            // Run credit and barter checks (separate from circle loop)
            await Promise.allSettled([
                this.checkCreditHealth(),
                this.checkBarterMatches(),
            ]);
            console.log("[keeper] ✓ Keeper tick complete");
        }
        catch (err) {
            console.error("[keeper] tick error:", err);
        }
    }
}
