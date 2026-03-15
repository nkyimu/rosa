/**
 * @file credit.ts
 * @description Credit management module for agent-to-agent micro-credit issuance
 *
 * Enables CREDITOR+ agents to issue micro-credit to lower-tier agents.
 * Credits require borrower to join a specified circle to activate.
 * Handles credit lifecycle: issue, activate, repay, default.
 *
 * Mock implementation — contracts being built in parallel.
 */
import { addActivity } from "./activity.js";
import { assessCreditworthiness, getAgentTier, TrustTier } from "./trust.js";
/**
 * Credit line status enum (matches smart contracts)
 */
export var CreditStatus;
(function (CreditStatus) {
    CreditStatus["OPEN"] = "OPEN";
    CreditStatus["ACTIVE"] = "ACTIVE";
    CreditStatus["REPAID"] = "REPAID";
    CreditStatus["DEFAULT"] = "DEFAULT";
})(CreditStatus || (CreditStatus = {}));
/**
 * In-memory credit line storage (mock)
 */
const creditLines = new Map();
let creditCounter = 0;
/**
 * Issue a credit line from issuer to borrower
 *
 * Requirements:
 * - Issuer must be CREDITOR tier (80+)
 * - Borrower must be MEMBER tier (50+)
 * - Amount must be within issuer's credit limit
 * - Term must be 6-12 weeks
 *
 * @param issuerAddress Issuer's wallet address
 * @param borrowerAddress Borrower's wallet address
 * @param amount Credit amount in wei
 * @param termWeeks Duration in weeks (6-12)
 * @param circleIdRequired Circle ID borrower must join to activate
 * @returns Credit line ID
 */
export async function issueCreditLine(issuerAddress, borrowerAddress, amount, termWeeks, circleIdRequired) {
    // Validate term
    if (termWeeks < 6 || termWeeks > 12) {
        throw new Error("Credit term must be 6-12 weeks");
    }
    if (amount <= BigInt(0)) {
        throw new Error("Credit amount must be > 0");
    }
    // Check issuer can issue credit
    const issuerTier = await getAgentTier(issuerAddress);
    if (issuerTier === TrustTier.NOVICE || issuerTier === TrustTier.MEMBER) {
        throw new Error(`Issuer tier ${issuerTier} cannot issue credit (CREDITOR+ required)`);
    }
    // Assess creditworthiness
    const assessment = await assessCreditworthiness(issuerAddress, borrowerAddress, amount * BigInt(5) // Mock: assume issuer has 5x the credit amount in portfolio
    );
    if (!assessment.issuerCanIssue || !assessment.borrowerCanAccept) {
        throw new Error(assessment.reason);
    }
    if (amount > assessment.maxAmount) {
        throw new Error(`Amount ${amount} exceeds max ${assessment.maxAmount} (${assessment.reason})`);
    }
    // Create credit line
    const creditId = String(++creditCounter);
    const creditLine = {
        id: creditId,
        issuerAddress,
        borrowerAddress,
        amount,
        termWeeks,
        issuedAt: Math.floor(Date.now() / 1000),
        status: CreditStatus.OPEN,
        circleIdRequired,
        circleJoined: false,
    };
    creditLines.set(creditId, creditLine);
    addActivity("CIRCLE_HEALTH", `Credit issued: ${issuerAddress.slice(0, 6)}... → ${borrowerAddress.slice(0, 6)}...`, `${amount / BigInt("1000000000000000000")} cUSD, ${termWeeks} weeks, required circle ${circleIdRequired}`, 0.9);
    return creditId;
}
/**
 * Activate a credit line (borrower joins required circle)
 *
 * Transfers funds to borrower after they confirm circle membership.
 *
 * @param creditId Credit line ID
 * @param borrowerAddress Borrower wallet
 * @param circleAddress Circle contract address to verify membership
 */
export async function activateCredit(creditId, borrowerAddress, circleAddress) {
    const credit = creditLines.get(creditId);
    if (!credit) {
        throw new Error(`Credit ${creditId} not found`);
    }
    if (credit.status !== CreditStatus.OPEN) {
        throw new Error(`Credit ${creditId} status is ${credit.status}, not OPEN`);
    }
    if (credit.borrowerAddress.toLowerCase() !== borrowerAddress.toLowerCase()) {
        throw new Error(`Only borrower can activate credit`);
    }
    // In production, verify circle membership on-chain
    // For mock, assume membership is verified
    credit.status = CreditStatus.ACTIVE;
    credit.circleJoined = true;
    addActivity("EXECUTE", `Credit activated: ${creditId}`, `Borrower ${borrowerAddress.slice(0, 6)}... joined circle and received ${credit.amount / BigInt("1000000000000000000")} cUSD`, 0.9);
}
/**
 * Repay a credit line (borrower repays full amount)
 *
 * @param creditId Credit line ID
 * @param repayerAddress Repayer wallet (should be borrower)
 */
export async function repayCredit(creditId, repayerAddress) {
    const credit = creditLines.get(creditId);
    if (!credit) {
        throw new Error(`Credit ${creditId} not found`);
    }
    if (credit.status !== CreditStatus.ACTIVE) {
        throw new Error(`Credit ${creditId} status is ${credit.status}, not ACTIVE`);
    }
    if (credit.borrowerAddress.toLowerCase() !== repayerAddress.toLowerCase()) {
        throw new Error(`Only borrower can repay credit`);
    }
    // Check term has not expired
    const termExpiry = credit.issuedAt + credit.termWeeks * 7 * 24 * 60 * 60;
    if (Math.floor(Date.now() / 1000) > termExpiry) {
        throw new Error(`Credit term expired (issued ${new Date(credit.issuedAt * 1000).toISOString()})`);
    }
    credit.status = CreditStatus.REPAID;
    addActivity("EXECUTE", `Credit repaid: ${creditId}`, `Borrower ${repayerAddress.slice(0, 6)}... repaid ${credit.amount / BigInt("1000000000000000000")} cUSD`, 0.95);
}
/**
 * Get all credit lines for an address (both issued and received)
 *
 * @param address Wallet address
 * @returns Credit lines where address is issuer or borrower
 */
export function getCreditLines(address) {
    const issued = [];
    const received = [];
    for (const [_, credit] of creditLines) {
        if (credit.issuerAddress.toLowerCase() === address.toLowerCase()) {
            issued.push(credit);
        }
        if (credit.borrowerAddress.toLowerCase() === address.toLowerCase()) {
            received.push(credit);
        }
    }
    return { issued, received };
}
/**
 * Get a specific credit line
 *
 * @param creditId Credit line ID
 * @returns Credit line or undefined
 */
export function getCredit(creditId) {
    return creditLines.get(creditId);
}
/**
 * Check for overdue/defaulted credit lines (keeper function)
 * Called periodically by keeper loop
 *
 * @returns Array of newly defaulted credit IDs
 */
export async function checkCreditHealth() {
    const defaulted = [];
    const now = Math.floor(Date.now() / 1000);
    const graceWeeks = 1;
    for (const [creditId, credit] of creditLines) {
        if (credit.status !== CreditStatus.ACTIVE)
            continue;
        const termExpiry = credit.issuedAt + credit.termWeeks * 7 * 24 * 60 * 60;
        const gracePeriodEnd = termExpiry + graceWeeks * 7 * 24 * 60 * 60;
        if (now > gracePeriodEnd) {
            // Credit is in default
            credit.status = CreditStatus.DEFAULT;
            defaulted.push(creditId);
            addActivity("CIRCLE_HEALTH", `Credit defaulted: ${creditId}`, `Issuer ${credit.issuerAddress.slice(0, 6)}..., borrower ${credit.borrowerAddress.slice(0, 6)}...`, 0.95);
        }
    }
    return defaulted;
}
/**
 * Handle credit default (trigger reputation damage)
 * Called by keeper after marking credit as DEFAULT
 *
 * @param creditId Credit line ID
 */
export async function handleDefault(creditId) {
    const credit = creditLines.get(creditId);
    if (!credit) {
        throw new Error(`Credit ${creditId} not found`);
    }
    if (credit.status !== CreditStatus.DEFAULT) {
        throw new Error(`Credit ${creditId} status is ${credit.status}, not DEFAULT`);
    }
    // In production, trigger reputation damage on-chain:
    // - Borrower: -50 points (default)
    // - Issuer: -10 points (failed credit assessment)
    // For now, just log the activity
    addActivity("CIRCLE_HEALTH", `Default handled: ${creditId}`, `Reputation penalty triggered for issuer and borrower`, 0.9);
}
/**
 * Get all credits (for monitoring)
 */
export function getAllCredits() {
    return Array.from(creditLines.values());
}
/**
 * Clear all credits (for testing)
 */
export function clearCredits() {
    creditLines.clear();
    creditCounter = 0;
}
