/**
 * @file trust.ts
 * @description Trust assessment module for agent reputation and tier-based access control
 *
 * Reads from ERC-8004 Reputation Registry to compute trust scores and tiers.
 * Caches trust scores with 5-minute TTL to reduce RPC calls.
 *
 * Trust Tiers:
 * - NOVICE: 0-50 points (can join small circles 1-3 members)
 * - MEMBER: 50-80 points (can join medium circles 4-8 members)
 * - CREDITOR: 80-95 points (can issue micro-credit up to 20% portfolio)
 * - ELDER: 95+ points (can settle barter intents directly)
 */
/**
 * Trust tier enum (matches smart contracts)
 */
export declare enum TrustTier {
    NOVICE = "NOVICE",// 0-50: join small circles
    MEMBER = "MEMBER",// 50-80: join medium circles
    CREDITOR = "CREDITOR",// 80-95: issue micro-credit
    ELDER = "ELDER"
}
/**
 * Trust score and tier result
 */
export interface TrustScore {
    agentId?: string;
    score: number;
    tier: TrustTier;
    circlesCompleted: number;
    defaults: number;
    avgPeerRating: number;
    lastUpdated: number;
}
/**
 * Credit worthiness assessment
 */
export interface CreditworthinessAssessment {
    issuerCanIssue: boolean;
    borrowerCanAccept: boolean;
    maxAmount: bigint;
    recommendedAmount: bigint;
    reason: string;
    riskScore: number;
}
/**
 * Compute trust tier from score (0-100)
 * @param score Reputation score
 * @returns Trust tier
 */
export declare function computeTrustTier(score: number): TrustTier;
/**
 * Get agent trust score from on-chain reputation registry
 * Uses local cache with 5-minute TTL.
 *
 * @param agentId ERC-8004 agent ID or wallet address
 * @returns Trust score with tier
 */
export declare function getAgentTrustScore(agentId: string): Promise<TrustScore>;
/**
 * Get agent's trust tier
 * @param agentId ERC-8004 agent ID or wallet address
 * @returns Trust tier
 */
export declare function getAgentTier(agentId: string): Promise<TrustTier>;
/**
 * Assess if an issuer can extend credit to a borrower
 *
 * Rules:
 * - Issuer must be CREDITOR tier (80+) to issue any credit
 * - Borrower must be MEMBER+ (50+) to accept credit
 * - Issuer can lend up to 20% of portfolio (CREDITOR) or 40% (ELDER)
 * - Each credit capped at 10-20% per borrower depending on tier
 *
 * @param issuerAddress Issuer's wallet address
 * @param borrowerAddress Borrower's wallet address
 * @param issuerPortfolioValue Total portfolio value in wei
 * @returns Credit worthiness assessment
 */
export declare function assessCreditworthiness(issuerAddress: string, borrowerAddress: string, issuerPortfolioValue: bigint): Promise<CreditworthinessAssessment>;
/**
 * Clear cache (for testing)
 */
export declare function clearTrustCache(): void;
/**
 * Get cache stats (for monitoring)
 */
export declare function getTrustCacheStats(): {
    size: number;
    entries: Array<{
        agentId: string;
        score: number;
        tier: TrustTier;
        expiresAt: number;
    }>;
};
