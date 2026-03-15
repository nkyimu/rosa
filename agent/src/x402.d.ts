/**
 * @file x402.ts
 * @description x402 payment protocol integration for IntentCircles agent
 *
 * Implements HTTP 402 Payment Required middleware for verifying
 * that clients have paid before processing intent requests.
 */
/**
 * x402 Payment Details for HTTP 402 response headers
 */
export interface X402PaymentDetails {
    payTo: string;
    amount: string;
    token: string;
    chainId: number;
    network: string;
}
/**
 * x402 Payment Verification Result
 */
export interface PaymentVerificationResult {
    verified: boolean;
    paidIntentId?: number;
    paidBy?: string;
    amount?: string;
    error?: string;
}
/**
 * x402 Payment Signature (from client)
 * Contains proof that payment was made
 */
export interface PaymentSignature {
    intentId: number;
    paidBy: string;
    transactionHash?: string;
}
/**
 * Get payment details needed for HTTP 402 response
 * These details are sent to the client to indicate what payment is required
 *
 * @example
 * ```typescript
 * const details = getPaymentRequired();
 * // Returns:
 * // {
 * //   payTo: "0x...",
 * //   amount: "10000000000000000",
 * //   token: "0xEF4d55D6dE8e8d73232827Cd1e9b2F2dBb45bC80",
 * //   chainId: 44787,
 * //   network: "celo-sepolia"
 * // }
 * ```
 */
export declare function getPaymentRequired(agentPaymentAddress?: string): Promise<X402PaymentDetails>;
/**
 * Verify that payment has been made for an intent
 *
 * @param intentId The intent ID to verify payment for
 * @param agentPaymentAddress Optional override for AgentPayment contract address
 *
 * @example
 * ```typescript
 * const result = await verifyPayment(123);
 * if (result.verified) {
 *   console.log(`Intent ${result.paidIntentId} has been paid`);
 * } else {
 *   console.log(`Payment required: ${result.error}`);
 * }
 * ```
 */
export declare function verifyPayment(intentId: number, agentPaymentAddress?: string): Promise<PaymentVerificationResult>;
/**
 * Express middleware for x402 payment verification
 * Returns 402 if payment is not found, 200 if verified
 *
 * @param agentPaymentAddress Optional override for AgentPayment contract address
 *
 * @example
 * ```typescript
 * import express from "express";
 * import { x402Middleware } from "./x402";
 *
 * const app = express();
 * app.use(x402Middleware());
 *
 * app.post("/api/intent/match", (req, res) => {
 *   // This endpoint will only be reached if payment is verified
 *   res.json({ success: true });
 * });
 * ```
 */
export declare function x402Middleware(agentPaymentAddress?: string): (req: any, res: any, next: any) => Promise<any>;
/**
 * Build x402 Payment Required response object
 * Suitable for HTTP 402 response bodies
 */
export declare function buildPaymentRequiredResponse(agentPaymentAddress?: string): Promise<{
    status: number;
    body: {
        error: string;
        paymentRequired: X402PaymentDetails;
        description: string;
    };
}>;
/**
 * Check if intent needs payment
 * @param intentId The intent to check
 * @returns true if payment is required (not yet paid)
 */
export declare function paymentRequired(intentId: number, agentPaymentAddress?: string): Promise<boolean>;
/**
 * Get the current fee amount (in cUSD wei)
 */
export declare function getCurrentFee(agentPaymentAddress?: string): Promise<string>;
declare const _default: {
    getPaymentRequired: typeof getPaymentRequired;
    verifyPayment: typeof verifyPayment;
    x402Middleware: typeof x402Middleware;
    buildPaymentRequiredResponse: typeof buildPaymentRequiredResponse;
    paymentRequired: typeof paymentRequired;
    getCurrentFee: typeof getCurrentFee;
};
export default _default;
