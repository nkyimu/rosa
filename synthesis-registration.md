# ROSA — Synthesis Hackathon Registration Plan

## Target Tracks (by prize value, descending)

### Primary Tracks
| Track | Company | Prize | UUID | Fit |
|-------|---------|-------|------|-----|
| **Synthesis Open Track** | Community | $28,134 | `fdb76d08812b43f6a5f454744b66f590` | Universal — all projects eligible |
| **Private Agents, Trusted Actions** | Venice | $11,500 (1K VVV) | `ea3b366947c54689bd82ae80bf9f3310` | STRONG — ZK privacy for savings circles, private contribution amounts |
| **Best Agent on Celo** | Celo | $5,000 | `ff26ab4933c84eea856a5c6bf513370b` | STRONG — deployed on Celo Sepolia, cUSD, MiniPay compatible |
| **Agent Services on Base** | Base | $5,000 | `6f0e3d7dcadf4ef080d3f424963caff5` | MODERATE — x402 payments for agent services (not on Base though) |
| **Agents With Receipts — ERC-8004** | Protocol Labs | $4,000 | `3bf41be958da497bbb69f1a150c76af9` | STRONG — agent registered via ERC-8004, on-chain identity |
| **Let the Agent Cook** | Protocol Labs | $4,000 | `10bd47fac07e4f85bda33ba482695b24` | STRONG — autonomous agent managing circles without human intervention |

### Secondary Tracks
| Track | Company | Prize | UUID | Fit |
|-------|---------|-------|------|-----|
| **Best Use of Locus** | Locus | $3,000 | `f50e31188e2641bc93764e7a6f26b0f6` | MODERATE — could integrate Locus wallet |
| **Escrow Ecosystem Extensions** | Arkhai | $450 | `88e91d848daf4d1bb0d40dec0074f59e` | MODERATE — savings circles are escrow-like |

### Recommended Track Selection (max 10)
1. `fdb76d08812b43f6a5f454744b66f590` — Synthesis Open Track ($28K)
2. `ea3b366947c54689bd82ae80bf9f3310` — Private Agents, Trusted Actions / Venice ($11.5K)
3. `ff26ab4933c84eea856a5c6bf513370b` — Best Agent on Celo ($5K)
4. `3bf41be958da497bbb69f1a150c76af9` — Agents With Receipts / ERC-8004 ($4K)
5. `10bd47fac07e4f85bda33ba482695b24` — Let the Agent Cook ($4K)

**Total addressable prize pool: ~$52,634**

## Registration Payload (pre-filled)

### Step 1: /register/init
```json
{
  "name": "ROSA",
  "description": "Autonomous agent that creates and manages private savings circles (ROSCAs) on Celo. ROSA matches compatible savers via intent-based grouping, deploys SaveCircle contracts, enforces contributions with penalties, rotates payouts, and hides contribution amounts via ZK commit-reveal. No human coordinator needed — the agent handles everything from circle formation to payout distribution.",
  "agentHarness": "openclaw",
  "model": "claude-sonnet-4-6",
  "humanInfo": {
    "name": "<<<NEED FROM AMANTU>>>",
    "email": "<<<NEED FROM AMANTU>>>",
    "socialMediaHandle": "@blu3dot",
    "background": "builder",
    "cryptoExperience": "yes",
    "aiAgentExperience": "yes",
    "codingComfort": 9,
    "problemToSolve": "Traditional savings circles (ROSCAs, susus, tandas) depend on a human coordinator who carries all the risk — chasing late payments, managing trust, handling payouts. When the coordinator fails, the whole circle collapses. ROSA replaces that single point of failure with an autonomous agent that enforces rules on-chain, keeps contribution amounts private, and builds portable trust scores so good savers can access credit without a bank."
  }
}
```

### Step 2: Verification
- **Option A (fastest):** Email OTP — Amantu checks email for 6-digit code
- **Option B:** Twitter — Amantu tweets a verification code from @blu3dot

### Step 3: /register/complete
Returns `apiKey` (save immediately) + `participantId` + `teamId`

### Step 4: Project submission (after registration)
```json
{
  "teamUUID": "<<<FROM REGISTRATION>>>",
  "name": "ROSA — Private Savings Circles",
  "description": "An autonomous agent that runs savings circles (ROSCAs) on Celo — the same financial practice that 1 billion+ people already use informally worldwide. You tell ROSA what you want to save. It finds compatible members, deploys the circle contract, collects contributions, enforces penalties for missed payments, and rotates payouts. No human coordinator. No PayPal taking 3%. No account freezes.\n\n197 passing tests. 6 contracts on Celo Sepolia. A matcher that scans every 30 seconds. A keeper that advances rounds every 60 seconds. Full ROSCA lifecycle verified on-chain — contributions, payout rotation, round advancement. Venice TEE integration for private agent cognition. ERC-8004 agent identity. MiniPay compatible for Celo's 2.5M mobile wallets.\n\nROSCAs aren't new — susus, tandas, stokvels have existed for centuries. PayPal Pools and Cash App just started copying them while adding fees and surveillance. ROSA gives the practice back to the communities that created it: private, sovereign, zero-fee, agent-managed.",
  "problemStatement": "Savings circles work on trust. One person coordinates — collects money, tracks who paid, decides payout order, chases deadlines. When that person moves, gets busy, or disappears, everyone loses their money. There's no record, no enforcement, no recourse. PayPal and Cash App saw this and built Pool features — but they charge fees, freeze accounts (31% of Venmo complaints involve frozen funds), and surveil every transaction. A billion people use savings circles. None of them have a good digital option.\n\nROSA replaces the coordinator with an autonomous agent. Smart contracts enforce the rules. Contributions are private. Trust scores are portable across circles. The agent runs 24/7 — it doesn't forget, it doesn't play favorites, and it can't freeze your money.",
  "repoURL": "https://github.com/nkyimu/rosa",
  "trackUUIDs": [
    "fdb76d08812b43f6a5f454744b66f590",
    "ea3b366947c54689bd82ae80bf9f3310",
    "ff26ab4933c84eea856a5c6bf513370b",
    "3bf41be958da497bbb69f1a150c76af9",
    "10bd47fac07e4f85bda33ba482695b24"
  ],
  "conversationLog": "<<<GENERATE FROM SESSION HISTORY>>>",
  "submissionMetadata": {
    "agentFramework": "other",
    "agentFrameworkOther": "Custom Bun/TypeScript agent with viem for Celo Sepolia, x402 HTTP payment layer",
    "agentHarness": "openclaw",
    "model": "claude-sonnet-4-6",
    "skills": ["ethskills", "interface-design", "anti-slop", "github"],
    "tools": ["Foundry", "viem", "wagmi", "Bun", "Vite", "React", "Celo Sepolia"],
    "helpfulResources": [
      "https://docs.celo.org/developer",
      "https://viem.sh/docs",
      "https://eips.ethereum.org/EIPS/eip-8004",
      "https://synthesis.md/skill.md"
    ],
    "helpfulSkills": [
      { "name": "ethskills", "reason": "Critical for Solidity patterns, security checks, and Celo L2 deployment specifics including --legacy flag requirement" },
      { "name": "interface-design", "reason": "Design token system architecture — 7-tier interchangeable tokens that made the postcard aesthetic consistent across 11 components" },
      { "name": "anti-slop", "reason": "README quality gate scored 4.2/5 — caught weak differentiation claims and tightened proof density" }
    ],
    "intention": "continuing",
    "intentionNotes": "ROSA is part of the broader AMANTU project — building sovereign coordination tools. Post-hackathon: mainnet deployment on Celo, Moola Market yield integration, mobile app via MiniPay, and governance module for community-managed circles."
  },
  "deployedURL": null,
  "videoURL": "<<<RECORD SUNDAY>>>",
  "pictures": null,
  "coverImageURL": null
}
```

## Blockers
- [ ] Amantu's full name (for humanInfo.name)
- [ ] Amantu's email (for humanInfo.email)  
- [ ] Verification (email OTP or tweet)
- [ ] Video URL (record Sunday)
- [ ] Conversation log (generate from session history)
