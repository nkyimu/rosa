import { privateKeyToAccount } from "viem/accounts";
// ─── RPC ────────────────────────────────────────────────────────────────────
export const CELO_SEPOLIA_RPC = "https://forno.celo-sepolia.celo-testnet.org";
export const CELO_MAINNET_RPC = "https://forno.celo.org";
// Alias for backward compatibility
export const CELO_ALFAJORES_RPC = CELO_SEPOLIA_RPC;
// ─── Contract Addresses (Celo Sepolia testnet) ───────────────────────────────
export const CONTRACT_ADDRESSES = {
    intentRegistry: (process.env.INTENT_REGISTRY_ADDRESS ?? "0x6Bddd66698206c9956e5ac65F9083A132B574844"),
    circleFactory: (process.env.CIRCLE_FACTORY_ADDRESS ?? "0x87cd271485e7838607d19bc5b33dc0dc6297f1e3"),
    circleTrust: (process.env.CIRCLE_TRUST_ADDRESS ?? "0x58c26ba12128e68b203442ac081656b525892b83"),
    demoCircle: (process.env.DEMO_CIRCLE_ADDRESS ?? "0x7d938c7326ec34fb26f3af4a61259d2a0d19d8e4"),
    // Celo Sepolia cUSD
    cUSD: (process.env.CUSD_ADDRESS ?? "0xB3567F61d19506A023ae7216a27848B13e5c331B"),
    // Agent registry (ERC-8004)
    agentRegistry8004: (process.env.AGENT_REGISTRY_8004_ADDRESS ?? "0x2978474676279F2E697d5Dd3A54816ff200Ab136"),
    // x402 Payment collection contract
    agentPayment: (process.env.AGENT_PAYMENT_ADDRESS ?? "0xc9DA0e584B4A652B508A0d59D2bbF4418e1775aD"),
    // Moola / Aave lending pool (Sepolia - TBD)
    moolaLendingPool: (process.env.MOOLA_LENDING_POOL ?? "0x0000000000000000000000000000000000000000"),
};
// ─── Agent Wallet ────────────────────────────────────────────────────────────
function loadAgentAccount() {
    const raw = process.env.AGENT_PRIVATE_KEY;
    if (!raw) {
        console.warn("[config] AGENT_PRIVATE_KEY not set — running in read-only mode");
        return null;
    }
    const pk = (raw.startsWith("0x") ? raw : `0x${raw}`);
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
    weekly: 7 * 24 * 60 * 60,
    biweekly: 14 * 24 * 60 * 60,
    monthly: 30 * 24 * 60 * 60,
};
// ─── Keeper Settings ─────────────────────────────────────────────────────────
export const KEEPER_CONFIG = {
    // Minimum yield to bother harvesting (in token base units — 1 cUSD)
    minYieldToHarvest: BigInt("1000000000000000000"),
    // Minimum idle capital to sweep to yield (10 cUSD)
    minSweepAmount: BigInt("10000000000000000000"),
};
// ─── Demo Mode (Dry Run) ─────────────────────────────────────────────────────
export const DRY_RUN = process.env.DRY_RUN === "true" || process.env.DRY_RUN === "1";
