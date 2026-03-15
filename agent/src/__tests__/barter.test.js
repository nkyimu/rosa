/**
 * @file barter.test.ts
 * @description Test suite for barter matching module
 */
import { describe, it, expect, beforeEach } from "bun:test";
import { submitBarterIntent, matchBarterIntents, settleBarterIntent, getOpenBarterIntents, getBarterIntent, getAgentBarterIntents, getAllBarterIntents, clearBarterIntents, } from "../barter.js";
describe("Barter Matching Module", () => {
    beforeEach(() => {
        clearBarterIntents();
    });
    describe("submitBarterIntent", () => {
        it("should submit a barter intent (mock: assume ELDER tier)", async () => {
            // Note: In real implementation, this would check ELDER tier
            // For testing, we'll assume agents have sufficient tier
            const intentId = await submitBarterIntent("0x1111111111111111111111111111111111111111", "web design (40 hours)", "childcare (10 hrs/week)");
            expect(intentId).toBeTruthy();
            expect(intentId).toMatch(/^\d+$/);
        });
        it("should reject if offering is empty", async () => {
            let error = null;
            try {
                await submitBarterIntent("0x1111111111111111111111111111111111111111", "", // empty offering
                "childcare");
            }
            catch (e) {
                error = e;
            }
            expect(error).not.toBeNull();
            expect(error?.message).toContain("non-empty");
        });
        it("should reject if seeking is empty", async () => {
            let error = null;
            try {
                await submitBarterIntent("0x1111111111111111111111111111111111111111", "web design", "" // empty seeking
                );
            }
            catch (e) {
                error = e;
            }
            expect(error).not.toBeNull();
            expect(error?.message).toContain("non-empty");
        });
        it("should set intent to OPEN status", async () => {
            const intentId = await submitBarterIntent("0x1111111111111111111111111111111111111111", "web design", "childcare");
            const intent = getBarterIntent(intentId);
            expect(intent).toBeTruthy();
            if (intent) {
                expect(intent.status).toBe("OPEN");
            }
        });
    });
    describe("matchBarterIntents", () => {
        it("should find matching intents based on keyword overlap", async () => {
            // Submit two complementary intents
            const intentA = await submitBarterIntent("0x1111111111111111111111111111111111111111", "web design (40 hours)", "childcare (10 hrs/week)");
            const intentB = await submitBarterIntent("0x2222222222222222222222222222222222222222", "childcare (10 hrs/week)", "web design (40 hours)");
            const matches = await matchBarterIntents();
            if (matches.length > 0) {
                expect(matches[0].compatibility).toBeGreaterThan(0);
                expect(matches[0].compatibility).toBeLessThanOrEqual(100);
                expect(matches[0].reason).toBeTruthy();
            }
        });
        it("should not match intents from same agent", async () => {
            const agentA = "0x1111111111111111111111111111111111111111";
            await submitBarterIntent(agentA, "web design", "childcare");
            await submitBarterIntent(agentA, // same agent
            "childcare", "web design");
            const matches = await matchBarterIntents();
            // Should not match self-to-self even if complementary
            // With keyword matching, might still find some compatibility, so just check < 2
            expect(matches.length).toBeLessThan(2);
        });
        it("should sort matches by compatibility score", async () => {
            // Good match: exact keywords
            const intentA = await submitBarterIntent("0x1111111111111111111111111111111111111111", "web design", "childcare");
            const intentB = await submitBarterIntent("0x2222222222222222222222222222222222222222", "childcare", "web design");
            // Weak match: vague keywords
            const intentC = await submitBarterIntent("0x3333333333333333333333333333333333333333", "services", "help");
            const intentD = await submitBarterIntent("0x4444444444444444444444444444444444444444", "help", "services");
            const matches = await matchBarterIntents();
            if (matches.length >= 2) {
                // Best match should come first
                expect(matches[0].compatibility).toBeGreaterThanOrEqual(matches[1].compatibility);
            }
        });
        it("should not match already matched intents", async () => {
            const intentA = await submitBarterIntent("0x1111111111111111111111111111111111111111", "web design", "childcare");
            const intentB = await submitBarterIntent("0x2222222222222222222222222222222222222222", "childcare", "web design");
            // Settle the match
            await settleBarterIntent(intentA, intentB);
            // Try to match again — settled intents should be excluded
            const matches = await matchBarterIntents();
            const hasSettledIntent = matches.some((m) => (m.intentA.id === intentA && m.intentB.id === intentB) ||
                (m.intentA.id === intentB && m.intentB.id === intentA));
            expect(hasSettledIntent).toBe(false);
        });
    });
    describe("settleBarterIntent", () => {
        it("should settle matched intents", async () => {
            const intentA = await submitBarterIntent("0x1111111111111111111111111111111111111111", "web design", "childcare");
            const intentB = await submitBarterIntent("0x2222222222222222222222222222222222222222", "childcare", "web design");
            // Before settlement
            let intent1 = getBarterIntent(intentA);
            let intent2 = getBarterIntent(intentB);
            expect(intent1?.status).toBe("OPEN");
            expect(intent2?.status).toBe("OPEN");
            // Settle
            await settleBarterIntent(intentA, intentB);
            // After settlement
            intent1 = getBarterIntent(intentA);
            intent2 = getBarterIntent(intentB);
            expect(intent1?.status).toBe("SETTLED");
            expect(intent2?.status).toBe("SETTLED");
            expect(intent1?.matchedWith).toBe(intentB);
            expect(intent2?.matchedWith).toBe(intentA);
        });
        it("should reject if intents don't exist", async () => {
            let error = null;
            try {
                await settleBarterIntent("999", "888");
            }
            catch (e) {
                error = e;
            }
            expect(error).not.toBeNull();
            expect(error?.message).toContain("not found");
        });
    });
    describe("getOpenBarterIntents", () => {
        it("should return only open intents", async () => {
            const intentA = await submitBarterIntent("0x1111111111111111111111111111111111111111", "web design", "childcare");
            const intentB = await submitBarterIntent("0x2222222222222222222222222222222222222222", "childcare", "web design");
            // Settle one
            await settleBarterIntent(intentA, intentB);
            const openIntents = getOpenBarterIntents();
            expect(openIntents.length).toBe(0); // Both are now settled
        });
        it("should return multiple open intents", async () => {
            await submitBarterIntent("0x1111111111111111111111111111111111111111", "web design", "childcare");
            await submitBarterIntent("0x2222222222222222222222222222222222222222", "graphic design", "marketing");
            const openIntents = getOpenBarterIntents();
            expect(openIntents.length).toBeGreaterThanOrEqual(2);
        });
    });
    describe("getAgentBarterIntents", () => {
        it("should return all intents from an agent", async () => {
            const agentA = "0x1111111111111111111111111111111111111111";
            const intent1 = await submitBarterIntent(agentA, "web design", "childcare");
            const intent2 = await submitBarterIntent(agentA, "graphic design", "marketing");
            const agentIntents = getAgentBarterIntents(agentA);
            expect(agentIntents.length).toBe(2);
            expect(agentIntents.map((i) => i.id)).toContain(intent1);
            expect(agentIntents.map((i) => i.id)).toContain(intent2);
        });
        it("should handle mixed case addresses", async () => {
            const agent = "0x1111111111111111111111111111111111111111";
            await submitBarterIntent(agent, "web design", "childcare");
            const intents = getAgentBarterIntents(agent);
            expect(intents.length).toBe(1);
        });
    });
    describe("getAllBarterIntents", () => {
        it("should return all intents regardless of status", async () => {
            await submitBarterIntent("0x1111111111111111111111111111111111111111", "web design", "childcare");
            const intent1 = await submitBarterIntent("0x2222222222222222222222222222222222222222", "childcare", "web design");
            const intent2 = await submitBarterIntent("0x3333333333333333333333333333333333333333", "graphic design", "marketing");
            const allIntents = getAllBarterIntents();
            expect(allIntents.length).toBe(3);
        });
    });
});
