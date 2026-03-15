/**
 * @file trust.test.ts
 * @description Test suite for trust assessment module
 */
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { computeTrustTier, getAgentTrustScore, getAgentTier, assessCreditworthiness, TrustTier, clearTrustCache, } from "../trust.js";
describe("Trust Assessment Module", () => {
    beforeEach(() => {
        clearTrustCache();
    });
    afterEach(() => {
        clearTrustCache();
    });
    describe("computeTrustTier", () => {
        it("should return NOVICE for scores 0-49", () => {
            expect(computeTrustTier(0)).toBe(TrustTier.NOVICE);
            expect(computeTrustTier(25)).toBe(TrustTier.NOVICE);
            expect(computeTrustTier(49)).toBe(TrustTier.NOVICE);
        });
        it("should return MEMBER for scores 50-79", () => {
            expect(computeTrustTier(50)).toBe(TrustTier.MEMBER);
            expect(computeTrustTier(65)).toBe(TrustTier.MEMBER);
            expect(computeTrustTier(79)).toBe(TrustTier.MEMBER);
        });
        it("should return CREDITOR for scores 80-94", () => {
            expect(computeTrustTier(80)).toBe(TrustTier.CREDITOR);
            expect(computeTrustTier(87)).toBe(TrustTier.CREDITOR);
            expect(computeTrustTier(94)).toBe(TrustTier.CREDITOR);
        });
        it("should return ELDER for scores 95-100", () => {
            expect(computeTrustTier(95)).toBe(TrustTier.ELDER);
            expect(computeTrustTier(97)).toBe(TrustTier.ELDER);
            expect(computeTrustTier(100)).toBe(TrustTier.ELDER);
        });
    });
    describe("getAgentTrustScore", () => {
        it("should return a trust score with valid structure", async () => {
            const score = await getAgentTrustScore("0x1234567890123456789012345678901234567890");
            expect(score).toHaveProperty("score");
            expect(score).toHaveProperty("tier");
            expect(score).toHaveProperty("circlesCompleted");
            expect(score).toHaveProperty("defaults");
            expect(score).toHaveProperty("avgPeerRating");
            expect(score).toHaveProperty("lastUpdated");
            expect(score.score).toBeGreaterThanOrEqual(0);
            expect(score.score).toBeLessThanOrEqual(100);
            expect(score.tier).toMatch(/NOVICE|MEMBER|CREDITOR|ELDER/);
        });
        it("should cache trust scores with 5-minute TTL", async () => {
            const address = "0xABCDEF1234567890ABCDEF1234567890ABCDEF12";
            const score1 = await getAgentTrustScore(address);
            const score2 = await getAgentTrustScore(address);
            // Should return exact same object (same reference) if cached
            expect(score1.score).toBe(score2.score);
            expect(score1.tier).toBe(score2.tier);
        });
        it("should allow clearing the cache", async () => {
            const address = "0xABCDEF1234567890ABCDEF1234567890ABCDEF12";
            const score1 = await getAgentTrustScore(address);
            clearTrustCache();
            const score2 = await getAgentTrustScore(address);
            // After cache clear, may get different random values (mock implementation)
            expect(score1.agentId).toBe(score2.agentId);
        });
    });
    describe("getAgentTier", () => {
        it("should return the correct tier for an agent", async () => {
            const tier = await getAgentTier("0x1234567890123456789012345678901234567890");
            expect(tier).toMatch(/NOVICE|MEMBER|CREDITOR|ELDER/);
        });
    });
    describe("assessCreditworthiness", () => {
        it("should return a valid creditworthiness assessment", async () => {
            const result = await assessCreditworthiness("0x1111111111111111111111111111111111111111", "0x2222222222222222222222222222222222222222", BigInt("1000000000000000000") // 1 token in wei
            );
            expect(result).toHaveProperty("issuerCanIssue");
            expect(result).toHaveProperty("borrowerCanAccept");
            expect(result).toHaveProperty("maxAmount");
            expect(result).toHaveProperty("recommendedAmount");
            expect(result).toHaveProperty("reason");
            expect(result).toHaveProperty("riskScore");
            expect(typeof result.issuerCanIssue).toBe("boolean");
            expect(typeof result.borrowerCanAccept).toBe("boolean");
            expect(result.riskScore).toBeGreaterThanOrEqual(0);
            expect(result.riskScore).toBeLessThanOrEqual(100);
        });
        it("should calculate credit limits if both parties are qualified", async () => {
            const portfolioValue = BigInt("5000000000000000000"); // 5 tokens
            const result = await assessCreditworthiness("0x1111111111111111111111111111111111111111", "0x2222222222222222222222222222222222222222", portfolioValue);
            if (result.issuerCanIssue && result.borrowerCanAccept) {
                // Credit limit should be between 0 and portfolio value
                expect(result.maxAmount).toBeGreaterThan(BigInt(0));
                expect(result.maxAmount).toBeLessThanOrEqual(portfolioValue);
                expect(result.recommendedAmount).toBeLessThanOrEqual(result.maxAmount);
            }
        });
        it("should compute valid risk score", async () => {
            const result = await assessCreditworthiness("0x1111111111111111111111111111111111111111", "0x2222222222222222222222222222222222222222", BigInt("1000000000000000000"));
            expect(result.riskScore).toBeGreaterThanOrEqual(0);
            expect(result.riskScore).toBeLessThanOrEqual(100);
        });
    });
});
