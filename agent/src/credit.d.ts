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
/**
 * Credit line status enum (matches smart contracts)
 */
export declare enum CreditStatus {
    OPEN = "OPEN",// Issued, awaiting activation
    ACTIVE = "ACTIVE",// Activated, funds transferred
    REPAID = "REPAID",// Fully repaid
    DEFAULT = "DEFAULT"
}
/**
 * Credit line record
 */
export interface CreditLine {
    id: string;
    issuerAddress: string;
    borrowerAddress: string;
    amount: bigint;
    termWeeks: number;
    issuedAt: number;
    status: CreditStatus;
    circleIdRequired: number;
    circleJoined: boolean;
}
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
export declare function issueCreditLine(issuerAddress: string, borrowerAddress: string, amount: bigint, termWeeks: number, circleIdRequired: number): Promise<string>;
/**
 * Activate a credit line (borrower joins required circle)
 *
 * Transfers funds to borrower after they confirm circle membership.
 *
 * @param creditId Credit line ID
 * @param borrowerAddress Borrower wallet
 * @param circleAddress Circle contract address to verify membership
 */
export declare function activateCredit(creditId: string, borrowerAddress: string, circleAddress: `0x${string}`): Promise<void>;
/**
 * Repay a credit line (borrower repays full amount)
 *
 * @param creditId Credit line ID
 * @param repayerAddress Repayer wallet (should be borrower)
 */
export declare function repayCredit(creditId: string, repayerAddress: string): Promise<void>;
/**
 * Get all credit lines for an address (both issued and received)
 *
 * @param address Wallet address
 * @returns Credit lines where address is issuer or borrower
 */
export declare function getCreditLines(address: string): {
    issued: CreditLine[];
    received: CreditLine[];
};
/**
 * Get a specific credit line
 *
 * @param creditId Credit line ID
 * @returns Credit line or undefined
 */
export declare function getCredit(creditId: string): CreditLine | undefined;
/**
 * Check for overdue/defaulted credit lines (keeper function)
 * Called periodically by keeper loop
 *
 * @returns Array of newly defaulted credit IDs
 */
export declare function checkCreditHealth(): Promise<string[]>;
/**
 * Handle credit default (trigger reputation damage)
 * Called by keeper after marking credit as DEFAULT
 *
 * @param creditId Credit line ID
 */
export declare function handleDefault(creditId: string): Promise<void>;
/**
 * Get all credits (for monitoring)
 */
export declare function getAllCredits(): CreditLine[];
/**
 * Clear all credits (for testing)
 */
export declare function clearCredits(): void;
