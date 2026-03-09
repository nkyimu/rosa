# IntentCircles 🔄

> Intent-matched, agent-managed, trust-gated savings circles on Celo

## What is IntentCircles?

IntentCircles brings **Anoma's intent architecture** to social finance on Celo. Instead of navigating complex DeFi UIs, users simply declare what they want — "I want to save $5/week with trusted people" — and an AI agent matches them into circles, manages contributions, optimizes yield, and handles disputes.

**The hybrid stack:**
- 🧠 **Anoma Intents** → Users declare desired outcomes, agent finds solutions
- 🤝 **Circles V2 Trust** → Sybil-resistant membership through social vouching
- 💰 **Breadchain ROSCAs** → Proven onchain savings circle mechanics
- 🌱 **Sarafu Commitments** → Community-driven financial inclusion
- 📱 **MiniPay** → 12.6M wallets in the Global South

## How It Works

```
1. Maria opens MiniPay and submits an intent:
   "I want to save 500 KES per week with ~10 people"

2. The IntentCircles agent scans for compatible intents
   and matches Maria with 9 other users who want similar circles

3. Agent deploys a SaveCircle contract, registers all members,
   and sets up the rotation schedule

4. Each week, the agent:
   - Collects contributions from members
   - Sweeps idle capital to Moola Market (~10% APY)
   - Rotates payout to the next member
   - Penalizes missed contributions (instead of killing the circle)

5. Maria's trust score grows with each successful cycle,
   unlocking access to larger circles and better rates
```

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  IntentCircles                    │
│                                                  │
│  User Intents → IntentRegistry → Agent Matcher   │
│                                      ↓           │
│  CircleTrust ← CircleFactory → SaveCircle        │
│  (membership    (deploys)      (ROSCA +          │
│   gating)                       yield)           │
│                                    ↓             │
│                              Moola Market        │
│                              (idle yield)        │
│                                                  │
│  ERC-8004 Agent ID    x402 Fee Collection        │
└─────────────────────────────────────────────────┘
```

## Smart Contracts

| Contract | Description |
|----------|-------------|
| `IntentRegistry.sol` | Onchain intent submission, matching, and fulfillment |
| `SaveCircle.sol` | ROSCA lifecycle with yield, penalties, and agent management |
| `CircleFactory.sol` | Deploys new circle instances from matched intents |
| `CircleTrust.sol` | Circles V2-style trust edges for sybil-resistant membership |
| `IMoolaLendingPool.sol` | Interface for Moola Market yield integration |

## Tech Stack

- **Contracts**: Solidity ^0.8.20, Foundry, OpenZeppelin
- **Agent**: TypeScript, Viem, Bun
- **Frontend**: React, Vite, wagmi, Tailwind CSS
- **Chain**: Celo (Alfajores testnet → mainnet)
- **Wallet**: MiniPay compatible (12.6M users)
- **Yield**: Moola Market (Aave V2 fork on Celo)

## Development

```bash
# Contracts
cd intent-circles
forge build
forge test

# Agent
cd agent
bun install
bun run src/index.ts

# Frontend
cd frontend
bun install
bun run dev
```

## Hackathon

- **Event**: Celo "Build Agents for the Real World" V2
- **Track**: Best Agent on Celo
- **Deadline**: March 18, 2026
- **Team**: AMANTU Cognitive Assemblage

## License

MIT
