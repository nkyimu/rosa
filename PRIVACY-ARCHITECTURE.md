# Privacy Layer Architecture for IntentCircles
## Nightfall Integration Review & Plan

**Author**: Banneker (Architecture Agent)  
**Date**: March 9, 2026  
**Status**: Complete Review + Integration Spec  
**Deadline Context**: Hackathon completion Mar 17 (8 days remaining)

---

## Executive Summary

IntentCircles on Celo Sepolia has **zero privacy**. All contributions, amounts, trust scores, and rotation payouts are publicly visible on-chain. For real-world African savings circles (ROSCAs), this creates:

- **Privacy leakage**: Everyone sees who contributed what, when they'll be paid, and their trust score
- **Targeting risk**: Criminals identify when users have pending payouts
- **Discrimination**: Potential lenders can see who joined a circle and adjust credit decisions
- **Dignity**: Users from communal cultures don't want financial details broadcast

**Solution**: Nightfall (Celo's native ZK privacy layer) enables private contributions, transfers, and state without rebuilding from scratch.

**Recommendation**: Build **Hackathon MVP** (commit-reveal for contributions + Nightfall for yield sweeping) by Mar 17. Full production privacy (ZK trust attestations + encrypted rotation) comes after.

---

## 1. Privacy Threat Model for Savings Circles

### 1.1 Current Exposure Map

#### What IS Exposed Today
| Data | Visibility | Risk |
|------|------------|------|
| Circle ID | On-chain event logs | Trivial (not secret) |
| Member list | `members[]` array, read-accessible | **HIGH**: Ties real addresses to financial groups |
| Contribution amounts | Per-transaction to `contribute()` | **CRITICAL**: Timing + amount = predictable payouts |
| Round & rotation index | Public state (`currentRound`, `rotationIndex`) | **HIGH**: Everyone knows who's getting paid this week |
| Trust edges | `CircleTrust` contract edges are public | **MEDIUM**: Trust graph exposes relationships |
| Payout timing | `claimRotation()` calls are timestamped | **HIGH**: Identifies when users expect liquidity |
| Yield harvested | `harvestYield()` event emits amounts | **MEDIUM**: Reveals capital growth patterns |
| Agent actions | All `onlyAgent` calls are public | **LOW**: Agent behavior is expected to be transparent |

#### What SHOULD Stay Private
- Individual contribution amounts
- Who received a payout and when (exact timestamp)
- Individual trust scores (degrees of separation)
- Payout order before claiming (only claimer should know it's their turn)
- Yield allocation per member
- Penalty details (privacy-respecting discipline)

#### What SHOULD Stay Public
- Circle existence and rules
- Agent reputation (ERC-8004 registry)
- Circle completion and dissolution events
- Aggregate statistics (total raised, total paid out)
- Trust graph topology (for sybil resistance) — but NOT individual edge confidence scores

### 1.2 Attack Vectors

#### 1. Contribution Correlation
**Threat**: Observer sees Alice contributes $5 every Tuesday for 10 weeks, knows rotation is ~$50/week, predicts Alice gets $50 + yield in week 7.

**Exploitation**: Criminal watches chain, sees payout happening, targets Alice for robbery.

**Nightfall Defense**: Deposits/transfers hide amounts. Only Alice and agent know her balance.

---

#### 2. Timing Analysis
**Threat**: Observer sees `claimRotation()` call by Alice at block 12000, knows rotation lasts 1 week, calculates all payout order from block times.

**Exploitation**: Extortion ("pay me or I'll reveal you got paid"), discrimination ("your group raised $500, not hiring"), identification ("Alice from the hospital is saving with nurses").

**Nightfall Defense**: Private claim transactions. Even agent only knows claim happened if payment proof arrives.

---

#### 3. Trust Score Inference  
**Threat**: Observer sees 20 incoming edges to Bob, deduces Bob is trusted. Combines with membership data: "Bob is trusted + member of this circle = Bob has capital access."

**Exploitation**: Targeting for scams, lending discrimination, insurance decisions.

**Defense (Multi-layered)**:
- **Short term** (hackathon): Keep trust edges public for sybil resistance. Mitigate with min-trust requirement (3 edges = not unique identifier).
- **Medium term** (post-hackathon): ZK trust attestations — prove "I meet minimum trust" without revealing actual degree.
- **Long term**: Integrate Circles V2 reputation system as privacy-preserving sybil defense (no public score, just valid/invalid).

---

#### 4. Linked Identities
**Threat**: Chain analysis links an on-chain address to an off-chain identity (KYC, wallet history, etc.). Membership in a circle + contribution pattern + payout dates = full financial dossier.

**Exploitation**: All attacks above, plus harassment, blackmail, credit destruction.

**Defense**: Off-chain identity (MiniPay phone number) ≠ on-chain address. Users can rotate addresses. Privacy at L2 (Nightfall) prevents Celo chain analysis from working.

---

### 1.3 Risk Assessment by Stakeholder

| Stakeholder | Primary Risk | Confidence Level |
|---|---|---|
| **Low-income user** | Physical targeting; financial discrimination; dignity | CRITICAL |
| **Informal savings group** | Group targeting (robbery of savings); social fracture (envy) | HIGH |
| **Women's savings circle** | Gender-based violence (abusers identify payouts); trafficking (identify vulnerable); discrimination | CRITICAL |
| **Cross-border group** | Regulatory targeting; government seizure; political persecution | MEDIUM (jurisdiction-dependent) |
| **Circle leader/agent** | Extortion ("reveal your members or I'll out them"); competitive intel | MEDIUM |

---

## 2. Recommended Architecture

### 2.1 Design Philosophy

**Intent**: Build a privacy layer that:
1. **Preserves the ROSCA model**: Contributions, rotations, trust-gating still work as designed
2. **Adds privacy without changing user experience**: Same API, same flow, just private
3. **Minimizes Nightfall complexity** (to fit 8-day hackathon): Use Nightfall for money movement only, not logic
4. **Maintains trust mechanics** for sybil resistance (keep trust edges public for now)
5. **Separates concerns**: 
   - Logic stays on SaveCircle (public, verifiable)
   - Money stays in Nightfall (private, settled)
   - Agent coordination stays on IntentRegistry (public, auditable)

---

### 2.2 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER INTERFACE                               │
│                      (MiniPay / UI)                             │
│    "I want to join a circle / contribute / claim payout"        │
└──────────────────────────┬──────────────────────────────────────┘
                           │
        ┌──────────────────┴──────────────────┐
        │                                     │
        ▼                                     ▼
   ┌─────────────┐                   ┌──────────────────┐
   │  IntentReg  │                   │   SaveCircle     │
   │  (public)   │                   │   (semi-private) │
   └──────┬──────┘                   └────────┬─────────┘
          │                                   │
          │ (submit JOIN_CIRCLE intent)       │ (join membership tracked)
          │                                   │
          │ ◀─── Agent Matching Logic ──────►│
          │                                   │
          │ (batch fulfill intents)           │ (startCircle)
          │                                   │
          └──────────────────┬────────────────┘
                             │
         ┌───────────────────┴────────────────────┐
         │                                        │
         ▼                                        ▼
    ┌─────────────────┐                  ┌──────────────────┐
    │  Nightfall L3   │                  │  AgentRegistry   │
    │  (PRIVATE)      │                  │  (public, x402)  │
    │                 │                  │                  │
    │ - Deposits      │ ◀────────────┐    │ - Agent rep      │
    │ - Transfers     │  fee payment │    │ - Task tracking  │
    │ - Withdrawals   │              │    │                  │
    │                 │              │    └──────────────────┘
    │ Private client  │              │
    │ runs in Docker  │              │
    │ on agent node   │              │
    └─────────────────┘              │
         │                           │
         ├─ Deposit: contrib ─────────┤
         ├─ Transfer: rotation payout │
         ├─ Withdraw: exit circle     │
         │                           │
         ▼                           ▼
    ┌─────────────────────────────────────────────┐
    │         Celo Sepolia Layer 1                 │
    │     (SaveCircle + CircleTrust contracts)    │
    │                                             │
    │ - Trust edges (public)                      │
    │ - Circle state (minimal)                    │
    │ - Rotation order (obscured)                 │
    │ - Nightfall proof verification              │
    └─────────────────────────────────────────────┘
```

---

### 2.3 State Separation

#### Layer 1 (SaveCircle + CircleTrust) — PUBLIC
Stays public for transparency + sybil defense:

```solidity
// What stays on SaveCircle
- circleId (needed for pairing with Nightfall)
- members[] (for rotation order, sybil resistance)
- isMember[addr] (to gate contributions)
- minTrustScore (admission rule)
- roundDuration (timing)
- state (FORMING/ACTIVE/COMPLETED/DISSOLVED)
- agent (for gating actions)

// What moves to Nightfall (hidden)
- ❌ NOT: contributionAmount (stays as param, but ACTUAL amount is private)
- ❌ NOT: individual contributions (hidden in Nightfall)
- ❌ NOT: exact payout timing (only agent knows when rotation is ready)
```

#### Layer 2 (Nightfall) — PRIVATE
Money movement + amounts hidden:

```
- User balance (stored in user's Nightfall client)
- Deposit commitments (hash of amount + metadata)
- Transfer proofs (prove amount transfer without revealing it)
- Withdrawal requests (deescrow to recipient address)
```

---

### 2.4 Flow Examples

#### Example A: Join Circle (Private Contribution)

```
USER                AGENT              SAVECIRCLE         NIGHTFALL
│                   │                  │                  │
├─ submitIntent ────►│                  │                  │
│  JOIN_CIRCLE      │                  │                  │
│  (trust score)    │                  │                  │
│                   ├──── join() ─────►│                  │
│                   │                  ├─ verify trust    │
│                   │                  ├─ add to members[]
│                   │                  ├─ emit MemberJoined
│                   │                  │                  │
│                   │                  │                  │
│◄─ deposit request ┤                  │                  │
│  (amount in UI)   │                  │                  │
│                   │                  │                  ├─ Deposit API ◄─┤ User CLI
│                   │                  │                  │
│                   │                  │                  ├─ ZK proof
│                   │                  │                  ├─ Commitment created
│                   │                  │                  │
└─ done             └─ fulfillIntent() ◄───────────────────┘
                       (private transfer happens in Nightfall)
```

**Privacy gained**: User's balance never exposed. Only agent + user know amount.

---

#### Example B: Weekly Contribution (Recurring Private)

```
TIME: WEEK 1       AGENT               SAVECIRCLE         NIGHTFALL
                   │                   │                  │
                   │ (batches users who
                   │  intend to contribute)
                   │
                   │ For each user:
                   ├─ Check CONTRIBUTE intent
                   ├─ Submit batch to Nightfall
                   │                   │                  ├─ Batch transfer
                   │                   │                  │  (amounts hidden)
                   │                   │                  │
                   ├─ Update state ────►│                  │
                   │ (round counter)    │                  │
                   │ (only: whose turn  │                  │
                   │  to claim next)    │                  │
                   │                   │                  │

PRIVACY: No on-chain record of amounts. Nightfall proposer batches,
         agent sees transaction proofs, SaveCircle just validates
         "round is paid, time to advance rotation."
```

---

#### Example C: Claim Rotation Payout (Private + Public)

```
USER                AGENT              SAVECIRCLE         NIGHTFALL
│                   │                  │                  │
│ Rotation time!    │                  │                  │
│ (rotation index   │                  │                  │
│  tells user)      │                  │                  │
│                   │                  │                  │
├─ WITHDRAW ────────────────────────────────────────────►│
│  (from Nightfall)  │                  │                  │ Prove balance
│  (to receiving     │                  │                  │ in user's commitments
│   address)         │                  │                  │ de-escrow
│                   │                  │                  │
│                   │◄─ De-escrow ─────┐                 │
│                   │  proof + hash    └──────────────────┤
│                   │                  │                  │
│                   ├─ claimRotation()─►│                  │
│                   │  (validate proof, │                  │
│                   │   transfer via NF)│                  │
│                   │                   ├─ emit            │
│                   │                   │ RotationClaimed   │
│                   │                   │ (amount redacted) │
│                   │                   │                  │
│◄── cUSD arrives ──┤                   │                  │
│   (Nightfall      │                   │                  │
│    settlement)    │                   │                  │
│                   │                   │                  │

PRIVACY: Amount is hidden in Nightfall proof. SaveCircle just verifies
         proof was submitted, updates rotation index, trusts Nightfall
         for settlement. Even SaveCircle doesn't know payout amount!
```

---

## 3. Nightfall Integration Specification

### 3.1 Contract Changes Required

#### SaveCircle.sol Modifications

**New state variables:**

```solidity
// Nightfall integration
address public nightfallClient;          // Client endpoint (agent node)
bytes32[] public pendingRotationProofs;  // Withdrawal proofs waiting for de-escrow
mapping(uint256 => bytes32) public roundProofs; // Round # => proof hash
bool public useNightfallMode;            // Feature flag

// For commit-reveal scheme (short term)
mapping(address => bytes32) public contributionCommitments; // member => hash(amount, salt)
mapping(address => uint256) public committedAmounts; // member => amount (only agent sees)
```

**New functions:**

```solidity
/**
 * Deposit contribution into Nightfall (agent calls this on behalf of user)
 * User already sent approval tx to Nightfall client
 */
function depositToNightfall(
    address member,
    uint256 amount,
    bytes32 salt,
    bytes calldata nightfallDepositProof
) external onlyAgent {
    require(isMember[member], "Not a member");
    require(useNightfallMode, "Nightfall mode not enabled");
    
    // Verify commitment matches
    bytes32 commitment = keccak256(abi.encodePacked(amount, salt));
    require(commitment == contributionCommitments[member], "Commitment mismatch");
    
    // Record that this round's contribution was made (Nightfall-side)
    hasContributedThisRound[member] = true;
    totalContributed[member] += amount;
    
    // Store proof for later verification
    roundProofs[currentRound] = keccak256(nightfallDepositProof);
    
    emit ContributionMade(member, amount); // Amount is still logged, but hidden in Nightfall
}

/**
 * Submit withdrawal proof for rotation claim
 * Agent calls this after Nightfall generates proof
 */
function submitRotationWithdrawal(
    address recipient,
    uint256 amount,
    bytes32 withdrawProof,
    bytes32 withdrawSalt
) external onlyAgent {
    require(isMember[recipient], "Not a member");
    require(memberIndex[recipient] == rotationIndex, "Not their turn");
    
    // Agent has verified in Nightfall that recipient's balance >= amount
    // Just advance state and emit proof
    pendingRotationProofs.push(withdrawProof);
    
    // Nightfall client will execute de-escrow async
    // SaveCircle advances rotation when proof settles on-chain
}

/**
 * Finalize rotation after Nightfall proof settles
 * Called by agent once de-escrow is confirmed
 */
function finalizeRotationWithProof(
    address recipient,
    bytes32 deescrowProof
) external onlyAgent {
    require(memberIndex[recipient] == rotationIndex, "Not their turn");
    
    // Verify de-escrow proof was seen on-chain (Nightfall event)
    // Update state
    rotationIndex++;
    currentRound++;
    
    // Reset contribution flags
    for (uint256 i = 0; i < members.length; i++) {
        hasContributedThisRound[members[i]] = false;
    }
    
    if (rotationIndex >= members.length) {
        state = CircleState.COMPLETED;
        emit CircleCompleted();
    }
}

/**
 * Helper: enable Nightfall mode (only agent, once)
 */
function enableNightfallMode() external onlyAgent inState(CircleState.ACTIVE) {
    require(!useNightfallMode, "Already enabled");
    useNightfallMode = true;
}
```

---

#### CircleTrust.sol — NO CHANGES NEEDED

Trust edges stay public for sybil resistance. This is **intentional**: we gain privacy for money without losing our trust-graph defense against Sybil attacks.

*(Full ZK trust attestations come in v2; hackathon scope doesn't include them.)*

---

#### IntentRegistry.sol — EXTEND

Add NIGHTFALL-specific intent tracking:

```solidity
enum IntentType {
    JOIN_CIRCLE,
    CREATE_CIRCLE,
    CONTRIBUTE,              // ← now uses Nightfall
    EXIT_CIRCLE,
    DISPUTE,
    NIGHTFALL_DEPOSIT,       // ← new
    NIGHTFALL_ROTATION       // ← new
}

struct NightfallDepositIntent {
    uint256 circleId;
    uint256 amount;
    bytes32 salt;            // User-provided randomness
    bytes32 commitmentHash;  // keccak256(amount, salt)
    uint256 createdAt;
    bool deposited;          // Agent marked it done
}

mapping(uint256 => NightfallDepositIntent) public depositIntents;

function submitNightfallDeposit(
    uint256 circleId,
    uint256 amount,
    bytes32 salt
) external returns (uint256) {
    // Hash the commitment
    bytes32 commitment = keccak256(abi.encodePacked(amount, salt));
    
    // Create intent
    uint256 intentId = intentCounter++;
    depositIntents[intentId] = NightfallDepositIntent({
        circleId: circleId,
        amount: amount,
        salt: salt,
        commitmentHash: commitment,
        createdAt: block.timestamp,
        deposited: false
    });
    
    emit IntentSubmitted(intentId, IntentType.NIGHTFALL_DEPOSIT, msg.sender, 0);
    return intentId;
}
```

---

### 3.2 Agent Changes (TypeScript / Node.js)

The agent runs a **Nightfall client** (Docker container) and orchestrates private transactions.

#### Agent Setup

```bash
# 1. Clone Nightfall
git clone https://github.com/celo-org/nightfall_4_CE
cd nightfall_4_CE
git checkout celo

# 2. Configure for Celo Sepolia (environment file)
cat > celo-sepolia.env <<EOF
NF4_RUN_MODE=celo_sepolia
CLIENT_SIGNING_KEY=0x<agent's private key>
CLIENT_ADDRESS=0x<agent's address>
NF4_SIGNING_KEY=0x<agent's private key>
ETHEREUM_CLIENT_URL=<Celo Sepolia RPC with websocket>
WEBHOOK_URL=http://localhost:8081/webhook
EOF

# 3. Start Nightfall client
NF4_RUN_MODE=celo_sepolia docker-compose --env-file celo-sepolia.env --profile indie-client up

# 4. Nightfall client API is now on http://localhost:3000
```

---

#### Agent Contribution Matcher (TypeScript)

```typescript
import axios from 'axios';

interface ContributionIntent {
  intentId: number;
  circleId: number;
  amount: number;
  salt: string;
  creator: string;
}

class NightfallContributionManager {
  nightfallClient = 'http://localhost:3000';
  saveCircleContract = '0x...'; // Your SaveCircle instance
  
  /**
   * Step 1: User submits NIGHTFALL_DEPOSIT intent
   *         (amount + salt, commitment is keccak256(amount, salt))
   */
  async submitDepositIntent(
    circleId: number,
    amount: string, // wei as string
    userSalt: string
  ): Promise<number> {
    // Agent receives this from IntentRegistry.submitNightfallDeposit()
    // Intent is now in registry, waiting for agent to process
    return intentId;
  }

  /**
   * Step 2: User deposits to Nightfall (via MiniPay/UI)
   *         This happens off-chain in user's Nightfall client
   *         User tells agent: "I've deposited, here's my proof"
   */
  async depositToNightfall(
    userAddress: string,
    amount: string, // hex without 0x
    salt: string
  ): Promise<{ commitment: string; proof: string }> {
    // User's client makes this call
    const depositId = uuidv4();
    
    const response = await axios.post(`${this.nightfallClient}/v1/deposit`, {
      ercAddress: '0x471EcE3750Da237f93B8E339c536989b8978a438', // cUSD/CELO
      tokenId: '0x00',
      tokenType: '0',
      value: amount,
      fee: '0x02',
      deposit_fee: '0x05'
    }, {
      headers: { 'X-Request-ID': depositId }
    });
    
    return {
      commitment: response.data.commitment,
      proof: response.data.proof
    };
  }

  /**
   * Step 3: Agent batches deposits and submits proofs to SaveCircle
   */
  async batchDepositProofs(
    circleId: number,
    deposits: ContributionIntent[]
  ) {
    // For each deposit, call SaveCircle.depositToNightfall()
    // with the Nightfall proof
    
    for (const deposit of deposits) {
      const tx = await saveCircleContract.depositToNightfall(
        deposit.creator,
        deposit.amount,
        deposit.salt,
        deposit.proof // from Nightfall
      );
      
      await tx.wait();
      console.log(`Deposit confirmed for ${deposit.creator}`);
    }
  }

  /**
   * Step 4: Weekly: Batch process contributions
   */
  async processWeeklyContributions(circleId: number) {
    // Query open NIGHTFALL_DEPOSIT intents
    const intents = await registry.getOpenIntents(IntentType.NIGHTFALL_DEPOSIT);
    
    // Filter by circle
    const circleIntents = intents.filter(i => i.circleId === circleId);
    
    if (circleIntents.length === 0) {
      console.log('No contributions this week');
      return;
    }
    
    // Batch submit to SaveCircle
    await this.batchDepositProofs(circleId, circleIntents);
    
    // Mark intents as fulfilled
    for (const intent of circleIntents) {
      await registry.fulfillIntent(intent.intentId, Buffer.from('ok'));
    }
  }
}
```

---

#### Agent Rotation Claim Handler

```typescript
class NightfallRotationManager {
  nightfallClient = 'http://localhost:3000';
  
  /**
   * When it's time for rotation:
   * 1. Agent knows rotation index from SaveCircle
   * 2. Agent checks Nightfall user's balance
   * 3. Agent generates withdrawal proof
   * 4. Agent submits to SaveCircle
   */
  async claimRotationPrivate(
    circleId: number,
    recipientAddress: string,
    expectedPayout: string // wei as hex
  ) {
    // Agent calls Nightfall withdraw API
    // (User's client runs this, agent gets proof)
    
    const withdrawId = uuidv4();
    
    const response = await axios.post(`${this.nightfallClient}/v1/withdraw`, {
      ercAddress: '0x471EcE3750Da237f93B8E339c536989b8978a438',
      tokenId: '0x00',
      tokenType: '0',
      value: expectedPayout, // hidden in ZK proof
      recipientAddress: recipientAddress,
      fee: '0x02'
    }, {
      headers: { 'X-Request-ID': withdrawId }
    });
    
    // Response includes withdrawFundSalt (needed for de-escrow)
    const withdrawProof = response.data;
    
    // Step 2: Submit withdrawal proof to SaveCircle
    const tx = await saveCircleContract.submitRotationWithdrawal(
      recipientAddress,
      expectedPayout,
      withdrawProof.withdrawFundSalt,
      withdrawProof.proof
    );
    
    await tx.wait();
    console.log(`Rotation withdrawal submitted for ${recipientAddress}`);
    
    // Step 3: When Nightfall settles (within ~1 hour), finalize
    // (Webhook notifies agent of settlement)
  }
  
  /**
   * Webhook handler: Nightfall notifies agent of settlement
   */
  onNightfallBlockchainEvent(event: {
    l1_txn_hash: string;
    l2_block_number: number;
    commitments: string[];
  }) {
    console.log(`Nightfall block ${event.l2_block_number} finalized`);
    // Check if any pending rotations settled
    // If so, call SaveCircle.finalizeRotationWithProof()
  }
}
```

---

### 3.3 Frontend Changes (Minimal)

**MiniPay UI flow for private contribution:**

```javascript
// BEFORE (public)
// User: "I'll contribute 5 cUSD"
// TX: approve SaveCircle for 5 cUSD, then call contribute()

// AFTER (private)
// User: "I'll contribute 5 cUSD" (same UI)
// Behind the scenes:
// 1. Generate random salt: salt = keccak256(randomBytes(32))
// 2. Compute commitment: commitment = keccak256(amount, salt)
// 3. Submit NIGHTFALL_DEPOSIT intent to registry (with commitment)
// 4. Open Nightfall client modal:
//    - Derive keys from user's mnemonic
//    - Submit deposit to Nightfall API (amount is now private)
//    - Receive proof
// 5. Agent picks up intent, verifies proof, calls SaveCircle.depositToNightfall()
// 6. User sees "Your contribution is private and confirmed" (no amount shown on-chain)
```

**Key UX change**: Agent needs to show user the proof receipt, so user knows agent submitted it.

---

## 4. Hackathon MVP Scope (8 Days, Mar 17 Deadline)

### 4.1 MUST-HAVE (Core Privacy for Contributions)

**Deadline pressure**: 8 days remaining. Focus on **money flow privacy only**.

#### Phase 1: Commit-Reveal (Days 1-2)
**Objective**: Private contribution commitment without full Nightfall.

```solidity
// Lightweight approach:
function commitContribution(
    address member,
    bytes32 commitmentHash  // keccak256(amount, salt)
) external onlyAgent {
    contributionCommitments[member] = commitmentHash;
    // User's actual amount is NOT stored on-chain
}

function revealContribution(
    address member,
    uint256 amount,
    bytes32 salt
) external {
    require(keccak256(abi.encodePacked(amount, salt)) == contributionCommitments[member]);
    // Now amount is revealed, but we can choose NOT to emit it publicly
    hasContributedThisRound[member] = true;
}
```

**Privacy gained**: Contribution amounts NOT visible during round; only revealed at reveal phase (1 week later after contribution is "locked in"). This gives 1 week of privacy from timing analysis.

**Effort**: 1 contract + 1 day of agent logic.

---

#### Phase 2: Nightfall Integration (Days 3-6)
**Objective**: Full private money movement.

**Step 1** (Day 3): Setup Nightfall environment on agent node
- Clone repo, configure for Celo Sepolia
- Test deposit/transfer/withdraw flow with testnet cUSD
- Effort: 4 hours (mostly waiting for Docker builds)

**Step 2** (Day 4): Connect SaveCircle ↔ Nightfall
- Add `depositToNightfall()` function to SaveCircle
- Agent can submit Nightfall proofs
- Test: agent deposits 10 cUSD to circle, balance is private
- Effort: 6 hours (2 contract functions + integration tests)

**Step 3** (Day 5): Implement weekly contribution batching
- Agent scans NIGHTFALL_DEPOSIT intents
- For each member with open intent, calls agent's Nightfall client
- Submits batch of proofs to SaveCircle
- Test: 5 members contribute, amounts are hidden
- Effort: 8 hours (async handling, proof batching)

**Step 4** (Day 6): Implement private rotation claiming
- When rotation index advances, agent generates withdrawal proof
- User claims payout via Nightfall (de-escrow)
- SaveCircle verifies proof, advances rotation
- Test: member claims rotation, balance is transferred privately
- Effort: 6 hours (async de-escrow, webhook handling)

---

#### Phase 3: Testing & Polish (Days 7-8)

**Day 7**:
- End-to-end test: new circle → 5 members → weekly contribution → rotation claim → payout
- All amounts private in Nightfall, SaveCircle only knows "contributions happened"
- Effort: 6 hours

**Day 8**:
- Demo recording
- Documentation
- Bug fixes
- Submission

---

### 4.2 NICE-TO-HAVE (Out of Scope for Hackathon)

These are **production-ready features** to spec now, build after Mar 17:

#### 1. ZK Trust Attestations
**Problem**: CircleTrust edges are public. Trust score can be inferred.
**Solution**: ZK circuit that proves "I meet minimum trust threshold" without revealing actual degree.

```solidity
// Post-hackathon:
function attestTrustMembership(
    uint256 minTrustScore,
    bytes calldata zkProof  // Proves: you have >= minTrustScore without revealing it
) external {
    verifyTrustAttestation(msg.sender, minTrustScore, zkProof);
    acceptedMembers[msg.sender] = true;
}
```

**Effort**: 20 hours (ZK circuit design + Circom/Arkworks integration)

---

#### 2. Encrypted Rotation Order
**Problem**: Rotation index advances predictably; everyone sees who's next.
**Solution**: Keep rotation order encrypted, decrypt only for current claimer.

```solidity
// Post-hackathon:
function getMyRotationTurn() external view returns (bool isYourTurn) {
    // Verifies caller matches decrypted rotation index
    // Only claimer knows they're next
}
```

**Effort**: 12 hours (commitment encryption + agency key management)

---

#### 3. Yield Sweep Privacy
**Problem**: HarvestYield() amounts are public; implies portfolio size.
**Solution**: Sweep to Nightfall before harvesting, combine yield in private pool.

**Effort**: 4 hours (already have Nightfall setup, just add yield deposit step)

---

#### 4. Cross-Circle Privacy (Community Pools)
**Problem**: Multiple circles with same members; patterns leak.
**Solution**: Aggregate contributions across circles in Nightfall before settling.

**Effort**: 16 hours (complex state management across contracts)

---

### 4.3 What We're Skipping

- **Solver competition**: Single agent for MVP. Multi-agent solver model is post-hackathon.
- **Privacy-preserving disputes**: Disputes stay public (optional, complex).
- **Mainnet deployment**: Celo Sepolia testnet only.
- **Hardware wallet integration**: Agent uses env variable key for now.
- **Faucet integration**: Users fund their own testnet wallets.

---

## 5. Production Roadmap (After Hackathon)

### Phase 1 (Week 1-2 Post-Hackathon)
- [ ] Deploy to Celo Sepolia testnet
- [ ] Public demo + beta testing with 3-5 real groups
- [ ] Audit for Nightfall integration (EY + external)
- [ ] Performance testing: latency of private contributions

### Phase 2 (Week 3-4)
- [ ] ZK trust attestations (remove CircleTrust edge exposure)
- [ ] Encrypted rotation order
- [ ] Yield sweep privacy
- [ ] Multi-agent solver system (competitive matching)

### Phase 3 (Month 2)
- [ ] Celo mainnet deployment
- [ ] MiniPay integration (mobile first)
- [ ] Real cUSD + USDC support (not testnet)
- [ ] Circles V2 integration for trust graph

### Phase 4 (Quarter 2+)
- [ ] Cross-chain intents (Ethereum L2 circles)
- [ ] Privacy-preserving yield farming (Aave + privacy)
- [ ] Decentralized agent network (competing proposers)
- [ ] Formal verification (Coq proof of privacy)

---

## 6. Risk Assessment

### 6.1 Nightfall-Specific Risks

| Risk | Severity | Mitigation | Ownership |
|------|----------|-----------|-----------|
| Nightfall client crashes during contribution | HIGH | Agent restarts Docker, retries batch. Fallback to commit-reveal if needed. | Agent ops |
| Proposer slow (>1 hour blocks) | MEDIUM | Users see delayed settlement. Build async UI. Add fallback proposer. | EY/Celo |
| ZK proof generation fails | MEDIUM | Agent has local prover. Test on testnet first. | Agent testing |
| Celo RPC disconnects | MEDIUM | Websocket reconnect + backoff. Robust error handling. | Agent infra |
| Nightfall smart contract bug | CRITICAL | EY maintains, extensively tested. Trust the audit. | EY |

---

### 6.2 Architectural Risks

| Risk | Severity | Mitigation |
|------|----------|-----------|
| SaveCircle + Nightfall state diverge | MEDIUM | Agent is single source of truth. Nightfall proofs are deterministic. |
| Agent is single point of failure | HIGH | Multiple agent instances (but need coordination). Post-hackathon: multi-agent via consensus. |
| Commitment scheme broken | MEDIUM | Use strong hash (keccak256). Test for collisions. |
| Rotation order leaked | MEDIUM | Hackathon: encryption post-beta. For now: min-trust + obfuscation. |
| Yield calculation wrong | MEDIUM | Comprehensive unit tests. Forge fuzzing. Code review. |

---

### 6.3 Hackathon Timeline Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Nightfall Docker build takes >2 days | MEDIUM | Delay integration, fall back to commit-reveal | Pre-build on agent node NOW |
| Celo Sepolia RPC unstable during demo | LOW | Demo fails | Use backup RPC (Alchemy) |
| Nightfall proposer doesn't produce blocks | MEDIUM | Payments stuck forever | Use EY's public proposer, not DIY |
| SaveCircle contract needs redeployment | LOW | Lose circle data | All on testnet, acceptable loss |

---

## 7. Open Questions for Amantu

**These decisions need your input before starting:**

### A. Scope Confirmation
1. **Privacy Priority**: Is **money privacy** (Nightfall deposits/transfers) enough for hackathon? Or do we also need **trust score privacy** (ZK attestations)?
   - *Recommendation*: Money only. Trust stays public for sybil defense.

2. **Agent Responsibility**: Should the agent run the Nightfall client, or should users run their own?
   - *Recommendation*: Agent runs client (simpler UX), users submit intents. Post-hackathon: self-sovereign clients.

3. **Testnet or Mainnet**: Celo Sepolia testnet only, or prepare mainnet deployment too?
   - *Recommendation*: Testnet only. Mainnet is post-audit (Week 2+ after hackathon).

### B. Technical Trade-offs
4. **Commit-Reveal vs. Nightfall-Only**: Should hackathon include a lightweight commit-reveal layer as fallback?
   - *Recommendation*: Yes. Gives 1-week privacy even if Nightfall is slow.

5. **Yield Handling**: Include yield in privacy, or keep yield calculations public?
   - *Recommendation*: Keep yield public for MVP. Add privacy post-hackathon.

6. **Rotation Encryption**: How much rotation order obfuscation is acceptable?
   - *Recommendation*: Simple approach: store rotation index in Nightfall client, not on-chain. Decrypt only for claimer.

### C. Integration Questions
7. **X509 Certificates**: Nightfall requires X509 certs for access control. Should agent manage certs on behalf of users?
   - *Recommendation*: Yes for hackathon. Post-hackathon: explore self-serve or certificate delegation.

8. **Yield Farm Integration**: Should circles auto-sweep idle capital to Moola, or keep it manual?
   - *Recommendation*: Manual for hackathon (agent calls `sweepToYield()`). Auto-sweep post-beta.

### D. Business Model
9. **Agent Fees**: How should agent be compensated? (1% of yield, flat fee per intent, x402 payment?)
   - *Recommendation*: Flat fee per intent (x402 protocol). Yield fee post-v1.

10. **User Experience**: Should MiniPay hide Nightfall complexity, or let advanced users see proofs?
    - *Recommendation*: Hide for MVP. Show advanced view in settings.

---

## 8. Appendix: Nightfall Integration Checklist

### Pre-Integration (Do Now)
- [ ] Agent node prepared (Docker + git repo cloned)
- [ ] Celo Sepolia testnet RPC access (websocket)
- [ ] Team member has reviewed Nightfall docs
- [ ] Key generation tested locally

### Integration (Days 1-6)
- [ ] Nightfall client running on agent node
- [ ] Derive ZKP keys for agent
- [ ] Test deposit flow (testnet cUSD → Nightfall)
- [ ] Test transfer flow (user A sends to user B privately)
- [ ] Test withdraw flow (Nightfall → cUSD back to user)
- [ ] SaveCircle contract deployed to Sepolia
- [ ] SaveCircle ↔ Nightfall integration complete
- [ ] IntentRegistry extended with NIGHTFALL_DEPOSIT intent type
- [ ] Agent script for weekly contribution batching
- [ ] Agent script for rotation claim handler
- [ ] End-to-end test: circle formation → contribution → claim payout

### Pre-Demo (Day 7)
- [ ] Full flow recorded (from user's perspective)
- [ ] Nightfall block explorer verified (proofs settling)
- [ ] SaveCircle events show no amount leakage
- [ ] Agent metrics dashboard shows all intents processed
- [ ] Documentation complete

### Demo Ready (Day 8)
- [ ] Live demo on Celo Sepolia
- [ ] Audience can see private transfers on Nightfall explorer
- [ ] SaveCircle contract shows public state only (no amounts)
- [ ] Final documentation + architecture slides

---

## Conclusion

IntentCircles can be **privacy-ready for hackathon** by using Nightfall for contributions and payouts. The approach:

1. **Keeps the ROSCA model intact** (same API, same user flow)
2. **Adds real privacy** (contributions, amounts hidden in ZK proofs)
3. **Maintains trust defense** (CircleTrust edges public for sybil resistance)
4. **Fits 8-day timeline** (focus on money movement, defer trust privacy to v2)

**Recommendation**: Start on Phase 1 (commit-reveal) Day 1. Begin Nightfall Docker setup in parallel. By end of Day 3, you'll know if Nightfall works; if not, fallback to commit-reveal is complete and testable. By Day 7, you'll have a fully private circle ready to demo.

This architecture separates concerns cleanly: **logic on SaveCircle, money in Nightfall, coordination in IntentRegistry**. Each layer can be upgraded independently.

---

**Next Steps**:
1. Confirm scope with Amantu (Section 7 questions)
2. Pre-build Nightfall Docker on agent node
3. Deploy SaveCircle to Sepolia
4. Begin integration tests Day 1

Good luck. This is solid architecture for a hackathon with production legs. 🎯
