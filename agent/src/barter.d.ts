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
/**
 * Barter intent type
 */
export interface BarterIntent {
    id: string;
    agentAddress: string;
    offering: string;
    seeking: string;
    description: string;
    createdAt: number;
    expiresAt?: number;
    status: "OPEN" | "MATCHED" | "SETTLED";
    matchedWith?: string;
}
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
export declare function submitBarterIntent(agentAddress: string, offering: string, seeking: string, expiresAt?: number): Promise<string>;
/**
 * Match compatible barter intents
 *
 * Uses simple keyword overlap to find compatible pairs.
 * Returns matches sorted by compatibility score (0-100).
 *
 * @returns Array of matches with compatibility score
 */
export declare function matchBarterIntents(): Promise<Array<{
    matchId: string;
    intentA: BarterIntent;
    intentB: BarterIntent;
    compatibility: number;
    reason: string;
}>>;
/**
 * Settle a barter match (both agents confirm)
 *
 * Marks intents as SETTLED when both parties confirm completion.
 * In production, triggers reputation updates on-chain.
 *
 * @param intentAId First intent ID
 * @param intentBId Second intent ID
 */
export declare function settleBarterIntent(intentAId: string, intentBId: string): Promise<void>;
/**
 * Get all open barter intents
 * @returns Open intents
 */
export declare function getOpenBarterIntents(): BarterIntent[];
/**
 * Get barter intent by ID
 * @param intentId Intent ID
 * @returns Intent or undefined
 */
export declare function getBarterIntent(intentId: string): BarterIntent | undefined;
/**
 * Get all barter intents for an agent
 * @param agentAddress Agent wallet address
 * @returns All intents from this agent
 */
export declare function getAgentBarterIntents(agentAddress: string): BarterIntent[];
/**
 * Get all barter intents (for monitoring)
 */
export declare function getAllBarterIntents(): BarterIntent[];
/**
 * Clear all intents (for testing)
 */
export declare function clearBarterIntents(): void;
