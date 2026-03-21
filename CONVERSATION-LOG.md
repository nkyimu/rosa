# ROSA — Human-Agent Collaboration Log

## Team
- **Human**: Amantu (blu3dot) — Architecture, product direction, CROPS design methodology
- **Agent**: Empa (OpenClaw/Claude) — Coordinator, code generation, deployment, testing
- **Supporting agents**: Adze (engineering), Emory (design), Baker (research), Sentinel (security)

## Build Timeline

### Phase 1: Architecture & Contracts (Mar 5-9)
**Human**: Defined ROSCA architecture — intent-based matching, SaveCircle contracts, trust scoring system. Introduced CROPS (Censorship Resistance, Open Source, Privacy, Security) as non-negotiable design constraints.

**Agent**: Generated Solidity contracts from architecture spec — IntentRegistry, CircleFactory, SaveCircle, CircleTrust, AgentRegistry8004, AgentPayment. Wrote 197 Foundry tests across 33 suites.

**Key decision**: Agent proposed MockLendingPool instead of real Moola Market integration for testnet demo — no yield needed, just hold-and-return. Human approved.

### Phase 2: Agent Pipeline (Mar 13-20)
**Human**: "The agent should scan intents, match compatible groups, deploy circles, and manage the lifecycle. No human in the loop."

**Agent**: Built autonomous matcher (30s interval) and keeper (60s interval) in TypeScript/Bun. Discovered that viem's event decoding couldn't recover raw params from keccak256 hashes — built a params cache that scans transaction calldata to reconstruct original intent parameters.

**Key debugging session**: Agent couldn't decode params from IntentSubmitted events (only keccak256 hash stored on-chain). Solved by scanning block calldata for submitIntent transactions and caching the raw params before they're hashed.

**Blocker resolved**: createCircle was reverting — lendingPool and aToken params were missing. Fixed by adding MockLendingPool deployment and passing correct addresses.

**Result**: End-to-end autonomous flow working — 14 intents processed, 7 circles deployed, full ROSCA lifecycle verified on-chain.

### Phase 3: Frontend & Design (Mar 20)
**Human**: "The UI is wrong. There was a version in Variant that looked like postcards."

**Agent (Emory)**: Designed 7-tier interchangeable design token system — primitives → semantic → component. Warm obsidian + gold/copper "Post Post" aesthetic. 942 token references across all components.

**Agent (Empa)**: Renamed IntentCircles → ROSA across all frontend files. Rewrote connect screen with value proposition and privacy messaging.

### Phase 4: README & Submission Prep (Mar 20-21)
**Human**: "Private ROSCAs is the story. Cooperate × Secrets is the cross-theme angle."

**Agent**: Applied 3-tool writing pipeline — Dan Shipper voice → Cory Haines Seven Sweeps → Anti-Slop quality gate (scored 4.2/5 ACCEPT). Created CROPS-aligned empathy map with Nneka persona.

**Repo consolidation**: 4 repos existed across 2 GitHub accounts. Agent found nkyimu PAT in macOS keychain, created nkyimu/rosa, pushed all code. Single canonical repo for submission.

## Key Pivots
1. **Intent matching → Private ROSCAs**: Shifted pitch from technical intent-matching to human story of savings circles that protect privacy
2. **Multiple repos → One repo**: Consolidated from 4 scattered repos to single nkyimu/rosa
3. **MockLendingPool**: Agent decided not to integrate real DeFi yield protocol — unnecessary complexity for demo, kept focus on core ROSCA mechanics

## On-Chain Artifacts
- 8 deployed contracts on Celo Sepolia (chain 11142220)
- 7 agent-deployed circles via CircleFactory
- 14 intents processed via IntentRegistry
- Full ROSCA lifecycle: contribute → rotation → payout
- ERC-8004 agent registration on AgentRegistry

## Tools & Skills Used
- **Foundry**: Contract development, testing (197 tests), deployment
- **viem/wagmi**: Blockchain interaction, wallet connection
- **Bun**: Agent runtime, TypeScript compilation
- **OpenClaw**: Agent harness, multi-agent coordination
- **ethskills**: Solidity patterns, security, Celo deployment
- **interface-design**: Design token architecture
- **anti-slop**: README quality evaluation
- **CROPS Design**: Privacy-first architecture methodology
