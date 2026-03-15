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
declare const app: Hono<import("hono/types").BlankEnv, import("hono/types").BlankSchema, "/">;
export declare function startX402Server(): Promise<void>;
export default app;
