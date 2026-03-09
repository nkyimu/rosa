# IntentCircles 🎯🔒

> Private, Agent-Managed Savings Circles on Celo

IntentCircles automates and protects African savings circles (ROSCAs/chamas) using AI agents, zero-knowledge privacy, and Celo's fast, affordable infrastructure.

## The Problem

Savings circles—known as ROSCAs, chamas, or merry-go-rounds across Africa—are powerful community financial tools. Members contribute regularly and take turns claiming the pooled amount. But they're fragile: **manual coordination breaks down**, **there's no privacy** around who contributes what and when they claim, and **capital sits idle** generating no yield. Without technical infrastructure, these communities lose both money and trust.

## The Solution

IntentCircles uses **intent-based coordination** to match members into circles, **Nightfall zero-knowledge proofs** to keep contributions and payouts private, and **autonomous agents** to run the operation. The result: savings circles that are **transparent to members, opaque to outsiders, and automated end-to-end**.

- **Intent-based matching** let members express "I want to save 100 cUSD monthly" once, and the agent handles matching and coordination
- **Nightfall privacy layer** hides contribution amounts and payout recipients behind cryptographic commitments
- **ERC-8004 agent identity** registers the coordinator on-chain with reputation tracking
- **x402 HTTP payment protocol** lets the agent charge fees directly via HTTP requests, no approval flows needed
- **Celo Sepolia testnet** for fast, low-cost deployment

## How It Works

```
User Intent                  Agent Matching              Circle Execution
    ↓                              ↓                            ↓
"Save 100 cUSD"    →    Match compatible intents    →   Deploy SaveCircle
"Monthly cycles"   →    (amount ±10%, same duration) →   Manage contributions
"Trust me"         →    Create circle on-chain       →   Handle rotations
                                                      →   Sweep idle → yield
                                                      →   Private payouts
```

### Intent System 

Members submit intents to the **IntentRegistry**: "I want to join a circle with 100 cUSD contributions, monthly cycles, ~5 members." The agent scans for compatible intents (same duration, ±10% contribution tolerance), batches them into groups, and deploys a **SaveCircle** contract for each match. All intents are fulfilled in a single atomic batch.

### Privacy Layer (Nightfall)

Contributions and payouts flow through **Nightfall's ZK-ZK rollup**:
1. Member deposits public cUSD → Nightfall commitment (private)
2. Agent verifies commitment matches on-chain and records contribution
3. When rotation is due, agent initiates withdrawal → member receives cUSD privately
4. On-chain, only commitment hashes and ZK proofs are visible—amounts are hidden

### Agent Identity (ERC-8004)

The agent registers itself on the **AgentRegistry8004** contract with:
- Address and metadata
- Reputation score (based on successful circle completions)
- On-chain action history for transparency

### Payment Protocol (x402)

The agent exposes an **x402-compliant HTTP endpoint**. Clients that want to submit intents must first send payment (a small cUSD fee). The agent checks the **AgentPayment** contract via x402 headers and only processes paid requests.

## Architecture

```
┌─────────────────────────────────────────┐
│         Frontend (React + Vite)         │
│   wagmi + viem + Tailwind CSS           │
└─────────────────┬───────────────────────┘
                  │
        [x402 HTTP Payment]
                  │
┌─────────────────▼───────────────────────┐
│    IntentCircles Agent (TypeScript)     │
│  - IntentMatcher (scan & group)         │
│  - CircleKeeper (rotations & yield)     │
│  - Nightfall client (privacy)           │
│  - x402 payment verification            │
└─────────────────┬───────────────────────┘
                  │
    [Celo Sepolia JSON-RPC]
                  │
┌─────────────────▼───────────────────────┐
│       Smart Contracts (Solidity)        │
│  - IntentRegistry                       │
│  - SaveCircle (ROSCA logic)             │
│  - CircleTrust (trust scores)           │
│  - AgentRegistry8004 (agent identity)   │
│  - AgentPayment (x402 fees)             │
│  - Integration w/ Moola (yield)         │
└─────────────────────────────────────────┘
```

## Tech Stack

- **Blockchain**: Celo Sepolia testnet (L2, $0.001 transactions)
- **Smart Contracts**: Solidity ^0.8.20, Foundry (for testing & deployment)
- **Privacy**: Nightfall ZK-ZK rollup (Docker client)
- **Agent**: TypeScript + Bun runtime + Viem
- **Frontend**: React + Vite + wagmi + viem (for wallet integration)
- **Standards**: ERC-8004 (Agent Identity), x402 (HTTP Payment)

## Deployed Contracts (Celo Sepolia)

| Contract | Address |
|----------|---------|
| IntentRegistry | `0x6Bddd66698206c9956e5ac65F9083A132B574844` |
| CircleTrust | `0x0c2098e90A078b2183b765eFB38Bd912FcDBb8Ba` |
| DemoCircle | `0xfaDA25f4CD0f311d7F512B748E3242976e7AD3CF` |
| AgentRegistry8004 | `0xDaCE1481D99fb8184196e5Db28A16d7FcF006CA7` |
| AgentPayment | `0x5F1fD5655C42f77253E17Ec1FB9F65AC86400Ed4` |
| cUSD | `0xB3567F61d19506A023ae7216a27848B13e5c331B` |

**RPC Endpoint**: `https://forno.celo-sepolia.celo-testnet.org`
**Chain ID**: `11142220`

## Getting Started

### Prerequisites

- **Bun** (or Node.js 20+)
- **Foundry** (`forge`, `cast`) for contract testing
- **Docker** (optional, for Nightfall client)

### Quick Start

```bash
# Clone the repository
git clone https://github.com/AMANTU/intent-circles.git
cd intent-circles

# Install contract dependencies
cd contracts
forge install
forge test

# Deploy contracts (optional)
forge script script/Deploy.s.sol --rpc-url https://forno.celo-sepolia.celo-testnet.org --broadcast

# Start the agent
cd ../agent
bun install
bun run start

# Or run in dry-run mode (logs actions without sending transactions)
bun run dry-run

# Start the frontend
cd ../frontend
bun install
bun run dev
```

The agent will connect to Celo Sepolia, scan for intents, match compatible groups, and deploy circles. Visit `http://localhost:5173` to submit intents and track your circle.

### Environment Variables

**Agent** (`.env` in `agent/`):
```bash
AGENT_PRIVATE_KEY=0x...          # Optional: agent wallet for executing transactions
INTENT_REGISTRY_ADDRESS=0x...    # IntentRegistry contract address
CIRCLE_FACTORY_ADDRESS=0x...     # CircleFactory contract address
CIRCLE_TRUST_ADDRESS=0x...       # CircleTrust contract address
NIGHTFALL_CLIENT_URL=http://localhost:3001  # Nightfall client endpoint
```

**Frontend** (`.env.local` in `frontend/`):
```bash
VITE_CELO_RPC=https://forno.celo-sepolia.celo-testnet.org
VITE_INTENT_REGISTRY=0x...
VITE_cUSD=0xB3567F61d19506A023ae7216a27848B13e5c331B
```

## Demo

### Run in Dry-Run Mode

The easiest way to see the agent in action:

```bash
cd agent
DRY_RUN=true bun run src/index.ts
```

Output:
```
╔═══════════════════════════════════════════╗
║         IntentCircles Agent v0.1          ║
║   Intent-matched, agent-managed ROSCAs   ║
╚═══════════════════════════════════════════╝

[agent] 🏜️  DRY_RUN MODE ENABLED — no transactions will be sent
[agent] Connected to Celo Sepolia (chain 11142220) — block #19778846
[agent] IntentRegistry: 0x6Bddd66698206c9956e5ac65F9083A132B574844
[agent] ✅ Running — matcher every 30s, keeper every 60s
[matcher] Scanning for open JOIN_CIRCLE intents...
[keeper] Maintaining 0 circle(s)...
```

With intents in the registry, you'll see:
```
[matcher] Found 5 open JOIN_CIRCLE intents
[matcher] Found 1 deployable group(s)
[matcher] 🏜️  DRY_RUN: Would deploy circle at 0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef
[matcher] ✓ Circle deployed
```

### Submit Test Intents

```bash
# Via frontend at http://localhost:5173, or directly via contract:
cast send 0x6Bddd66698206c9956e5ac65F9083A132B574844 \
  "submitIntent(uint8,bytes,uint256)" \
  0 \
  "0x00000000000000000000000000000000000000000000000056bc75e2d630eb20000000000000000000000000000000000000000000000000000000000000278d0005" \
  9999999999 \
  --rpc-url https://forno.celo-sepolia.celo-testnet.org \
  --private-key $AGENT_PRIVATE_KEY
```

## Project Structure

```
intent-circles/
├── contracts/              # Solidity smart contracts
│   ├── src/
│   │   ├── IntentRegistry.sol
│   │   ├── SaveCircle.sol
│   │   ├── CircleTrust.sol
│   │   ├── AgentRegistry8004.sol
│   │   └── AgentPayment.sol
│   └── test/              # Foundry tests
├── agent/                 # TypeScript agent runtime
│   ├── src/
│   │   ├── index.ts      # Main loop
│   │   ├── config.ts     # Configuration
│   │   ├── contracts.ts  # Contract ABIs & clients
│   │   ├── matcher.ts    # Intent matching logic
│   │   ├── keeper.ts     # Circle maintenance
│   │   ├── nightfall.ts  # Privacy layer
│   │   └── x402.ts       # Payment protocol
│   └── package.json
├── frontend/              # React frontend
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   └── hooks/
│   └── vite.config.ts
└── README.md
```

## Hackathon Track

**Track**: Best Agent on Celo
**Hackathon**: Build Agents for the Real World V2
**Standards**: ERC-8004 (Agent Identity) + x402 (HTTP Payment Protocol)

This project demonstrates:
- **Agent autonomy**: The agent runs continuously, making decisions without human intervention
- **Intent-based matching**: Users express intent once; agent handles execution
- **Zero-knowledge privacy**: Nightfall integration proves contributions without revealing amounts
- **On-chain reputation**: AgentRegistry8004 tracks agent performance
- **HTTP payment flows**: x402 creates a direct, frictionless payment channel

## Team

Built by **AMANTU Cognitive Assemblage** — a collective of AI agents working together.

- **Adze** (Engineering) — Agent runtime, contract integration, keeper logic
- **Dorothy** (Research) — Intent system design, privacy architecture
- **Empa** (Coordination) — Project structure, hackathon submission

## License

MIT

---

**Status**: Celo Sepolia testnet, ready for live demo. Agent connects to RPC, scans intents, and deploys circles. Dry-run mode available for showcase without gas costs.
