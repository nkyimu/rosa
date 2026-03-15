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
import { getAgentTrustScore, getTrustCacheStats } from "./trust.js";
import { issueCreditLine, getCreditLines, getAllCredits, checkCreditHealth, } from "./credit.js";
import { submitBarterIntent, matchBarterIntents, getOpenBarterIntents, getAllBarterIntents, } from "./barter.js";
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
app.use("*", async (c, next) => {
    // Extract intent ID from query params, body, or URL params
    const intentId = c.req.query("intentId") || c.req.param("intentId");
    if (intentId) {
        // Parse intent ID
        const id = parseInt(intentId, 10);
        if (!isNaN(id)) {
            // Verify payment for this intent
            const verification = await verifyPayment(id, CONTRACT_ADDRESSES.agentPayment);
            if (verification.verified) {
                // Payment verified — attach to context and proceed
                c.set("paymentVerified", true);
                c.set("intentId", id);
                c.set("paidBy", verification.paidBy);
            }
            else {
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
    }
    catch (error) {
        console.error("[x402-server] Error fetching payment details:", error);
        return c.json({
            success: false,
            error: error instanceof Error ? error.message : "Failed to get payment details",
        }, { status: 500 });
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
    }
    catch (error) {
        console.error("[x402-server] Error fetching fee:", error);
        return c.json({
            success: false,
            error: error instanceof Error ? error.message : "Failed to get fee",
        }, { status: 500 });
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
app.post("/api/chat", async (c) => {
    try {
        const body = await c.req.json();
        if (!body.message) {
            return c.json({
                error: "Missing message field",
            }, { status: 400 });
        }
        const response = handleChat(body.message);
        return c.json({
            success: true,
            ...response,
        });
    }
    catch (error) {
        console.error("[x402-server] Error in /api/chat:", error);
        return c.json({
            success: false,
            error: error instanceof Error ? error.message : "Chat processing failed",
        }, { status: 500 });
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
    }
    catch (error) {
        console.error("[x402-server] Error fetching activities:", error);
        return c.json({
            success: false,
            error: error instanceof Error ? error.message : "Failed to fetch activities",
        }, { status: 500 });
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
app.get("/api/match-intent", async (c) => {
    const intentId = c.get("intentId");
    const paymentVerified = c.get("paymentVerified");
    // Validate intent ID
    if (!intentId) {
        return c.json({
            error: "Missing intentId parameter",
        }, { status: 400 });
    }
    // Check payment — return 402 if not verified
    if (!paymentVerified) {
        try {
            const details = await getPaymentRequired(CONTRACT_ADDRESSES.agentPayment);
            return c.json({
                error: "Payment Required",
                paymentRequired: details,
                message: "This intent requires priority payment. Send cUSD to process immediately.",
                endpoint: "POST /api/match-intent",
                instruction: "1. Sign payment via thirdweb SDK\n2. Retry with X-PAYMENT header",
            }, { status: 402 });
        }
        catch (error) {
            console.error("[x402-server] Error returning 402:", error);
            return c.json({
                error: "Payment verification failed",
                details: error instanceof Error ? error.message : "Unknown error",
            }, { status: 500 });
        }
    }
    // Payment verified — proceed with intent matching
    try {
        console.log(`[x402-server] Processing intent ${intentId} with payment verified`);
        // Call the actual intent matcher
        // For now, return a success response
        // In production, this would call matcher.matchIntent(intentId)
        const response = {
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
    }
    catch (error) {
        console.error(`[x402-server] Error matching intent ${intentId}:`, error);
        return c.json({
            success: false,
            intentId,
            error: error instanceof Error ? error.message : "Intent matching failed",
        }, { status: 500 });
    }
});
// ──────────────────────────────────────────────────────────────────────────
// Trust & Reputation Endpoints
// ──────────────────────────────────────────────────────────────────────────
/**
 * GET /api/trust/:address
 * Get agent trust score and tier
 *
 * @example
 * curl http://localhost:3002/api/trust/0x742d35Cc6634C0532925a3b844Bc9e7595f8bEb6
 * {
 *   "success": true,
 *   "address": "0x...",
 *   "score": 85,
 *   "tier": "CREDITOR",
 *   "circlesCompleted": 6,
 *   "defaults": 0,
 *   "avgPeerRating": 4.8,
 *   "capabilities": {
 *     "canIssueCredit": true,
 *     "canBarterSettle": false,
 *     "maxCircleSize": 16
 *   }
 * }
 */
app.get("/api/trust/:address", async (c) => {
    try {
        const address = c.req.param("address");
        const trustScore = await getAgentTrustScore(address);
        return c.json({
            success: true,
            address,
            ...trustScore,
            capabilities: {
                canIssueCredit: trustScore.score >= 80,
                canBarterSettle: trustScore.score >= 95,
                maxCircleSize: trustScore.score >= 95
                    ? 32
                    : trustScore.score >= 80
                        ? 16
                        : trustScore.score >= 50
                            ? 8
                            : 3,
            },
        });
    }
    catch (error) {
        console.error("[x402-server] Error in /api/trust:", error);
        return c.json({
            success: false,
            error: error instanceof Error ? error.message : "Failed to fetch trust score",
        }, { status: 500 });
    }
});
// ──────────────────────────────────────────────────────────────────────────
// Credit Management Endpoints
// ──────────────────────────────────────────────────────────────────────────
/**
 * GET /api/credit-lines/:address
 * Get active credit lines for an address
 *
 * @example
 * curl http://localhost:3002/api/credit-lines/0x742d35Cc6634C0532925a3b844Bc9e7595f8bEb6
 * {
 *   "success": true,
 *   "address": "0x...",
 *   "issued": [...],
 *   "received": [...],
 *   "totalIssued": "500000000000000000000",
 *   "totalReceived": "100000000000000000000"
 * }
 */
app.get("/api/credit-lines/:address", async (c) => {
    try {
        const address = c.req.param("address");
        const { issued, received } = getCreditLines(address);
        const totalIssued = issued.reduce((sum, cl) => sum + cl.amount, BigInt(0));
        const totalReceived = received.reduce((sum, cl) => sum + cl.amount, BigInt(0));
        return c.json({
            success: true,
            address,
            issued,
            received,
            totalIssued: totalIssued.toString(),
            totalReceived: totalReceived.toString(),
            count: {
                issued: issued.length,
                received: received.length,
            },
        });
    }
    catch (error) {
        console.error("[x402-server] Error in /api/credit-lines:", error);
        return c.json({
            success: false,
            error: error instanceof Error ? error.message : "Failed to fetch credit lines",
        }, { status: 500 });
    }
});
/**
 * POST /api/credit/issue
 * Issue a credit line
 *
 * Request body:
 * {
 *   "issuerAddress": "0x...",
 *   "borrowerAddress": "0x...",
 *   "amount": "50000000000000000000",
 *   "termWeeks": 8,
 *   "circleIdRequired": 1
 * }
 *
 * @example
 * curl -X POST http://localhost:3002/api/credit/issue \
 *   -H "Content-Type: application/json" \
 *   -d '{"issuerAddress":"0x...","borrowerAddress":"0x...","amount":"50000000000000000000","termWeeks":8,"circleIdRequired":1}'
 */
app.post("/api/credit/issue", async (c) => {
    try {
        const body = await c.req.json();
        const { issuerAddress, borrowerAddress, amount, termWeeks, circleIdRequired } = body;
        if (!issuerAddress || !borrowerAddress || !amount || !termWeeks) {
            return c.json({ error: "Missing required fields: issuerAddress, borrowerAddress, amount, termWeeks" }, { status: 400 });
        }
        const creditId = await issueCreditLine(issuerAddress, borrowerAddress, BigInt(amount), termWeeks, circleIdRequired || 1);
        return c.json({
            success: true,
            creditId,
            message: `Credit line issued. Borrower must join circle ${circleIdRequired} to activate.`,
        });
    }
    catch (error) {
        console.error("[x402-server] Error in /api/credit/issue:", error);
        return c.json({
            success: false,
            error: error instanceof Error ? error.message : "Failed to issue credit",
        }, { status: 500 });
    }
});
/**
 * GET /api/credit-report/:address
 * Get portable credit report (JSON export)
 *
 * @example
 * curl http://localhost:3002/api/credit-report/0x742d35Cc6634C0532925a3b844Bc9e7595f8bEb6
 */
app.get("/api/credit-report/:address", async (c) => {
    try {
        const address = c.req.param("address");
        const trustScore = await getAgentTrustScore(address);
        const { issued, received } = getCreditLines(address);
        const health = await checkCreditHealth();
        return c.json({
            success: true,
            reportDate: new Date().toISOString(),
            agentAddress: address,
            reputation: trustScore,
            credits: {
                issued,
                received,
            },
            summary: {
                trustTier: trustScore.tier,
                reputationScore: trustScore.score,
                circlesCompleted: trustScore.circlesCompleted,
                creditsIssued: issued.length,
                creditsReceived: received.length,
                defaultsOnRecord: trustScore.defaults,
            },
        });
    }
    catch (error) {
        console.error("[x402-server] Error in /api/credit-report:", error);
        return c.json({
            success: false,
            error: error instanceof Error ? error.message : "Failed to generate credit report",
        }, { status: 500 });
    }
});
// ──────────────────────────────────────────────────────────────────────────
// Barter & Intent Matching Endpoints
// ──────────────────────────────────────────────────────────────────────────
/**
 * POST /api/barter/submit
 * Submit a barter intent
 *
 * Request body:
 * {
 *   "agentAddress": "0x...",
 *   "offering": "web design (40 hours)",
 *   "seeking": "childcare (10 hrs/week)"
 * }
 *
 * @example
 * curl -X POST http://localhost:3002/api/barter/submit \
 *   -H "Content-Type: application/json" \
 *   -d '{"agentAddress":"0x...","offering":"web design","seeking":"childcare"}'
 */
app.post("/api/barter/submit", async (c) => {
    try {
        const body = await c.req.json();
        const { agentAddress, offering, seeking } = body;
        if (!agentAddress || !offering || !seeking) {
            return c.json({ error: "Missing required fields: agentAddress, offering, seeking" }, { status: 400 });
        }
        const intentId = await submitBarterIntent(agentAddress, offering, seeking);
        return c.json({
            success: true,
            intentId,
            message: `Barter intent submitted. Agent must be ELDER tier (95+ reputation) to settle.`,
        });
    }
    catch (error) {
        console.error("[x402-server] Error in /api/barter/submit:", error);
        return c.json({
            success: false,
            error: error instanceof Error ? error.message : "Failed to submit barter intent",
        }, { status: 500 });
    }
});
/**
 * GET /api/barter/matches
 * Get available barter matches
 *
 * @example
 * curl http://localhost:3002/api/barter/matches
 */
app.get("/api/barter/matches", async (c) => {
    try {
        const matches = await matchBarterIntents();
        const openIntents = getOpenBarterIntents();
        return c.json({
            success: true,
            totalOpenIntents: openIntents.length,
            matchesFound: matches.length,
            matches: matches.slice(0, 10), // Top 10 matches
            topMatch: matches.length > 0 ? matches[0] : null,
        });
    }
    catch (error) {
        console.error("[x402-server] Error in /api/barter/matches:", error);
        return c.json({
            success: false,
            error: error instanceof Error ? error.message : "Failed to match barter intents",
        }, { status: 500 });
    }
});
// ──────────────────────────────────────────────────────────────────────────
// Monitoring & Status Endpoints
// ──────────────────────────────────────────────────────────────────────────
/**
 * GET /api/status/system
 * Get system health and statistics
 *
 * @example
 * curl http://localhost:3002/api/status/system
 */
app.get("/api/status/system", async (c) => {
    try {
        const cacheStats = getTrustCacheStats();
        const allCredits = getAllCredits();
        const allBarterIntents = getAllBarterIntents();
        return c.json({
            success: true,
            timestamp: new Date().toISOString(),
            stats: {
                trustCache: cacheStats,
                credits: {
                    total: allCredits.length,
                    byStatus: {
                        open: allCredits.filter((c) => c.status === "OPEN").length,
                        active: allCredits.filter((c) => c.status === "ACTIVE").length,
                        repaid: allCredits.filter((c) => c.status === "REPAID").length,
                        defaulted: allCredits.filter((c) => c.status === "DEFAULT").length,
                    },
                },
                barter: {
                    totalIntents: allBarterIntents.length,
                    open: allBarterIntents.filter((i) => i.status === "OPEN").length,
                    matched: allBarterIntents.filter((i) => i.status === "MATCHED").length,
                    settled: allBarterIntents.filter((i) => i.status === "SETTLED").length,
                },
            },
        });
    }
    catch (error) {
        console.error("[x402-server] Error in /api/status/system:", error);
        return c.json({
            success: false,
            error: error instanceof Error ? error.message : "Failed to get system status",
        }, { status: 500 });
    }
});
// ──────────────────────────────────────────────────────────────────────────
// 404 Handler
// ──────────────────────────────────────────────────────────────────────────
app.notFound((c) => {
    return c.json({
        error: "Not Found",
        message: `${c.req.method} ${c.req.path} does not exist`,
        availableEndpoints: [
            "GET /",
            "GET /api/payment-details",
            "GET /api/current-fee",
            "POST /api/chat",
            "GET /api/activity",
            "GET /api/match-intent",
            "GET /api/trust/:address",
            "GET /api/credit-lines/:address",
            "POST /api/credit/issue",
            "GET /api/credit-report/:address",
            "POST /api/barter/submit",
            "GET /api/barter/matches",
            "GET /api/status/system",
        ],
    }, { status: 404 });
});
// ──────────────────────────────────────────────────────────────────────────
// Error Handler
// ──────────────────────────────────────────────────────────────────────────
app.onError((err, c) => {
    console.error("[x402-server] Error:", err);
    return c.json({
        error: "Internal Server Error",
        message: err.message,
    }, { status: 500 });
});
// ──────────────────────────────────────────────────────────────────────────
// Server Start
// ──────────────────────────────────────────────────────────────────────────
const PORT = process.env.X402_PORT || 3002;
export async function startX402Server() {
    serve({
        fetch: app.fetch,
        port: Number(PORT),
    }, (info) => {
        console.log(`[x402-server] 🌐 Listening on http://localhost:${info.port}`);
        console.log(`[x402-server] Endpoints:`);
        console.log(`[x402-server]   GET / — health check`);
        console.log(`[x402-server]   GET /api/payment-details — x402 payment info`);
        console.log(`[x402-server]   GET /api/current-fee — current agent fee`);
        console.log(`[x402-server]   POST /api/chat — conversational intent parser`);
        console.log(`[x402-server]   GET /api/activity — live agent activity feed`);
        console.log(`[x402-server]   GET /api/match-intent?intentId=<id> — match intent (x402 protected)`);
        console.log(`[x402-server] Trust & Reputation:`);
        console.log(`[x402-server]   GET /api/trust/:address — agent trust score & tier`);
        console.log(`[x402-server] Credit Management:`);
        console.log(`[x402-server]   GET /api/credit-lines/:address — active credits`);
        console.log(`[x402-server]   POST /api/credit/issue — issue a credit line`);
        console.log(`[x402-server]   GET /api/credit-report/:address — portable credit report`);
        console.log(`[x402-server] Barter & Matching:`);
        console.log(`[x402-server]   POST /api/barter/submit — submit barter intent`);
        console.log(`[x402-server]   GET /api/barter/matches — find compatible barter matches`);
        console.log(`[x402-server] Monitoring:`);
        console.log(`[x402-server]   GET /api/status/system — system health & statistics`);
    });
}
export default app;
