# ROSA — Private Savings Circles, Run by an Agent

> Your chama shouldn't need a treasurer who stays up chasing payments. ROSA is an autonomous agent that creates, enforces, and privately manages rotating savings circles (ROSCAs) on Celo — so the group saves together without trusting any one person.

## The Problem

[2 billion people](https://www.worldbank.org/en/topic/financialinclusion) participate in rotating savings circles. In Kenya they're called chamas, in Nigeria esusu, in Latin America tandas. The mechanism is simple: a group of people contribute a fixed amount each cycle, and one member collects the full pot on rotation.

It works — until someone misses a payment. Or the organizer disappears. Or members don't trust each other with the amounts they're contributing. The coordinator carries all the risk, tracks payments manually, and gets nothing for it. When the circle breaks down, so does the community's ability to save.

**No one has automated this for the people who actually use it.**

Traditional fintech solutions either (a) require bank accounts the participants don't have, (b) charge fees that eat into the savings, or (c) expose every member's financial behavior to the platform. ROSCAs work precisely because they're community-owned — but the coordination burden makes them fragile.

## What ROSA Does

ROSA is an agent — not a dashboard, not a dApp with a "submit" button. You tell it what you want:

> "I want to save 100 cUSD every week with 4 other people."

The agent handles everything:

1. **Creates or finds a circle** — matches you with compatible savers (same amount, same frequency, similar trust tier)
2. **Deploys a SaveCircle contract** — the rules are on-chain, enforced by code, not by a person
3. **Enforces contributions** — members contribute each cycle; the agent penalizes defaults and ejects chronic non-payers
4. **Rotates payouts** — each round, the next member in rotation claims the full pool
5. **Keeps contributions private** — ZK commit-reveal hides who contributed what amount; observers see hashes, not balances
6. **Sweeps idle capital to yield** — between payouts, pooled cUSD earns yield through Moola lending integration
7. **Tracks trust on-chain** — members who contribute reliably earn higher trust scores, unlocking credit lines and priority matching

No coordinator. No manual tracking. No leaked financial data.

## Why This Matters

**For Nneka** — a community health worker in Lagos who coordinates a monthly chama for 12 women. She spends 6 hours a month chasing payments over WhatsApp, keeps a paper ledger, and takes the blame when someone defaults. With ROSA, the agent enforces the rules. Nneka participates as a member, not a manager.

**For Ravi** — a gig worker in Hyderabad who saves through three different circles but has no portable reputation. When one platform deactivates his account, his track record disappears. ROSA's on-chain trust scores travel with him — his reliability is his, not the platform's.

**For the 2 billion** — who already save this way, but lose money to coordination failures, fraud, and the absence of infrastructure built for them.

## Architecture

```
┌──────────────────────────────────────────┐
│           ROSA Agent (TypeScript)         │
│  ┌─────────────┐  ┌───────────────────┐  │
│  │  Matcher     │  │  Keeper           │  │
│  │  - Scan      │  │  - Enforce        │  │
│  │  - Group     │  │  - Rotate         │  │
│  │  - Deploy    │  │  - Yield sweep    │  │
│  └─────────────┘  │  - Penalty/eject  │  │
│                    └───────────────────┘  │
│  ┌─────────────┐  ┌───────────────────┐  │
│  │  Chat        │  │  Nightfall (ZK)   │  │
│  │  Parser      │  │  - Commit-reveal  │  │
│  │  - NL → tx   │  │  - Private payouts│  │
│  └─────────────┘  └───────────────────┘  │
│  ┌────────────────────────────────────┐  │
│  │  x402 Payment Server (12 endpoints)│  │
│  └────────────────────────────────────┘  │
└─────────────────┬────────────────────────┘
                  │ Celo Sepolia JSON-RPC
┌─────────────────▼────────────────────────┐
│          Smart Contracts (Solidity)       │
│  SaveCircle · CircleFactory · CircleTrust │
│  IntentRegistry · AgentRegistry8004       │
│  AgentPayment · MockLendingPool (yield)   │
└──────────────────────────────────────────┘
```

### How the Agent Thinks

The agent runs two loops:

**Matcher (every 30 seconds):** Scans on-chain intents, groups compatible members (±10% contribution tolerance, matching cycle duration), deploys a SaveCircle contract, and batch-fulfills the matched intents in one transaction.

**Keeper (every 60 seconds):** Maintains active circles — advances rounds when contributions are complete, enforces penalties on late members, sweeps idle capital to yield, handles rotation payouts, and ejects chronic defaulters.

Neither loop requires human intervention. The agent makes decisions based on contract state and trust scores.

### Privacy Architecture

ROSA implements a three-layer privacy stack: **private coordination** (Venice), **contract privacy** (Nightfall ZK), and **operational security** (attestation logging).

#### Layer 1 — Private Cognition (Venice AI)

The matcher uses **Venice AI's private inference API** to reason about group compatibility without storing or logging any member data.

**Flow:**
1. Agent collects open intents from chain (amounts, cycles, group sizes)
2. Instead of simple parameter matching, sends *sanitized intent data* to Venice for private scoring
3. Venice privately analyzes compatibility: risk assessment, optimal grouping, financial fit
4. Venice returns group recommendations **without retaining any data**
5. Agent uses Venice's scoring to form optimal circles

**Privacy Guarantees:**
- ✓ Venice does NOT store prompts, responses, or interaction data
- ✓ All inferences are ephemeral — zero data retention
- ✓ Member identities are NOT sent (only anonymized intent indices)
- ✓ Contribution amounts are sent as sanitized numbers (no member mapping)
- ✓ TEE models (e2ee-*) run in Trusted Execution Environments with hardware attestation

**Why This Matters:**
Ethereum provides public coordination (all intent data on-chain). Venice provides **private cognition** — the agent reasons about financial compatibility in a privacy-preserving sandbox, then publishes only the matching decisions on-chain. Members' financial data never leaves the privacy boundary.

**Configuration:**
```bash
# In .env
VENICE_API_KEY=your_api_key      # Get from https://venice.ai
VENICE_MODEL=e2ee-glm-4-7-flash-p  # TEE model for max privacy credibility
```

**Privacy Attestation:**
Every Venice inference is logged to `logs/privacy-attestation-{timestamp}.json`:
- What data was analyzed (anonymized)
- Which model was used and if it's a TEE model
- Venice's zero-retention guarantee verified
- Timestamp of each inference call

Run `generatePrivacyReport()` to generate an audit-ready attestation:
```typescript
import { generatePrivacyReport } from "./src/privacy-attestation.js";
console.log(generatePrivacyReport());
```

---

#### Layer 2 — Contract Privacy (Nightfall ZK)

Standard ROSCA contracts reveal everything: who contributed, how much, when they claimed. On-chain transparency becomes a liability when members don't want their savings behavior public.

ROSA's Nightfall integration adds commit-reveal privacy:

1. Member generates a commitment (hash of amount + secret salt)
2. Commitment is posted on-chain — amount stays hidden
3. When the circle verifies, the member reveals the commitment
4. A ZK proof confirms the contribution matches without exposing the value

Observers see commitment hashes. Members see their own contributions. The agent verifies everything. Nobody else sees balances.

---

#### Privacy-First Design (CROPS Compliance)

**Censorship Resistance + Privacy = Coordination Freedom**

Members can save together without revealing:
- Contribution amounts
- Income or cash flow patterns
- Trust relationships
- Financial stress signals

If an adversary gained access to every on-chain log, they would see:
- Commitment hashes (not amounts)
- Timing of contributions
- Rotation order
- But NOT: amounts, member-to-amount mappings, or financial behavior

This is the baseline. Nightfall + Venice together achieve **private coordination without sacrificing auditability.**

### Trust Tiers

Every member starts as a **Newcomer** (trust score 0). Reliable contributions increase your score:

| Tier | Score | Unlocks |
|------|-------|---------|
| Newcomer | 0–24 | Basic circle participation |
| Member | 25–49 | Priority matching, larger circles |
| Creditor | 50–74 | Credit lines from the agent |
| Elder | 75–100 | Circle creation, governance votes |

Trust scores are on-chain via **CircleTrust** — portable across circles, visible to other agents, owned by you.

### Agent Identity (ERC-8004)

The agent registers on-chain via the ERC-8004 standard:
- Verifiable identity tied to an Ethereum address
- On-chain action history (circles deployed, intents fulfilled, penalties enforced)
- Discoverable by other agents and services

### Payments (x402)

The agent exposes 12 HTTP endpoints via the x402 payment protocol:
- `/api/chat` — Natural language interface ("save 50 cUSD monthly")
- `/api/status/system` — Agent health and statistics
- `/api/activity` — Live activity feed (deployments, contributions, payouts)
- `/api/trust/:address` — Trust score lookup
- `/api/credit/:address` — Credit line management
- `/api/barter/match` — Find barter matches by category

Paid endpoints verify cUSD payment via the AgentPayment contract before processing.

## CROPS Compliance

Every design decision was tested against the four CROPS constraints. If any constraint fails, the design gets reworked.

**Censorship Resistance:** No single actor can freeze a circle or block a member. The SaveCircle contract enforces rules regardless of who deployed it. If the agent goes offline, members interact directly with the contract — the agent is a convenience, not a dependency. *Design test: remove the agent entirely. Does the circle still function? Yes — members can call contribute() and claimRotation() directly.*

**Open Source:** Every component — contracts, agent, frontend — is auditable. Fork the repo, deploy your own agent, run your own circles. The contracts are immutable on-chain. *Design test: could a stranger read this code and understand exactly what the agent does with members' money? Yes — the agent's permissions are scoped to contract functions, not arbitrary wallet access.*

**Privacy:** Nightfall ZK commit-reveal is the default, not an opt-in. Members choose what to reveal. The protocol minimizes metadata: the agent verifies commitment validity without storing plaintext amounts. *Design test: if an adversary gained access to every on-chain log, what could they learn? Commitment hashes, timing of contributions, rotation order — but not amounts or member-to-amount mappings.*

**Security:** 197 tests pass across 33 test suites (0 failures). The agent's behavior is deterministic — it follows contract state, not heuristics. Members always have a direct exit path (withdraw, leave circle). *Design test: what happens if the agent is compromised? Members can still withdraw their funds directly from the contract. The agent cannot drain the circle — it has no withdrawal authority.*

## Synthesis Hackathon Tracks

ROSA sits at the intersection of multiple themes:

**Track 3 — Agents that Cooperate:** The agent enforces the social contract of the ROSCA — contributions, rotations, penalties, payouts — through smart contracts, not trust in a coordinator. This is textbook multi-party cooperation enforced by protocol.

**Track 4 — Agents that Keep Secrets:** ZK commit-reveal hides contribution amounts. Members prove they contributed without revealing how much. Private cooperation — cooperating without surveillance.

**Track 2 — Agents that Trust:** On-chain trust tiers, ERC-8004 agent identity, portable reputation. Members verify each other through track record, not platform attestation.

**Track 1 — Agents that Pay:** x402 payment protocol, automated rotation payouts, yield sweeps. Money moves when commitments are fulfilled, verified on-chain.

**Partner Bounties:**
- **Best Agent on Celo** ($3K/$2K) — Deployed on Celo Sepolia, MiniPay compatible, cUSD-native
- **ERC-8004** ($4K/$3K) — AgentRegistry8004 deployed with full agent identity
- **Open Track** ($14.5K) — Cross-theme infrastructure for real-world coordination

## Deployed Contracts (Celo Sepolia)

| Contract | Address |
|----------|---------|
| IntentRegistry | `0x6Bddd66698206c9956e5ac65F9083A132B574844` |
| CircleFactory | `0x87cd271485e7838607d19bc5b33dc0dc6297f1e3` |
| CircleTrust | `0x0c2098e90A078b2183b765eFB38Bd912FcDBb8Ba` |
| SaveCircle (Demo) | `0xfaDA25f4CD0f311d7F512B748E3242976e7AD3CF` |
| AgentRegistry8004 | `0xDaCE1481D99fb8184196e5Db28A16d7FcF006CA7` |
| AgentPayment | `0x5F1fD5655C42f77253E17Ec1FB9F65AC86400Ed4` |
| MockLendingPool | `0x4078B0950F3D12676C09F9997729b40a787b865b` |
| cUSD | `0xB3567F61d19506A023ae7216a27848B13e5c331B` |

**Agent Wallet:** `0x76990983caBF0B073a6E3Be8d04Fb590f64FA694`
**Chain:** Celo Sepolia (ID: `11142220`)
**RPC:** `https://forno.celo-sepolia.celo-testnet.org`

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) (or Node.js 20+)
- [Foundry](https://getfoundry.sh) (`forge`, `cast`)
- Docker (optional, for Nightfall client)

### Run the Agent

```bash
git clone https://github.com/AmantuBlu3worx/intent-circles.git
cd intent-circles/agent
cp .env.example .env  # Add your AGENT_PRIVATE_KEY
bun install
bun run src/index.ts
```

The agent connects to Celo Sepolia, scans for intents, matches compatible groups, deploys circles, and starts maintaining them.

### Run Tests

```bash
cd intent-circles
forge test -vv
# 197 tests, 0 failures
```

### Run the Frontend

```bash
cd frontend
bun install
bun run dev
# Open http://localhost:5173
```

### Dry-Run Mode

```bash
DRY_RUN=true bun run src/index.ts
```

Logs all agent decisions without sending transactions. Useful for demos and testing.

## Verified On-Chain Flow

This sequence has been executed on Celo Sepolia — not simulated, not mocked, not "would work in theory":

**Step 1 — Intent Submission:** Three wallets submit identical intents: "save 100 cUSD weekly, 5 members." Each intent is a single `submitIntent()` call to the IntentRegistry.

**Step 2 — Agent Matching:** The agent's matcher loop scans the chain, finds 3 compatible intents (matching params hash `0xe297e7...`), and groups them.

**Step 3 — Circle Deployment:** The agent calls `CircleFactory.createCircle()` → new SaveCircle contract at `0x1EE54Ec1dEA32e4e87c21EA0239A18fd313cf097`. One transaction.

**Step 4 — Batch Fulfillment:** Agent calls `batchFulfill()` — all 3 intents marked fulfilled in one atomic transaction. Tx: `0x04792f0b...`

**Step 5 — Lifecycle:** Members join → agent activates the circle (FORMING → ACTIVE) → members contribute 100 cUSD each → Member 0 claims 200 cUSD rotation payout → round advances to Round 2 → keeper continues maintaining.

**Every step has an on-chain receipt.** The agent deployed this circle autonomously — no human clicked "deploy."

## Project Structure

```
intent-circles/
├── src/                    # Solidity contracts
│   ├── SaveCircle.sol      # ROSCA lifecycle (join, contribute, rotate, payout)
│   ├── CircleFactory.sol   # Agent-controlled circle deployment
│   ├── IntentRegistry.sol  # On-chain intent storage and matching
│   ├── CircleTrust.sol     # Trust scores and tier system
│   ├── CreditLine.sol      # Agent-issued credit for high-trust members
│   ├── AgentRegistry8004.sol  # ERC-8004 agent identity
│   ├── AgentPayment.sol    # x402 payment collection
│   └── MockLendingPool.sol # Yield integration (Moola-compatible)
├── test/                   # Foundry tests (197 tests, 33 suites)
│   ├── SaveCircle.t.sol
│   ├── SaveCirclePrivacy.t.sol  # ZK commit-reveal tests
│   ├── CircleTrust.t.sol
│   └── ...
├── agent/                  # TypeScript agent runtime
│   └── src/
│       ├── index.ts        # Main loop (matcher + keeper)
│       ├── matcher.ts      # Intent scanning, grouping, circle deployment
│       ├── keeper.ts       # Round advancement, penalties, yield, payouts
│       ├── nightfall.ts    # ZK privacy client
│       ├── chat.ts         # Natural language → structured commands
│       ├── barter.ts       # Item-for-item matching (future)
│       ├── x402.ts         # Payment protocol server
│       └── config.ts       # Contract addresses, RPC, settings
├── frontend/               # React + Vite + wagmi
│   └── src/
│       ├── components/
│       │   ├── PrivacyBadge.tsx  # 🔒/🔓 privacy toggle
│       │   └── ...
│       └── utils/
│           └── privacy.ts  # Commitment generation, salt storage
└── README.md
```

## Team

Built by **AMANTU** — a cognitive assemblage of AI agents and one human, building sovereign systems for communities that need them.

- **Adze** — Engineering: agent runtime, contract integration, keeper logic
- **Empa** — Coordination: project structure, submission, cross-agent synthesis
- **Dorothy** — Research: privacy architecture, persona development, market validation
- **Amantu** — Human principal: architecture decisions, business context, vision

## Vision

Today: private savings circles on Celo, managed by an autonomous agent.

Tomorrow: high-trust circle members barter goods and services directly — items of similar value exchanged without needing fiat or tokens. The barter module exists. The trust infrastructure exists. The agent just needs a critical mass of members.

The end state: community coordination that's private by default, enforced by code, and owned by the participants.

---

**MIT License**
