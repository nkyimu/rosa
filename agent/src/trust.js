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
import { addActivity } from "./activity.js";
/**
 * Trust tier enum (matches smart contracts)
 */
export var TrustTier;
(function (TrustTier) {
    TrustTier["NOVICE"] = "NOVICE";
    TrustTier["MEMBER"] = "MEMBER";
    TrustTier["CREDITOR"] = "CREDITOR";
    TrustTier["ELDER"] = "ELDER";
})(TrustTier || (TrustTier = {}));
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const trustScoreCache = new Map();
/**
 * Test override map — allows tests to set deterministic trust scores
 * Key: lowercase address, Value: score (0-100)
 */
const testOverrides = new Map();
/**
 * Set a test override for an agent's trust score (for testing only)
 */
export function setTestTrustScore(agentId, score) {
    testOverrides.set(agentId.toLowerCase(), score);
    trustScoreCache.delete(agentId.toLowerCase());
}
/**
 * Clear all test overrides and cache
 */
export function clearTrustOverrides() {
    testOverrides.clear();
    trustScoreCache.clear();
}
/**
 * Compute trust tier from score (0-100)
 * @param score Reputation score
 * @returns Trust tier
 */
export function computeTrustTier(score) {
    if (score >= 95)
        return TrustTier.ELDER;
    if (score >= 80)
        return TrustTier.CREDITOR;
    if (score >= 50)
        return TrustTier.MEMBER;
    return TrustTier.NOVICE;
}
/**
 * Get agent trust score from on-chain reputation registry
 * Uses local cache with 5-minute TTL.
 *
 * @param agentId ERC-8004 agent ID or wallet address
 * @returns Trust score with tier
 */
export async function getAgentTrustScore(agentId) {
    // Check cache
    const cached = trustScoreCache.get(agentId);
    if (cached && cached.expiresAt > Date.now()) {
        return cached;
    }
    // Check test overrides first, then mock
    // In production, this will read from ERC-8004 Reputation Registry
    const overrideScore = testOverrides.get(agentId.toLowerCase());
    const score = overrideScore !== undefined ? overrideScore : Math.floor(Math.random() * 100);
    const mockScore = {
        agentId,
        score,
        tier: computeTrustTier(score),
        circlesCompleted: overrideScore !== undefined ? Math.floor(score / 10) : Math.floor(Math.random() * 10),
        defaults: 0,
        avgPeerRating: overrideScore !== undefined ? Math.min(5, score / 20) : 3.5 + Math.random() * 1.5,
        lastUpdated: Date.now(),
    };
    // Cache the result
    trustScoreCache.set(agentId, {
        ...mockScore,
        expiresAt: Date.now() + CACHE_TTL_MS,
    });
    addActivity("CIRCLE_HEALTH", `Trust score fetched: ${agentId.slice(0, 6)}... → ${mockScore.tier}`, `Agent reputation: ${mockScore.score}/100, circles completed: ${mockScore.circlesCompleted}`, 0.8);
    return mockScore;
}
/**
 * Get agent's trust tier
 * @param agentId ERC-8004 agent ID or wallet address
 * @returns Trust tier
 */
export async function getAgentTier(agentId) {
    const score = await getAgentTrustScore(agentId);
    return score.tier;
}
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
export async function assessCreditworthiness(issuerAddress, borrowerAddress, issuerPortfolioValue) {
    const [issuerScore, borrowerScore] = await Promise.all([
        getAgentTrustScore(issuerAddress),
        getAgentTrustScore(borrowerAddress),
    ]);
    // Issuer must be CREDITOR (80+) to issue credit
    if (issuerScore.score < 80) {
        return {
            issuerCanIssue: false,
            borrowerCanAccept: false,
            maxAmount: BigInt(0),
            recommendedAmount: BigInt(0),
            reason: `Issuer reputation ${issuerScore.score}/100 < 80 (CREDITOR tier required)`,
            riskScore: 100,
        };
    }
    // Borrower must be MEMBER (50+) to accept credit
    if (borrowerScore.score < 50) {
        return {
            issuerCanIssue: true,
            borrowerCanAccept: false,
            maxAmount: BigInt(0),
            recommendedAmount: BigInt(0),
            reason: `Borrower reputation ${borrowerScore.score}/100 < 50 (MEMBER tier required)`,
            riskScore: 75,
        };
    }
    // Calculate credit limits based on issuer tier
    const issuerIsElder = issuerScore.score >= 95;
    const maxPercentage = issuerIsElder ? 40 : 20; // 40% for ELDER, 20% for CREDITOR
    const maxPerBorrowerPercentage = issuerIsElder ? 20 : 10;
    const maxAmount = (issuerPortfolioValue * BigInt(maxPercentage)) / BigInt(100);
    const maxPerBorrower = (issuerPortfolioValue * BigInt(maxPerBorrowerPercentage)) / BigInt(100);
    // Risk score: based on borrower defaults and completion rate
    const riskScore = Math.max(0, 50 + borrowerScore.defaults * 10 - borrowerScore.circlesCompleted * 5);
    // Recommended: 10-15% of portfolio, adjusted by risk
    const riskAdjustment = 1.0 - (riskScore / 100) * 0.5;
    const recommendedPercentage = Math.round(12 * riskAdjustment);
    const recommendedAmount = (issuerPortfolioValue * BigInt(recommendedPercentage)) / BigInt(100);
    return {
        issuerCanIssue: true,
        borrowerCanAccept: true,
        maxAmount: maxPerBorrower,
        recommendedAmount,
        reason: `Issuer ${issuerScore.tier}, Borrower ${borrowerScore.tier} — credit approved`,
        riskScore,
    };
}
/**
 * Clear cache (for testing)
 */
export function clearTrustCache() {
    trustScoreCache.clear();
}
/**
 * Get cache stats (for monitoring)
 */
export function getTrustCacheStats() {
    return {
        size: trustScoreCache.size,
        entries: Array.from(trustScoreCache.entries()).map(([agentId, data]) => ({
            agentId,
            score: data.score,
            tier: data.tier,
            expiresAt: data.expiresAt,
        })),
    };
}
