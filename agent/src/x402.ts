/**
 * @file x402.ts
 * @description x402 payment protocol integration for IntentCircles agent
 *
 * Implements HTTP 402 Payment Required middleware for verifying
 * that clients have paid before processing intent requests.
 */

import { createPublicClient, http, ReadContractParameters } from "viem";
import { celoSepolia, celo } from "viem/chains";
import { CONTRACT_ADDRESSES, CELO_SEPOLIA_RPC, CELO_MAINNET_RPC } from "./config";

// ────────────────────────────────────────────────────────────────────────────
// Types & Interfaces
// ────────────────────────────────────────────────────────────────────────────

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

// ────────────────────────────────────────────────────────────────────────────
// Contract ABI (AgentPayment)
// ────────────────────────────────────────────────────────────────────────────

const AGENT_PAYMENT_ABI = [
  {
    name: "paymentDetails",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "payTo", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "token", type: "address" },
      { name: "chainIdValue", type: "uint256" },
      { name: "network", type: "string" },
    ],
  },
  {
    name: "hasPaid",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "intentId", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "getFee",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "intentPayments",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "", type: "uint256" },
      { name: "", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

// ────────────────────────────────────────────────────────────────────────────
// RPC Client Setup
// ────────────────────────────────────────────────────────────────────────────

/**
 * Get the appropriate RPC client for the network
 */
function getClient(chainId?: number) {
  const isMainnet = chainId === 42220;
  const rpcUrl = isMainnet ? CELO_MAINNET_RPC : CELO_SEPOLIA_RPC;
  const chain = isMainnet ? celo : celoSepolia;

  return createPublicClient({
    chain,
    transport: http(rpcUrl),
  });
}

// ────────────────────────────────────────────────────────────────────────────
// x402 Payment Details
// ────────────────────────────────────────────────────────────────────────────

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
export async function getPaymentRequired(
  agentPaymentAddress?: string
): Promise<X402PaymentDetails> {
  const contractAddress =
    agentPaymentAddress || CONTRACT_ADDRESSES.agentPayment;

  if (!contractAddress || contractAddress === "0x0000000000000000000000000000000000000000") {
    throw new Error("AgentPayment contract not deployed");
  }

  const client = getClient();

  try {
    const result = await client.readContract({
      address: contractAddress as `0x${string}`,
      abi: AGENT_PAYMENT_ABI,
      functionName: "paymentDetails",
    } as ReadContractParameters);

    if (!result || !Array.isArray(result) || result.length < 5) {
      throw new Error("Invalid paymentDetails response");
    }

    return {
      payTo: result[0] as string,
      amount: result[1].toString(),
      token: result[2] as string,
      chainId: Number(result[3]),
      network: result[4] as string,
    };
  } catch (error) {
    console.error("[x402] Error fetching payment details:", error);
    throw new Error(`Failed to get payment details: ${error}`);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// x402 Payment Verification
// ────────────────────────────────────────────────────────────────────────────

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
export async function verifyPayment(
  intentId: number,
  agentPaymentAddress?: string
): Promise<PaymentVerificationResult> {
  try {
    const contractAddress =
      agentPaymentAddress || CONTRACT_ADDRESSES.agentPayment;

    if (!contractAddress || contractAddress === "0x0000000000000000000000000000000000000000") {
      return {
        verified: false,
        error: "AgentPayment contract not deployed",
      };
    }

    const client = getClient();

    // Check if the intent has been paid
    const hasPaid = await client.readContract({
      address: contractAddress as `0x${string}`,
      abi: AGENT_PAYMENT_ABI,
      functionName: "hasPaid",
      args: [BigInt(intentId)],
    } as ReadContractParameters);

    if (hasPaid) {
      return {
        verified: true,
        paidIntentId: intentId,
      };
    }

    return {
      verified: false,
      paidIntentId: intentId,
      error: "Intent payment not found",
    };
  } catch (error) {
    console.error("[x402] Error verifying payment:", error);
    return {
      verified: false,
      error: `Payment verification failed: ${error}`,
    };
  }
}

// ────────────────────────────────────────────────────────────────────────────
// x402 Middleware (Express/HTTP server integration)
// ────────────────────────────────────────────────────────────────────────────

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
export function x402Middleware(agentPaymentAddress?: string) {
  return async (req: any, res: any, next: any) => {
    try {
      // Extract intent ID from request
      // Supports: URL params (/intent/:id), query params (?intentId=123), or body
      const intentId =
        req.params.id ||
        req.query.intentId ||
        req.body?.intentId;

      if (!intentId) {
        // No intent ID provided, skip payment check
        return next();
      }

      // Check for payment signature in headers
      const paymentSignature = req.headers["x-payment-signature"];
      const paymentProof = req.headers["x-payment-proof"];

      // If no payment proof is provided, return 402
      if (!paymentProof && !paymentSignature) {
        const paymentDetails = await getPaymentRequired(agentPaymentAddress);

        return res.status(402).json({
          error: "Payment Required",
          details: paymentDetails,
        });
      }

      // Verify the payment
      const verification = await verifyPayment(
        parseInt(intentId, 10),
        agentPaymentAddress
      );

      if (!verification.verified) {
        const paymentDetails = await getPaymentRequired(agentPaymentAddress);

        return res.status(402).json({
          error: "Payment Required",
          details: paymentDetails,
          reason: verification.error,
        });
      }

      // Payment verified, attach to request and continue
      req.paymentVerified = true;
      req.intentId = intentId;

      next();
    } catch (error) {
      console.error("[x402] Middleware error:", error);

      // On error, return 402 to be safe
      return res.status(402).json({
        error: "Payment verification failed",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Utilities
// ────────────────────────────────────────────────────────────────────────────

/**
 * Build x402 Payment Required response object
 * Suitable for HTTP 402 response bodies
 */
export async function buildPaymentRequiredResponse(
  agentPaymentAddress?: string
): Promise<{
  status: number;
  body: {
    error: string;
    paymentRequired: X402PaymentDetails;
    description: string;
  };
}> {
  const details = await getPaymentRequired(agentPaymentAddress);

  return {
    status: 402,
    body: {
      error: "Payment Required",
      paymentRequired: details,
      description: "This endpoint requires payment. Send cUSD to the payTo address to proceed.",
    },
  };
}

/**
 * Check if intent needs payment
 * @param intentId The intent to check
 * @returns true if payment is required (not yet paid)
 */
export async function paymentRequired(
  intentId: number,
  agentPaymentAddress?: string
): Promise<boolean> {
  const result = await verifyPayment(intentId, agentPaymentAddress);
  return !result.verified;
}

// ────────────────────────────────────────────────────────────────────────────
// Configuration Helpers
// ────────────────────────────────────────────────────────────────────────────

/**
 * Get the current fee amount (in cUSD wei)
 */
export async function getCurrentFee(
  agentPaymentAddress?: string
): Promise<string> {
  const contractAddress =
    agentPaymentAddress || CONTRACT_ADDRESSES.agentPayment;

  if (!contractAddress || contractAddress === "0x0000000000000000000000000000000000000000") {
    throw new Error("AgentPayment contract not deployed");
  }

  const client = getClient();

  try {
    const fee = (await client.readContract({
      address: contractAddress as `0x${string}`,
      abi: AGENT_PAYMENT_ABI,
      functionName: "getFee",
    } as ReadContractParameters)) as bigint;

    return fee.toString();
  } catch (error) {
    console.error("[x402] Error fetching fee:", error);
    throw new Error(`Failed to get fee: ${error}`);
  }
}

export default {
  getPaymentRequired,
  verifyPayment,
  x402Middleware,
  buildPaymentRequiredResponse,
  paymentRequired,
  getCurrentFee,
};
