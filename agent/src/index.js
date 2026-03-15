import { publicClient } from "./contracts.js";
import { agentAccount, CONTRACT_ADDRESSES, DRY_RUN } from "./config.js";
import { IntentMatcher } from "./matcher.js";
import { CircleKeeper } from "./keeper.js";
import { startX402Server } from "./x402-server.js";
import { addActivity } from "./activity.js";
// ─── Banner ───────────────────────────────────────────────────────────────────
console.log(`
╔═══════════════════════════════════════════╗
║         IntentCircles Agent v0.1          ║
║   Intent-matched, agent-managed ROSCAs   ║
║   with x402 Payment Required protocol     ║
╚═══════════════════════════════════════════╝
`);
// ─── Config Check ─────────────────────────────────────────────────────────────
async function startup() {
    // Log agent startup
    addActivity("AGENT_STARTED", "IntentCircles agent initialized", "Agent is starting up and running startup checks");
    if (DRY_RUN) {
        console.log("[agent] 🏜️  DRY_RUN MODE ENABLED — no transactions will be sent");
    }
    // Check RPC connectivity
    try {
        const block = await publicClient.getBlockNumber();
        console.log(`[agent] Connected to Celo Sepolia (chain 11142220) — block #${block}`);
    }
    catch (err) {
        console.error("[agent] ⚠️  Failed to connect to RPC:", err);
        console.error("[agent] Continuing in degraded mode...");
    }
    if (!agentAccount) {
        console.warn("[agent] ⚠️  Running WITHOUT wallet — set AGENT_PRIVATE_KEY to enable writes");
    }
    else {
        console.log(`[agent] Wallet: ${agentAccount.address}`);
    }
    if (CONTRACT_ADDRESSES.intentRegistry === "0x0000000000000000000000000000000000000000" ||
        CONTRACT_ADDRESSES.circleFactory === "0x0000000000000000000000000000000000000000") {
        console.warn("[agent] ⚠️  Contract addresses not configured — set env vars:");
        console.warn("         INTENT_REGISTRY_ADDRESS, CIRCLE_FACTORY_ADDRESS, CIRCLE_TRUST_ADDRESS");
    }
    else {
        console.log(`[agent] IntentRegistry: ${CONTRACT_ADDRESSES.intentRegistry}`);
        console.log(`[agent] CircleFactory:  ${CONTRACT_ADDRESSES.circleFactory}`);
        console.log(`[agent] CircleTrust:    ${CONTRACT_ADDRESSES.circleTrust}`);
    }
}
// ─── Main Loop ────────────────────────────────────────────────────────────────
async function main() {
    await startup();
    const matcher = new IntentMatcher();
    const keeper = new CircleKeeper();
    let running = true;
    // Start x402 payment server
    console.log("[agent] Starting x402 payment server...");
    await startX402Server();
    // Graceful shutdown
    process.on("SIGINT", () => { console.log("\n[agent] SIGINT — shutting down..."); running = false; });
    process.on("SIGTERM", () => { console.log("\n[agent] SIGTERM — shutting down..."); running = false; });
    // Run immediately on startup
    console.log("[agent] Running initial scan...");
    addActivity("CIRCLE_SCAN", "Initial intent scan on startup", "Checking for pending intents to match");
    await matcher.tick();
    addActivity("CIRCLE_HEALTH", "Initial circle health check", "Verifying circle status and health");
    await keeper.tick();
    // Timers
    const matcherInterval = 30 * 1000; // 30 seconds
    const keeperInterval = 60 * 1000; // 60 seconds
    let matcherTimer = null;
    let keeperTimer = null;
    function scheduleMatcher() {
        if (!running)
            return;
        matcherTimer = setTimeout(async () => {
            if (!running)
                return;
            addActivity("CIRCLE_SCAN", "Scanning for pending intents", "Checking intent registry for unmatched intents");
            await matcher.tick();
            scheduleMatcher();
        }, matcherInterval);
    }
    function scheduleKeeper() {
        if (!running)
            return;
        keeperTimer = setTimeout(async () => {
            if (!running)
                return;
            addActivity("CIRCLE_HEALTH", "Checking circle health", "Verifying active circles and member status");
            await keeper.tick();
            scheduleKeeper();
        }, keeperInterval);
    }
    scheduleMatcher();
    scheduleKeeper();
    console.log(`[agent] ✅ Running — matcher every ${matcherInterval / 1000}s, keeper every ${keeperInterval / 1000}s`);
    // Keep process alive
    await new Promise((resolve) => {
        const checkAlive = setInterval(() => {
            if (!running) {
                clearInterval(checkAlive);
                if (matcherTimer)
                    clearTimeout(matcherTimer);
                if (keeperTimer)
                    clearTimeout(keeperTimer);
                resolve();
            }
        }, 500);
    });
    console.log("[agent] Stopped.");
}
main().catch((err) => {
    console.error("[agent] Fatal error:", err);
    process.exit(1);
});
