/**
 * @file barter.ts
 * @description Intent-based barter matching for high-trust agents
 *
 * ELDER agents (95+ reputation) can submit barter intents and have them
 * matched with compatible intents from other high-trust agents.
 *
 * Uses simple keyword-based matching for MVP (not LLM-based).
 * Intents settled on-chain without currency transfer.
 *
 * Mock implementation — IntentRegistry contract being built in parallel.
 */
import { getAgentTier, TrustTier } from "./trust.js";
import { addActivity } from "./activity.js";
/**
 * In-memory barter intent storage (mock)
 */
const barterIntents = new Map();
let intentCounter = 0;
/**
 * Submit a barter intent (ELDER agents only)
 *
 * Requirements:
 * - Agent must be ELDER tier (95+)
 * - Offering and seeking must be non-empty
 * - Intents are valid for 30 days by default
 *
 * @param agentAddress Agent wallet address
 * @param offering What the agent can provide
 * @param seeking What the agent is looking for
 * @param expiresAt Optional expiry timestamp (unix seconds)
 * @returns Intent ID
 */
export async function submitBarterIntent(agentAddress, offering, seeking, expiresAt) {
    // Check agent is ELDER tier
    const tier = await getAgentTier(agentAddress);
    if (tier !== TrustTier.ELDER) {
        throw new Error(`Agent tier ${tier} cannot submit barter intents (ELDER tier required, 95+ reputation)`);
    }
    if (!offering || !seeking) {
        throw new Error("Offering and seeking must be non-empty");
    }
    const intentId = String(++intentCounter);
    const now = Math.floor(Date.now() / 1000);
    const defaultExpiry = now + 30 * 24 * 60 * 60; // 30 days
    const intent = {
        id: intentId,
        agentAddress,
        offering,
        seeking,
        description: `Offering: ${offering}, Seeking: ${seeking}`,
        createdAt: now,
        expiresAt: expiresAt || defaultExpiry,
        status: "OPEN",
    };
    barterIntents.set(intentId, intent);
    addActivity("INTENT_PARSED", `Barter intent submitted: ${intentId}`, `${agentAddress.slice(0, 6)}... offering "${offering}", seeking "${seeking}"`, 0.9);
    return intentId;
}
/**
 * Match compatible barter intents
 *
 * Uses simple keyword overlap to find compatible pairs.
 * Returns matches sorted by compatibility score (0-100).
 *
 * @returns Array of matches with compatibility score
 */
export async function matchBarterIntents() {
    const matches = [];
    const openIntents = Array.from(barterIntents.values()).filter((i) => i.status === "OPEN");
    for (let i = 0; i < openIntents.length; i++) {
        for (let j = i + 1; j < openIntents.length; j++) {
            const intentA = openIntents[i];
            const intentB = openIntents[j];
            // Skip if same agent
            if (intentA.agentAddress.toLowerCase() === intentB.agentAddress.toLowerCase()) {
                continue;
            }
            // Skip if either already matched
            if (intentA.status !== "OPEN" || intentB.status !== "OPEN") {
                continue;
            }
            // Compute semantic similarity using keyword overlap
            const scoreAtoB = keywordSimilarity(intentA.offering, intentB.seeking);
            const scoreBtoA = keywordSimilarity(intentB.offering, intentA.seeking);
            const avgScore = (scoreAtoB + scoreBtoA) / 2;
            if (avgScore >= 0.5) {
                // At least 50% keyword overlap
                const matchId = `match-${i}-${j}`;
                matches.push({
                    matchId,
                    intentA,
                    intentB,
                    compatibility: Math.round(avgScore * 100),
                    reason: `A offers "${intentA.offering}" (matches B's seeking), B offers "${intentB.offering}" (matches A's seeking)`,
                });
            }
        }
    }
    // Sort by compatibility score (highest first)
    matches.sort((a, b) => b.compatibility - a.compatibility);
    if (matches.length > 0) {
        addActivity("CIRCLE_MATCH", `Found ${matches.length} barter match(es)`, `Top match: ${matches[0].matchId} (${matches[0].compatibility}% compatibility)`, matches[0].compatibility / 100);
    }
    return matches;
}
/**
 * Settle a barter match (both agents confirm)
 *
 * Marks intents as SETTLED when both parties confirm completion.
 * In production, triggers reputation updates on-chain.
 *
 * @param intentAId First intent ID
 * @param intentBId Second intent ID
 */
export async function settleBarterIntent(intentAId, intentBId) {
    const maybeIntentA = barterIntents.get(intentAId);
    const maybeIntentB = barterIntents.get(intentBId);
    if (!maybeIntentA || !maybeIntentB) {
        throw new Error(`One or both intents not found`);
    }
    const intentA = maybeIntentA;
    const intentB = maybeIntentB;
    if (intentA.status !== "MATCHED" && intentA.status !== "OPEN") {
        throw new Error(`Intent A status is ${intentA.status}, cannot settle`);
    }
    if (intentB.status !== "MATCHED" && intentB.status !== "OPEN") {
        throw new Error(`Intent B status is ${intentB.status}, cannot settle`);
    }
    // Mark both as settled
    const settledIntentA = {
        ...intentA,
        status: "SETTLED",
        matchedWith: intentBId,
    };
    const settledIntentB = {
        ...intentB,
        status: "SETTLED",
        matchedWith: intentAId,
    };
    barterIntents.set(intentAId, settledIntentA);
    barterIntents.set(intentBId, settledIntentB);
    addActivity("EXECUTE", `Barter settlement: ${intentAId} ↔ ${intentBId}`, `${intentA.agentAddress.slice(0, 6)}... and ${intentB.agentAddress.slice(0, 6)}... completed barter exchange`, 1.0);
}
/**
 * Get all open barter intents
 * @returns Open intents
 */
export function getOpenBarterIntents() {
    return Array.from(barterIntents.values()).filter((i) => i.status === "OPEN");
}
/**
 * Get barter intent by ID
 * @param intentId Intent ID
 * @returns Intent or undefined
 */
export function getBarterIntent(intentId) {
    return barterIntents.get(intentId);
}
/**
 * Get all barter intents for an agent
 * @param agentAddress Agent wallet address
 * @returns All intents from this agent
 */
export function getAgentBarterIntents(agentAddress) {
    return Array.from(barterIntents.values()).filter((i) => i.agentAddress.toLowerCase() === agentAddress.toLowerCase());
}
/**
 * Keyword similarity using Jaccard index
 * Returns overlap of keyword sets (0-1)
 *
 * @param text1 First text
 * @param text2 Second text
 * @returns Similarity score (0-1)
 */
function keywordSimilarity(text1, text2) {
    const tokens1 = new Set(text1.toLowerCase().split(/\s+/));
    const tokens2 = new Set(text2.toLowerCase().split(/\s+/));
    // Remove common stop words
    const stopWords = new Set(["a", "an", "the", "and", "or", "for", "to", "of", "in", "on", "at", "by"]);
    tokens1.forEach((t) => {
        if (stopWords.has(t))
            tokens1.delete(t);
    });
    tokens2.forEach((t) => {
        if (stopWords.has(t))
            tokens2.delete(t);
    });
    // Jaccard index: intersection / union
    const intersection = new Set([...tokens1].filter((t) => tokens2.has(t)));
    const union = new Set([...tokens1, ...tokens2]);
    return union.size > 0 ? intersection.size / union.size : 0;
}
/**
 * Get all barter intents (for monitoring)
 */
export function getAllBarterIntents() {
    return Array.from(barterIntents.values());
}
/**
 * Clear all intents (for testing)
 */
export function clearBarterIntents() {
    barterIntents.clear();
    intentCounter = 0;
}
