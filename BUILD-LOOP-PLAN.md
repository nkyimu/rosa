# Build Loop Plan — Overnight Sprint 4
**Start**: 2026-03-09 06:10 PDT
**Target**: Working mobile demo by ~09:00-11:00 PDT
**Approach**: Parallel sub-agents, local models where possible

## Task Queue (ordered by dependency)

### Wave 1 — Parallel (no dependencies)
1. **[AGENT-1] Nightfall Docker Setup + Test**
   - Clone nightfall_4_CE repo, configure for Celo Sepolia
   - Test deposit/transfer/withdraw with testnet cUSD
   - This is the critical path — if Nightfall client doesn't work, fall back to commit-reveal

2. **[AGENT-2] SaveCircle.sol Privacy Upgrade**
   - Add commit-reveal contribution flow (fallback)
   - Add Nightfall mode toggle + deposit/withdrawal proof verification hooks
   - Add NIGHTFALL_DEPOSIT and NIGHTFALL_ROTATION intent types to IntentRegistry
   - Update tests, `forge test` must pass

3. **[AGENT-3] Deploy remaining contracts**
   - Try faucet again (cooldown should be reset)
   - Deploy AgentRegistry8004 + AgentPayment
   - Update DEPLOYED.md + frontend config

### Wave 2 — After Wave 1 completes
4. **[AGENT-4] Agent Nightfall Integration**
   - NightfallContributionManager in agent/src/nightfall.ts
   - Connect to Nightfall client REST API (localhost:3000)
   - Implement deposit/transfer/withdraw flows
   - Wire into existing matcher.ts and keeper.ts

5. **[AGENT-5] Frontend Privacy UX**
   - "Private mode" indicator
   - Commitment submission flow (amount + salt → hash)
   - Hide contribution amounts when Nightfall is active
   - Show proof verification status
   - Mobile-first (MiniPay 480px)

### Wave 3 — Integration
6. **[AGENT-6] End-to-end integration test**
   - Full flow: join → contribute (private) → rotation → claim
   - Screenshot/record for demo

## Notes
- Use OpenCode ACP for heavy coding (free tokens)
- Use sub-agents for bounded tasks
- Commit after each wave
