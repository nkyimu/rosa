# IntentCircles — Ethskills Review

**Skills applied:** `building-blocks`, `concepts`, `security`
**Date:** 2026-03-09
**Reviewer:** Empa (applying ethskills framework)

---

## 1. Concepts Skill — "Nothing Is Automatic" Audit

The most important question: **for every state transition, who pokes it and why?**

### State Transitions Mapped

| Transition | Who Pokes | Why | Gas Covered? | ✅/⚠️/❌ |
|------------|-----------|-----|-------------|----------|
| `submitIntent()` | User | Save money | User pays | ✅ |
| `cancelIntent()` | User (creator only) | Changed mind | User pays | ✅ |
| `fulfillIntent()` | Agent | Earns x402 fees | Agent pays, recoups via fees | ✅ |
| `batchFulfill()` | Agent | Earns x402 fees | Agent pays, recoups via fees | ✅ |
| `join()` | User | Join a circle | User pays | ✅ |
| `startCircle()` | Agent | Circle ready, earn management fees | Agent pays | ✅ |
| `contribute()` | User (member) | Participate in ROSCA | User pays | ✅ |
| `claimRotation()` | User (member, their turn) | Get payout | User pays | ✅ |
| `penalize()` | Agent | Maintain circle health | Agent pays | ⚠️ Penalty goes to agent — good incentive |
| `sweepToYield()` | Agent | Earn yield share | Agent pays | ⚠️ No explicit agent yield share defined |
| `harvestYield()` | Agent | Compound yield | Agent pays | ⚠️ Same — agent pays gas but no explicit reward |
| `dissolve()` | Agent | Safety valve | Agent pays | ⚠️ Emergency only, no incentive needed |

### Issues Found

**⚠️ ISSUE 1: Agent has no explicit economic incentive for keeper tasks**
The agent calls `sweepToYield()`, `harvestYield()`, and `startCircle()` but there's no onchain fee mechanism. The agent pays gas for these operations with no contract-level compensation.

**Fix:** Add a keeper reward — agent takes X% of harvested yield as compensation. This is the Yearn pattern: "ANYONE can call harvest(), caller gets 1% of the harvest as reward."

```solidity
uint256 public constant KEEPER_FEE_BPS = 100; // 1% of yield to keeper/agent

function harvestYield() external onlyAgent ... {
    // ... harvest logic ...
    uint256 keeperFee = (yieldEarned * KEEPER_FEE_BPS) / 10_000;
    token.safeTransfer(agent, keeperFee);
    totalYieldGenerated += (yieldEarned - keeperFee);
}
```

**⚠️ ISSUE 2: `hasClaimedThisRound` naming is misleading**
The mapping `hasClaimedThisRound` is set in `contribute()`, not in `claimRotation()`. It's actually `hasContributedThisRound`. This will confuse auditors.

**⚠️ ISSUE 3: Rounds don't actually advance**
There's no mechanism to advance `currentRound`. The `claimRotation()` advances `rotationIndex` but `currentRound` stays at 1. The `hasClaimedThisRound` mapping is never reset between rounds.

**Fix:** Add a `advanceRound()` function or make round advancement part of `claimRotation()`:
```solidity
function claimRotation() external ... {
    // ... existing claim logic ...
    rotationIndex++;
    currentRound++;
    // Reset contribution tracking for next round
    for (uint256 i = 0; i < members.length; i++) {
        hasClaimedThisRound[members[i]] = false;
    }
}
```

---

## 2. Security Skill — Vulnerability Audit

### ✅ Good Practices Already Present
- ReentrancyGuard on all external functions with transfers
- SafeERC20 for all token operations
- Checks-effects-interactions pattern (mostly)
- Access control via `onlyAgent`, `onlyMember` modifiers
- State validation via `inState` modifier

### ❌ CRITICAL: Penalize function can steal from member wallet

```solidity
function penalize(address member) external onlyAgent ... {
    uint256 penalty = (contributionAmount * 10) / 100;
    // ❌ This calls transferFrom on the MEMBER's wallet
    token.safeTransferFrom(member, agent, penalty);
}
```

**Problem:** `safeTransferFrom(member, agent, penalty)` requires the member to have approved the contract. If they haven't, this reverts. If they HAVE approved (for contributions), the agent can drain their approval.

**Fix:** Penalties should come from the member's escrowed contributions inside the contract, NOT their wallet:

```solidity
function penalize(address member) external onlyAgent ... {
    uint256 penalty = (contributionAmount * 10) / 100;
    penaltyCount[member]++;
    // Deduct from their tracked contributions
    if (totalContributed[member] >= penalty) {
        totalContributed[member] -= penalty;
        // Agent takes the penalty from contract balance
        token.safeTransfer(agent, penalty);
    }
    emit MemberPenalized(member, penalty);
    if (penaltyCount[member] >= 3) _removeMember(member);
}
```

### ⚠️ HIGH: `_removeMember` breaks rotation ordering

When a member is removed via swap-and-pop, `memberIndex` and `rotationIndex` can become inconsistent:
- If removed member was BEFORE `rotationIndex`, a member gets skipped
- If removed member was AT `rotationIndex`, wrong member receives payout

**Fix:** Track rotation by address array order, handle removals explicitly:
```solidity
function _removeMember(address member) internal {
    uint256 idx = memberIndex[member];
    // If removed member hasn't had their turn yet, adjust rotation
    if (idx < rotationIndex) {
        rotationIndex--; // shift to account for removal
    }
    // ... rest of swap-and-pop
}
```

### ⚠️ MEDIUM: `dissolve()` dust loss

```solidity
uint256 perMember = balance / members.length;
// Remainder stuck in contract forever
```

After distributing `perMember * members.length`, the remainder (up to `members.length - 1` wei) is lost. For cUSD (6 decimals), this is negligible. But for 18-decimal tokens with small amounts, it could matter.

**Fix:** Send remainder to last member or to agent.

### ⚠️ MEDIUM: `approve()` before `deposit()` — use `forceApprove()`

```solidity
token.approve(yieldVault, amount);
```

Some tokens (USDT) require setting allowance to 0 before changing it. Use OZ's `forceApprove()`:
```solidity
token.forceApprove(yieldVault, amount);
```

### ⚠️ LOW: No `intentId` validation in `join()`

The `intentId` parameter in `join()` is never used or validated. It's decoration.

**Fix:** Either validate against IntentRegistry or remove the parameter:
```solidity
function join(address intentRegistry, uint256 intentId) external ... {
    // Verify the intent exists and is for this circle
    IIntentRegistry(intentRegistry).getIntent(intentId);
    // ...
}
```

### ⚠️ LOW: `getOpenIntents` is O(n²) gas bomb

The `getOpenIntents()` function iterates ALL historical intents of a type, including fulfilled/cancelled ones. After 1000 intents, this becomes expensive to call. Fine for hackathon, but won't scale.

---

## 3. Building Blocks Skill — Composability Review

### Moola Market Integration

**Current approach:** Direct deposit/withdraw to Moola's Aave V2 LendingPool. This is correct.

**Missing:** The `harvestYield()` function is confused about aTokens. It treats `yieldVault` as both the LendingPool AND the aToken, but they're different contracts:
- `LendingPool` = the pool you deposit to / withdraw from
- `aToken` = the interest-bearing receipt token you receive

**Fix:**
```solidity
address public lendingPool;   // Moola LendingPool
address public aToken;        // The aToken you receive for deposits

function sweepToYield(uint256 amount) external ... {
    token.forceApprove(lendingPool, amount);
    IMoolaLendingPool(lendingPool).deposit(tokenAddress, amount, address(this), 0);
}

function harvestYield() external ... {
    uint256 aBalance = IERC20(aToken).balanceOf(address(this));
    if (aBalance > 0) {
        IMoolaLendingPool(lendingPool).withdraw(tokenAddress, type(uint256).max, address(this));
    }
}
```

### Celo Fee Abstraction

**Missing opportunity:** Celo supports paying gas in cUSD (fee abstraction). Our contracts should work with this, and the frontend should set `feeCurrency` in transactions when inside MiniPay. This is a major UX win — users never need CELO tokens.

### x402 Integration

**Not yet implemented.** Needs:
1. Agent registers x402 payment endpoint
2. Each `fulfillIntent()` / `batchFulfill()` requires x402 payment header
3. Agent validates payment before executing

---

## Priority Fixes (Hackathon Scope)

| Priority | Fix | Effort |
|----------|-----|--------|
| **P0** | Fix `penalize()` — don't pull from member wallet | 30 min |
| **P0** | Fix `_removeMember` rotation ordering | 30 min |
| **P0** | Add round advancement logic | 1 hour |
| **P1** | Split `yieldVault` into `lendingPool` + `aToken` | 30 min |
| **P1** | Add keeper fee for agent yield harvesting | 30 min |
| **P1** | Rename `hasClaimedThisRound` → `hasContributedThisRound` | 5 min |
| **P2** | Use `forceApprove()` | 5 min |
| **P2** | Validate `intentId` in `join()` | 15 min |
| **P2** | Fix `dissolve()` dust | 10 min |

**Total estimated fix time: ~4 hours**

These fixes make the difference between "cool demo" and "could actually work onchain." For a hackathon, P0s are mandatory (judges will spot the penalize bug). P1s show sophistication. P2s if there's time.
