# ROSA Demo Video Script — 3 minutes

## Setup Before Recording
1. Agent running on localhost:3002 (verify: `curl localhost:3002/api/status/system`)
2. Frontend running on localhost:5173
3. Wallet connected with cUSD balance
4. Open Celoscan Sepolia for tx verification

## Script

### Opening (0:00 - 0:20)
**[Screen: ROSA connect screen — mobile viewport 390px]**

> "This is ROSA — an autonomous agent that runs private savings circles on Celo. Two billion people use savings circles, but they all depend on one person to keep things running. ROSA replaces that person with code."

**[Click "Connect Wallet" → connected state]**

### Intent Submission (0:20 - 0:50)
**[Navigate to Save tab]**

> "You don't join a circle directly. You tell ROSA what you want to save — amount, frequency, group size — and it finds compatible people."

**[Fill in: 100 cUSD, weekly, 5 members → Submit]**

> "That intent goes on-chain. Your contribution amount is committed with a hash — other members can't see how much you're saving."

**[Show Celoscan tx confirmation]**

### Agent Matching (0:50 - 1:20)
**[Navigate to ROSA tab — agent chat]**

> "ROSA scans for compatible intents every 30 seconds. When it finds a match, it deploys a SaveCircle contract automatically."

**[Show agent log output — matcher scanning, finding match]**

> "No human decided who goes in which circle. The agent matched on parameters — amount, cycle length, group size — and deployed the contract itself."

**[Show Celoscan: CircleFactory.createCircle tx]**

### Circle Lifecycle (1:20 - 2:00)
**[Navigate to Circles tab]**

> "Here's a circle that completed its full lifecycle. Five members, weekly rotation, 100 cUSD each."

**[Show CircleDashboard with active circle — progress bar, rotation info]**

> "Each round, members contribute. The agent enforces deadlines — miss a payment, you get penalized. No coordinator chasing you down."

**[Show contribution tx on Celoscan]**

> "When the round completes, one member gets the full pool. The agent advances the rotation automatically."

**[Show payout tx: 0xF9Cc36a52ff067A92180D48d782bf9684A87A12A]**

### Trust & Privacy (2:00 - 2:30)
**[Navigate to Trust tab]**

> "Every completed round builds your trust score across three dimensions — reliability, credit, community. This score is portable. Take it to any circle."

**[Show TrustPanel with 3D trust visualization]**

> "And your contribution amounts stay private. The contract uses commit-reveal — you commit a hash of your amount, only revealing it when the round closes."

### Closing (2:30 - 3:00)
**[Back to connect screen or agent chat]**

> "ROSA runs on Celo — fast, cheap, mobile-first. Every circle is a smart contract. Every payout is on-chain. Every trust score is verifiable. No coordinator. No bank. Just code that keeps its promises."

**[Show: nkyimu/rosa GitHub, agent.json, deployed contract addresses scrolling]**

> "Built for The Synthesis. ROSA — private savings circles, managed by an autonomous agent."

## Key Transactions to Show
- Intent submission: `0x406afa82...` (Intent 1)
- Circle deployment: `0x1EE54Ec1...` (auto-deployed)
- Full lifecycle circle: `0xF9Cc36a52ff067A92180D48d782bf9684A87A12A`
- Batch fulfill: `0x04792f0b...`

## Technical Notes
- Record at 1920x1080, crop to mobile viewport for key shots
- Show terminal/logs split-screen for agent activity
- Celoscan links for on-chain verification
- Keep pacing steady — judges skim videos
