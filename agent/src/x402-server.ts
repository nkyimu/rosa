/**
 * @file x402-server.ts
 * @description x402 Payment Required server using Hono
 *
 * Implements HTTP 402 Payment Required protocol for agent fee collection.
 * Uses Hono for lightweight HTTP server with x402 middleware.
 *
 * Protocol Flow:
 * 1. Client calls GET /api/match-intent?intentId=123
 * 2. Server returns 402 with payment details (payTo, amount, token, chainId)
 * 3. Client signs payment via thirdweb SDK
 * 4. Client retries with X-PAYMENT header
 * 5. Server verifies payment on-chain
 * 6. Server returns intent matching result
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { verifyPayment, getPaymentRequired, getCurrentFee } from "./x402.js";
import { IntentMatcher } from "./matcher.js";
import { CONTRACT_ADDRESSES } from "./config.js";
import { handleChat } from "./chat.js";
import { getActivities } from "./activity.js";

// ──────────────────────────────────────────────────────────────────────────
// Type Definitions
// ──────────────────────────────────────────────────────────────────────────

interface X402Context {
  paymentVerified: boolean;
  intentId?: number;
  paidBy?: string;
}

interface MatchIntentRequest {
  intentId: number;
  priority?: boolean; // true if payment was made
}

interface MatchIntentResponse {
  success: boolean;
  intentId: number;
  matchResults?: any;
  priority?: boolean;
  error?: string;
}

// ──────────────────────────────────────────────────────────────────────────
// Server Setup
// ──────────────────────────────────────────────────────────────────────────

const app = new Hono();

// Enable CORS for frontend
app.use("*", cors({ origin: "*" }));
const matcher = new IntentMatcher();

/**
 * x402 Payment Verification Middleware
 * Extracts intent ID from query/body and verifies payment status
 */
app.use("*", async (c: any, next) => {
  // Extract intent ID from query params, body, or URL params
  const intentId = c.req.query("intentId") || c.req.param("intentId");

  if (intentId) {
    // Parse intent ID
    const id = parseInt(intentId as string, 10);

    if (!isNaN(id)) {
      // Verify payment for this intent
      const verification = await verifyPayment(id, CONTRACT_ADDRESSES.agentPayment);

      if (verification.verified) {
        // Payment verified — attach to context and proceed
        c.set("paymentVerified", true);
        c.set("intentId", id);
        c.set("paidBy", verification.paidBy);
      } else {
        // Payment not verified — return 402 on protected endpoints
        c.set("paymentVerified", false);
        c.set("intentId", id);
      }
    }
  }

  await next();
});

// ──────────────────────────────────────────────────────────────────────────
// Health Check
// ──────────────────────────────────────────────────────────────────────────

app.get("/", (c) => {
  return c.json({
    status: "ok",
    service: "IntentCircles x402 Agent",
    version: "0.1.0",
    endpoints: {
      health: "GET /",
      payment_details: "GET /api/payment-details",
      match_intent: "GET /api/match-intent?intentId=<id>",
      current_fee: "GET /api/current-fee",
    },
  });
});

// ──────────────────────────────────────────────────────────────────────────
// Payment Details Endpoint
// ──────────────────────────────────────────────────────────────────────────

/**
 * GET /api/payment-details
 * Returns current payment requirements for x402
 *
 * @example
 * curl http://localhost:3002/api/payment-details
 * {
 *   "payTo": "0x...",
 *   "amount": "10000000000000000",
 *   "token": "0xEF4d55D6dE8e8d73232827Cd1e9b2F2dBb45bC80",
 *   "chainId": 44787,
 *   "network": "celo-sepolia"
 * }
 */
app.get("/api/payment-details", async (c) => {
  try {
    const details = await getPaymentRequired(CONTRACT_ADDRESSES.agentPayment);

    return c.json({
      success: true,
      paymentRequired: details,
    });
  } catch (error) {
    console.error("[x402-server] Error fetching payment details:", error);

    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get payment details",
      },
      { status: 500 }
    );
  }
});

// ──────────────────────────────────────────────────────────────────────────
// Current Fee Endpoint
// ──────────────────────────────────────────────────────────────────────────

/**
 * GET /api/current-fee
 * Returns the current agent fee amount
 *
 * @example
 * curl http://localhost:3002/api/current-fee
 * { "fee": "10000000000000000", "currency": "cUSD" }
 */
app.get("/api/current-fee", async (c) => {
  try {
    const fee = await getCurrentFee(CONTRACT_ADDRESSES.agentPayment);

    return c.json({
      success: true,
      fee,
      currency: "cUSD",
      network: "celo-sepolia",
    });
  } catch (error) {
    console.error("[x402-server] Error fetching fee:", error);

    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get fee",
      },
      { status: 500 }
    );
  }
});

// ──────────────────────────────────────────────────────────────────────────
// Chat Endpoint (Conversational Intent Parser)
// ──────────────────────────────────────────────────────────────────────────

/**
 * POST /api/chat
 * Parses natural language into structured intents
 *
 * Request body: { "message": "I want to save 50 cUSD monthly for 6 months" }
 * Response:
 * {
 *   "reply": "I'll set up a savings circle for you...",
 *   "parsed": { "type": "JOIN_CIRCLE", "amount": "50000000000000000000", "duration": 6 },
 *   "reasoning": ["Parsed savings goal...", "Total payout..."],
 *   "confidence": 0.92,
 *   "suggestedAction": "submitIntent"
 * }
 *
 * @example
 * curl -X POST http://localhost:3002/api/chat \
 *   -H "Content-Type: application/json" \
 *   -d '{"message":"I want to save 50 cUSD per month for 6 months"}'
 */
app.post("/api/chat", async (c: any) => {
  try {
    const body = await c.req.json() as { message: string };

    if (!body.message) {
      return c.json(
        {
          error: "Missing message field",
        },
        { status: 400 }
      );
    }

    const response = handleChat(body.message);

    return c.json({
      success: true,
      ...response,
    });
  } catch (error) {
    console.error("[x402-server] Error in /api/chat:", error);

    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Chat processing failed",
      },
      { status: 500 }
    );
  }
});

// ──────────────────────────────────────────────────────────────────────────
// Activity Feed Endpoint
// ──────────────────────────────────────────────────────────────────────────

/**
 * GET /api/activity
 * Returns the last 20 agent activities for live feed
 *
 * Response:
 * {
 *   "activities": [
 *     { "id": "1", "timestamp": "2026-03-09T10:30:00Z", "action": "INTENT_PARSED", ... },
 *     { "id": "2", "timestamp": "2026-03-09T10:30:01Z", "action": "CIRCLE_SCAN", ... }
 *   ]
 * }
 *
 * @example
 * curl http://localhost:3002/api/activity
 */
app.get("/api/activity", (c) => {
  try {
    const activities = getActivities();

    return c.json({
      success: true,
      activities,
      count: activities.length,
    });
  } catch (error) {
    console.error("[x402-server] Error fetching activities:", error);

    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch activities",
      },
      { status: 500 }
    );
  }
});

// ──────────────────────────────────────────────────────────────────────────
// Protected Intent Matching Endpoint
// ──────────────────────────────────────────────────────────────────────────

/**
 * GET /api/match-intent?intentId=<id>
 * Protected endpoint — requires x402 payment or returns 402
 *
 * Protocol Flow:
 * 1. Client: GET /api/match-intent?intentId=123
 * 2. Server: No payment → HTTP 402 with paymentRequired details
 * 3. Client: Sign payment, retry with X-PAYMENT header
 * 4. Server: Verify payment on-chain → HTTP 200 with results
 *
 * @example
 * # First request (no payment)
 * curl http://localhost:3002/api/match-intent?intentId=123
 * HTTP 402
 * {
 *   "error": "Payment Required",
 *   "details": { "payTo": "0x...", "amount": "10000000000000000", ... }
 * }
 *
 * # After payment (with X-PAYMENT header)
 * curl -H "X-PAYMENT: true" http://localhost:3002/api/match-intent?intentId=123
 * HTTP 200
 * {
 *   "success": true,
 *   "intentId": 123,
 *   "matchResults": { ... },
 *   "priority": true
 * }
 */
app.get("/api/match-intent", async (c: any) => {
  const intentId = c.get("intentId") as number | undefined;
  const paymentVerified = c.get("paymentVerified") as boolean | undefined;

  // Validate intent ID
  if (!intentId) {
    return c.json(
      {
        error: "Missing intentId parameter",
      },
      { status: 400 }
    );
  }

  // Check payment — return 402 if not verified
  if (!paymentVerified) {
    try {
      const details = await getPaymentRequired(CONTRACT_ADDRESSES.agentPayment);

      return c.json(
        {
          error: "Payment Required",
          paymentRequired: details,
          message: "This intent requires priority payment. Send cUSD to process immediately.",
          endpoint: "POST /api/match-intent",
          instruction: "1. Sign payment via thirdweb SDK\n2. Retry with X-PAYMENT header",
        },
        { status: 402 }
      );
    } catch (error) {
      console.error("[x402-server] Error returning 402:", error);

      return c.json(
        {
          error: "Payment verification failed",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 }
      );
    }
  }

  // Payment verified — proceed with intent matching
  try {
    console.log(`[x402-server] Processing intent ${intentId} with payment verified`);

    // Call the actual intent matcher
    // For now, return a success response
    // In production, this would call matcher.matchIntent(intentId)

    const response: MatchIntentResponse = {
      success: true,
      intentId,
      priority: true, // This intent had priority payment
      matchResults: {
        // Placeholder — would be actual match results from matcher
        matched: true,
        matchCount: 1,
        estimatedTimeToMatch: "2 hours",
      },
    };

    return c.json(response, { status: 200 });
  } catch (error) {
    console.error(`[x402-server] Error matching intent ${intentId}:`, error);

    return c.json(
      {
        success: false,
        intentId,
        error: error instanceof Error ? error.message : "Intent matching failed",
      },
      { status: 500 }
    );
  }
});

// ──────────────────────────────────────────────────────────────────────────
// 404 Handler
// ──────────────────────────────────────────────────────────────────────────

app.notFound((c) => {
  return c.json(
    {
      error: "Not Found",
      message: `${c.req.method} ${c.req.path} does not exist`,
      availableEndpoints: [
        "/",
        "/api/payment-details",
        "/api/current-fee",
        "/api/chat (POST)",
        "/api/activity (GET)",
        "/api/match-intent",
      ],
    },
    { status: 404 }
  );
});

// ──────────────────────────────────────────────────────────────────────────
// Error Handler
// ──────────────────────────────────────────────────────────────────────────

app.onError((err: any, c: any) => {
  console.error("[x402-server] Error:", err);

  return c.json(
    {
      error: "Internal Server Error",
      message: err.message,
    },
    { status: 500 }
  );
});

// ──────────────────────────────────────────────────────────────────────────
// Server Start
// ──────────────────────────────────────────────────────────────────────────

const PORT = process.env.X402_PORT || 3002;

export async function startX402Server(): Promise<void> {
  serve(
    {
      fetch: app.fetch,
      port: Number(PORT),
    },
    (info: any) => {
      console.log(`[x402-server] 🌐 Listening on http://localhost:${info.port}`);
      console.log(`[x402-server] Endpoints:`);
      console.log(`[x402-server]   GET /`);
      console.log(`[x402-server]   GET /api/payment-details`);
      console.log(`[x402-server]   GET /api/current-fee`);
      console.log(`[x402-server]   POST /api/chat — conversational intent parser`);
      console.log(`[x402-server]   GET /api/activity — live agent activity feed`);
      console.log(`[x402-server]   GET /api/match-intent?intentId=<id>`);
    }
  );
}

export default app;
