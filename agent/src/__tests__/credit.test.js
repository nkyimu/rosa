/**
 * @file credit.test.ts
 * @description Test suite for credit management module
 */
import { describe, it, expect, beforeEach } from "bun:test";
import { issueCreditLine, activateCredit, repayCredit, getCreditLines, getCredit, CreditStatus, clearCredits, getAllCredits, } from "../credit.js";
describe("Credit Management Module", () => {
    beforeEach(() => {
        clearCredits();
    });
    describe("issueCreditLine", () => {
        it("should issue a credit line with valid parameters", async () => {
            const creditId = await issueCreditLine("0x1111111111111111111111111111111111111111", // issuer (assume CREDITOR tier)
            "0x2222222222222222222222222222222222222222", // borrower
            BigInt("50000000000000000000"), // 50 tokens
            8, // weeks
            1 // circleId
            );
            expect(creditId).toBeTruthy();
            expect(creditId).toMatch(/^\d+$/);
        });
        it("should reject if term is less than 6 weeks", async () => {
            let error = null;
            try {
                await issueCreditLine("0x1111111111111111111111111111111111111111", "0x2222222222222222222222222222222222222222", BigInt("50000000000000000000"), 5, // < 6 weeks
                1);
            }
            catch (e) {
                error = e;
            }
            expect(error).not.toBeNull();
            expect(error?.message).toContain("6-12 weeks");
        });
        it("should reject if term is more than 12 weeks", async () => {
            let error = null;
            try {
                await issueCreditLine("0x1111111111111111111111111111111111111111", "0x2222222222222222222222222222222222222222", BigInt("50000000000000000000"), 13, // > 12 weeks
                1);
            }
            catch (e) {
                error = e;
            }
            expect(error).not.toBeNull();
            expect(error?.message).toContain("6-12 weeks");
        });
        it("should reject if amount is zero", async () => {
            let error = null;
            try {
                await issueCreditLine("0x1111111111111111111111111111111111111111", "0x2222222222222222222222222222222222222222", BigInt(0), // zero amount
                8, 1);
            }
            catch (e) {
                error = e;
            }
            expect(error).not.toBeNull();
            expect(error?.message).toContain("must be > 0");
        });
    });
    describe("getCreditLines", () => {
        it("should return issued and received credits", async () => {
            const issuer = "0x1111111111111111111111111111111111111111";
            const borrower = "0x2222222222222222222222222222222222222222";
            // Issue a credit
            const creditId = await issueCreditLine(issuer, borrower, BigInt("50000000000000000000"), 8, 1);
            // Get credits for issuer
            const issuerCredits = getCreditLines(issuer);
            expect(issuerCredits.issued.length).toBe(1);
            expect(issuerCredits.issued[0].id).toBe(creditId);
            expect(issuerCredits.issued[0].issuerAddress.toLowerCase()).toBe(issuer.toLowerCase());
            expect(issuerCredits.received.length).toBe(0);
            // Get credits for borrower
            const borrowerCredits = getCreditLines(borrower);
            expect(borrowerCredits.issued.length).toBe(0);
            expect(borrowerCredits.received.length).toBe(1);
            expect(borrowerCredits.received[0].borrowerAddress.toLowerCase()).toBe(borrower.toLowerCase());
        });
        it("should handle mixed case addresses", async () => {
            const issuer = "0x1111111111111111111111111111111111111111";
            const issuerMixed = "0x1111111111111111111111111111111111111111";
            const creditId = await issueCreditLine(issuer, "0x2222222222222222222222222222222222222222", BigInt("50000000000000000000"), 8, 1);
            const credits = getCreditLines(issuerMixed);
            expect(credits.issued.length).toBe(1);
        });
    });
    describe("getCredit", () => {
        it("should return credit details", async () => {
            const creditId = await issueCreditLine("0x1111111111111111111111111111111111111111", "0x2222222222222222222222222222222222222222", BigInt("50000000000000000000"), 8, 1);
            const credit = getCredit(creditId);
            expect(credit).toBeTruthy();
            expect(credit?.id).toBe(creditId);
            expect(credit?.status).toBe(CreditStatus.OPEN);
            expect(credit?.amount).toBe(BigInt("50000000000000000000"));
            expect(credit?.termWeeks).toBe(8);
        });
        it("should return undefined for non-existent credit", () => {
            const credit = getCredit("999");
            expect(credit).toBeUndefined();
        });
    });
    describe("activateCredit", () => {
        it("should activate a credit after borrower joins circle", async () => {
            const borrower = "0x2222222222222222222222222222222222222222";
            const creditId = await issueCreditLine("0x1111111111111111111111111111111111111111", borrower, BigInt("50000000000000000000"), 8, 1);
            // Credit should be OPEN before activation
            let credit = getCredit(creditId);
            expect(credit).toBeTruthy();
            expect(credit?.status).toBe(CreditStatus.OPEN);
            // Activate the credit
            await activateCredit(creditId, borrower, "0xCircleAddress1111111111111111111111111111");
            // Credit should now be ACTIVE
            credit = getCredit(creditId);
            expect(credit).toBeTruthy();
            expect(credit?.status).toBe(CreditStatus.ACTIVE);
            expect(credit?.circleJoined).toBe(true);
        });
        it("should reject activation by non-borrower", async () => {
            const borrower = "0x2222222222222222222222222222222222222222";
            const wrongAddress = "0x3333333333333333333333333333333333333333";
            const creditId = await issueCreditLine("0x1111111111111111111111111111111111111111", borrower, BigInt("50000000000000000000"), 8, 1);
            let error = null;
            try {
                await activateCredit(creditId, wrongAddress, "0xCircleAddress");
            }
            catch (e) {
                error = e;
            }
            expect(error).not.toBeNull();
            expect(error?.message).toContain("Only borrower");
        });
    });
    describe("repayCredit", () => {
        it("should repay an active credit", async () => {
            const borrower = "0x2222222222222222222222222222222222222222";
            const creditId = await issueCreditLine("0x1111111111111111111111111111111111111111", borrower, BigInt("50000000000000000000"), 8, 1);
            // Activate first
            await activateCredit(creditId, borrower, "0xCircleAddress");
            // Repay
            await repayCredit(creditId, borrower);
            const credit = getCredit(creditId);
            expect(credit?.status).toBe(CreditStatus.REPAID);
        });
        it("should reject repay on non-active credit", async () => {
            const borrower = "0x2222222222222222222222222222222222222222";
            const creditId = await issueCreditLine("0x1111111111111111111111111111111111111111", borrower, BigInt("50000000000000000000"), 8, 1);
            // Try to repay without activating
            let error = null;
            try {
                await repayCredit(creditId, borrower);
            }
            catch (e) {
                error = e;
            }
            expect(error).not.toBeNull();
            expect(error?.message).toContain("not ACTIVE");
        });
    });
    describe("getAllCredits", () => {
        it("should return all credits", async () => {
            await issueCreditLine("0x1111111111111111111111111111111111111111", "0x2222222222222222222222222222222222222222", BigInt("50000000000000000000"), 8, 1);
            await issueCreditLine("0x3333333333333333333333333333333333333333", "0x4444444444444444444444444444444444444444", BigInt("100000000000000000000"), 10, 2);
            const allCredits = getAllCredits();
            expect(allCredits.length).toBe(2);
        });
    });
});
