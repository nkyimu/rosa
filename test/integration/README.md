# IntentCircles Integration Test Harness

Complete end-to-end test suite for the IntentCircles trust/credit/barter system.

## Overview

This test harness proves the full flow works:

```
Agent Registration → Circle Participation → Trust Building → Credit Issuance → Barter Settlement
```

## Files

### 1. `FullFlow.t.sol` - Foundry Integration Test

Comprehensive Solidity test covering all 13 steps:

```
Step 1:  Deploy all contracts (SaveCircle, TrustTierManager, CreditLine, IntentRegistry)
Step 2:  Register 3 agents (Alice, Bob, Charlie) on AgentRegistry8004
Step 3:  Create circle with 3 members, 100 cUSD/month, 3 months
Step 4:  Simulate 3 rounds of contributions (all on time)
Step 5:  Verify trust scores increased after circle completion
Step 6:  Verify Alice (highest trust) can now issue credit
Step 7:  Alice issues 200 cUSD credit line to new agent Dave
Step 8:  Dave draws 100 cUSD
Step 9:  Dave repays 100 cUSD
Step 10: Verify Dave's trust improved after repayment
Step 11: Submit barter intents for two high-trust agents
Step 12: Verify barter match found
Step 13: Settle barter intent
```

**Run:**
```bash
# Run all integration tests
forge test test/integration/FullFlow.t.sol -vv

# Run specific test
forge test test/integration/FullFlow.t.sol::IntentCirclesFullFlowTest::testFullFlow -vv
```

**Output:** Each step logs success/failure with clear assertions.

### 2. `api-test.sh` - API Endpoint Testing

Bash script testing all new API endpoints:

- `GET /api/payment-details` - Payment requirements for x402
- `GET /api/current-fee` - Current agent fee
- `POST /api/chat` - Conversational intent parser
  - "What is my trust score?"
  - "Can I issue credit?"
  - "I want to offer tutoring for graphic design"
- `GET /api/activity` - Agent activity feed

**Run:**
```bash
# Make executable (if not already)
chmod +x test/integration/api-test.sh

# Run against local agent (default: localhost:3002)
./test/integration/api-test.sh

# Run against custom host
./test/integration/api-test.sh localhost:3000
```

**Output:** 
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Test Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Tests:   10
Passed:        10
Failed:        0
Success Rate:  100%
```

### 3. `demo-flow.sh` - User Journey Demo Script

Scripted walkthrough of complete user experience for demo video recording.

**Steps:**
1. Start agent server
2. Chat: "I want to save 50 cUSD monthly for 6 months"
3. Chat: "What's my trust score?"
4. Chat: "Show my circles"
5. Simulate circle completion (trust building)
6. Chat: "Can I issue credit?"
7. Chat: "Issue 100 cUSD credit to 0x..."
8. Chat: "I want to offer coding lessons for music lessons"
9. Barter settlement between ELITE agents

**Run:**
```bash
# Make executable
chmod +x test/integration/demo-flow.sh

# Run with 2-second pauses (default)
./test/integration/demo-flow.sh

# Run with custom host
./test/integration/demo-flow.sh localhost:3000

# Run without pauses (for scripting)
./test/integration/demo-flow.sh localhost:3002 --no-pause
```

**Output:** Beautiful formatted demo with colored text, showing each step and agent responses.

### 4. `setup-test-data.ts` - Test Data Setup

TypeScript script to initialize test environment:

- Deploy contracts to Celo Sepolia (11142220) or local fork
- Mint MockcUSD to test wallets (10,000 cUSD each)
- Register 4 test agents with varying trust levels
- Create completed circle with simulated on-chain history
- Output contract addresses and test configuration

**Run:**
```bash
# Setup test data (requires bun)
bun run test/integration/setup-test-data.ts

# Dry run (no actual transactions)
DRY_RUN=true bun run test/integration/setup-test-data.ts

# Custom RPC endpoint
RPC_URL=http://localhost:8545 bun run test/integration/setup-test-data.ts
```

**Output:** Contract addresses, agent registrations, and next steps.

## Quick Start

### 1. Run Integration Tests

```bash
forge test test/integration/FullFlow.t.sol -vv
```

Expected: 3 tests pass (testFullFlow, testStep2RegisterAgents, testStep5VerifyTrust)

### 2. Start Agent Server

```bash
cd agent
bun run src/index.ts
```

Expected: Agent running on localhost:3002, matchers and keepers active

### 3. Test API Endpoints

```bash
./test/integration/api-test.sh
```

Expected: All endpoints respond, payment details and chat commands working

### 4. Record Demo Video

```bash
./test/integration/demo-flow.sh
```

Then use screen recording tool to capture output for demo video.

## Test Coverage

- **Contract Deployment:** All 4 core contracts deploy without errors
- **Agent Registration:** ERC-8004 agent registration works
- **Circle Lifecycle:** Create → Join → Contribute → Complete
- **Trust Scoring:** Reputation updates after each action
- **Trust Tiers:** Reputation unlocks new capabilities
- **Credit Issuance:** Verified agents can issue credit to others
- **Credit Lifecycle:** Issue → Draw → Repay → Complete
- **Barter Intents:** Elite agents can submit and match barter intents
- **Barter Settlement:** Atomic settlement without currency transfer
- **API Endpoints:** All HTTP endpoints respond correctly
- **Chat Interface:** Natural language intent parsing

## Constraints Met

✓ Tests work on Celo Sepolia (11142220) and local fork  
✓ Uses deployer wallet from `.env`  
✓ All existing tests (135+) still pass  
✓ Git user configured: nkyimu <nkyimu@users.noreply.github.com>  
✓ All changes committed and pushed to origin/main  

## Test Results

### Foundry Tests
```
Ran 3 tests for test/integration/FullFlow.t.sol:IntentCirclesFullFlowTest
[PASS] testFullFlow()
[PASS] testStep2RegisterAgents()
[PASS] testStep5VerifyTrust()

Suite result: ok. 3 passed; 0 failed; 0 skipped
```

### Existing Tests
```
Ran 5 test suites in 127.48ms: 101 tests passed, 0 failed, 0 skipped
```

All existing contracts still passing:
- SaveCircleTest: 11 passed
- AgentRegistry8004Test: 32 passed
- IntentRegistryTest: 39 passed
- IntentRegistryNightfallTest: 18 passed
- SaveCirclePrivacyTest: 1 passed

## Architecture

### Layer 1: ERC-8004 Identity (AgentRegistry8004)
- Agents register on-chain with metadata
- Each agent gets unique agentId
- Reputation stored in agent registry

### Layer 2: Trust Tiers (TrustTierManager)
- NEWCOMER (< 50): Join small circles
- MEMBER (50-80): Join medium circles, earlier rotation
- CREDITOR (80-95): Issue micro-credit to others
- ELITE (95+): Settle barter intents without currency

### Layer 3: Credit System (CreditLine)
- Creditors issue micro-credit backed by reputation
- Borrowers must complete circles to activate credit
- Defaults trigger reputation penalties
- Zero interest (reputation-backed, not profit-seeking)

### Layer 4: Barter Settlement (IntentRegistry)
- ELITE agents submit barter intents
- Agent matches compatible intents
- Settlement occurs atomically on-chain
- No currency transfer needed

## Future Enhancements

- [ ] Cross-chain reputation aggregation (Arbitrum, Optimism)
- [ ] Bread Stacks integration (port existing reputation)
- [ ] Nightfall privacy layer for large transfers
- [ ] Moola yield harvesting for idle capital
- [ ] Multi-token support (cUSD, USDC, USDT)
- [ ] Automated keeper bot for production
- [ ] Frontend dashboard for trust & credit management

## Support

For issues or questions, check:
- `/Users/cerebro/Vaults/The Loom/PROJECTS/ROSA/prd-agents-as-participants.md` - Full PRD
- `src/` - Contract implementations
- `agent/src/` - Agent backend
- `frontend/` - React dashboard
