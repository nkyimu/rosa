# IntentCircles Hackathon Demo (3 min)

## Overview
IntentCircles is an intent-centric protocol for coordinating digital ROSCAs (rotating savings and credit associations) on Celo. This demo shows how a keeper agent autonomously manages savings circles while members submit intents.

---

## Demo Flow

### 1. **Setup** (30s)
- Open the frontend: `npm run dev` → http://localhost:5173
- Network: Celo Sepolia (testnet)
- Show live activity feed (agent activity visible)
- Keeper agent is running in background (see logs in terminal)

### 2. **Create Intent** (45s)
- Click "Submit Intent" button
- Fill form:
  - **Amount:** 10 cUSD
  - **Frequency:** Weekly
  - **Duration:** 8 weeks (full circle)
- Submit intent
- Show: Intent appears in the "Pending Intents" feed
- Show: Intent registry contract call in explorer (Blockscout)

### 3. **Join Circle** (45s)
- Click "Browse Circles" or "Active Circles"
- Show a circle that formed from intents
  - **Members:** 5 (matched by amount/frequency)
  - **Total Pot:** 50 cUSD
  - **Next Payout:** 7 days
  - **Status:** Active (keeper is running)
- Click "Join" button
- Transaction confirmed: Member added to circle

### 4. **Keeper Automation** (45s)
- Show keeper agent running in terminal logs:
  ```
  [keeper] Maintaining 3 circle(s)...
  [keeper] ✓ Processed circle 0x7d938...
  ```
- Keeper tasks it performs:
  1. **Check missed contributions** → Penalize if round deadline passed
  2. **Advance round** → Rotate to next member for payout
  3. **Sweep idle capital** → Move unused cUSD to Moola yield vault
  4. **Harvest yield** → Collect generated interest
- Show: Circle status updates in real-time (contribution received, round rotated)

### 5. **Settlement** (15s)
- Show completed circle:
  - **Status:** Complete (8 rotations done)
  - **Participants:** 5 members each received 50 cUSD payout
  - **Yield Generated:** 2.3 cUSD (distributed to members)
- Highlight: No central counterparty, fully decentralized coordination

---

## Key Takeaways

✅ **Intent-Centric Coordination**  
Members express intents (save 10 cUSD weekly). Protocol matches and executes automatically.

✅ **Keeper Agent**  
Autonomous background agent manages lifecycle: penalties, rotations, yield harvesting.

✅ **Privacy-Preserving**  
Uses Nightfall for zero-knowledge proofs (on-chain privacy without exposing amounts).

✅ **Yield Optimization**  
Idle funds earn interest in Moola protocol — members benefit from surplus.

---

## Technical Stack

- **Contracts:** Solidity (Foundry) on Celo Sepolia
- **Frontend:** React + Wagmi + Viem (Web3 UX)
- **Agent:** Node.js + Viem (autonomous keeper)
- **Privacy:** Nightfall (ZK proofs for confidential transfers)

---

## Contract Addresses (Celo Sepolia)

| Contract | Address |
|----------|---------|
| CircleFactory | `0x87cd271485e7838607d19bc5b33dc0dc6297f1e3` |
| CircleTrust | `0x58c26ba12128e68b203442ac081656b525892b83` |
| Demo Circle | `0x7d938c7326ec34fb26f3af4a61259d2a0d19d8e4` |
| IntentRegistry | `0x6Bddd66698206c9956e5ac65F9083A132B574844` |

---

## How to Run Keeper Locally

```bash
cd /Users/cerebro/.openclaw/workspace/intent-circles/agent
npm install
AGENT_PRIVATE_KEY=<your-pk> npm run keeper
```

Keeper will poll circles every 30 seconds and execute all maintenance tasks.

---

_Delivered for Celo V2 Hackathon — March 2026_
