import { privateKeyToAccount } from "viem/accounts";
import type { Hex } from "viem";

// ─── RPC ────────────────────────────────────────────────────────────────────

export const CELO_ALFAJORES_RPC = "https://alfajores-forno.celo-testnet.org";
export const CELO_MAINNET_RPC   = "https://forno.celo.org";

// ─── Contract Addresses (Alfajores testnet) ──────────────────────────────────
// TODO: replace these after deployment

export const CONTRACT_ADDRESSES = {
  intentRegistry:  (process.env.INTENT_REGISTRY_ADDRESS  ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
  circleFactory:   (process.env.CIRCLE_FACTORY_ADDRESS   ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
  circleTrust:     (process.env.CIRCLE_TRUST_ADDRESS     ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
  // Celo Alfajores cUSD
  cUSD:            (process.env.CUSD_ADDRESS             ?? "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1") as `0x${string}`,
  // Moola / Aave lending pool (Alfajores)
  moolaLendingPool:(process.env.MOOLA_LENDING_POOL       ?? "0x0886f74eEEc443fBb6907fB5528B57C28E813129") as `0x${string}`,
};

// ─── Agent Wallet ────────────────────────────────────────────────────────────

function loadAgentAccount() {
  const raw = process.env.AGENT_PRIVATE_KEY;
  if (!raw) {
    console.warn("[config] AGENT_PRIVATE_KEY not set — running in read-only mode");
    return null;
  }
  const pk = (raw.startsWith("0x") ? raw : `0x${raw}`) as Hex;
  return privateKeyToAccount(pk);
}

export const agentAccount = loadAgentAccount();

// ─── Matcher Settings ────────────────────────────────────────────────────────

export const MATCHER_CONFIG = {
  // Allow ±10% variance in contribution amount for grouping
  amountTolerancePct: 10,
  // Minimum members to deploy a circle
  minGroupSize: 3,
  // Maximum members per circle
  maxGroupSize: 20,
  // How far back to look for open intents (seconds)
  intentLookbackSec: 7 * 24 * 60 * 60, // 7 days
};

// ─── Cycle Durations (seconds) ───────────────────────────────────────────────

export const CYCLE_DURATIONS = {
  weekly:    7  * 24 * 60 * 60,
  biweekly: 14  * 24 * 60 * 60,
  monthly:  30  * 24 * 60 * 60,
} as const;

// ─── Keeper Settings ─────────────────────────────────────────────────────────

export const KEEPER_CONFIG = {
  // Minimum yield to bother harvesting (in token base units — 1 cUSD)
  minYieldToHarvest: BigInt("1000000000000000000"),
  // Minimum idle capital to sweep to yield (10 cUSD)
  minSweepAmount:    BigInt("10000000000000000000"),
};
