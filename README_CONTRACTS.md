# IntentCircles — Smart Contract Foundation

Intent-matched, agent-managed, trust-gated savings circles (ROSCAs) for the Celo blockchain.

## Project Overview

IntentCircles is a suite of smart contracts implementing a decentralized Rotating Savings and Credit Association (ROSCA) system enhanced with:
- **Intent Registry**: Onchain intent submission and fulfillment by agents
- **Trust-Gated Access**: Membership based on Circles V2 trust edges
- **Yield Integration**: Integration with Moola Market for passive income generation
- **Penalty Mechanism**: Agent-managed penalties for missed contributions
- **State Machine**: Rigorous lifecycle management (FORMING → ACTIVE → COMPLETED/DISSOLVED)

## Contracts

### 1. IntentRegistry.sol
Manages intent submission and fulfillment. Users express intents (JOIN_CIRCLE, CREATE_CIRCLE, CONTRIBUTE, EXIT_CIRCLE, DISPUTE), and registered agents fulfill them.

**Key Functions:**
- `submitIntent(IntentType, bytes params, uint256 expiresAt)` — Submit an intent
- `cancelIntent(uint256 intentId)` — Cancel your own intent
- `fulfillIntent(uint256 intentId, bytes solution)` — Agent fulfills intent
- `batchFulfill(uint256[] intentIds, bytes compositeSolution)` — Compose multiple intents
- `getOpenIntents(IntentType)` — Query open intents by type

### 2. CircleTrust.sol
Simplified Circles V2 trust edges on Celo. Tracks directional trust relationships with expiry.

**Key Functions:**
- `trust(address trustee, uint96 expiresAt)` — Establish/update trust
- `revokeTrust(address trustee)` — Remove trust
- `isTrusted(address truster, address trustee)` — Check if trust is valid
- `trustScore(address user)` — Get incoming trust count
- `meetsMinTrust(address user, uint256 minScore)` — Verify minimum trust threshold

### 3. SaveCircle.sol
Core ROSCA contract with yield integration, penalties, and trust-gated access.

**State Machine:** FORMING → ACTIVE → COMPLETED (or DISSOLVED)

**Key Functions:**
- `join(uint256 intentId)` — Join circle (trust-gated)
- `startCircle()` — Transition from FORMING to ACTIVE
- `contribute()` — Deposit for current round
- `claimRotation()` — Claim payout on your turn
- `penalize(address member)` — Agent penalties (3 penalties = ejection)
- `sweepToYield(uint256 amount)` — Move idle capital to Moola
- `harvestYield()` — Harvest and compound yield
- `dissolve()` — Emergency exit with proportional fund distribution

### 4. CircleFactory.sol
Factory for deploying new SaveCircle instances with consistent configuration.

**Key Functions:**
- `createCircle(agent, trustContract, yieldVault, minTrustScore, roundDuration)` — Deploy new circle
- `getCircle(uint256 circleId)` — Get circle address
- `getCircleCount()` — Total circles created
- `getAllCircles()` — List all circles

### 5. IMoolaLendingPool.sol (Interface)
Interface for Moola Market (Aave V2 fork on Celo).

## Security Features

- **ReentrancyGuard** on all external functions with token transfers
- **SafeERC20** for safe token operations
- **Checks-Effects-Interactions** pattern throughout
- **Access control** via agent roles and member status
- **State validation** via modifiers
- **Trust-gated access** prevents Sybil attacks

## Testing

**37 tests across 4 suites:**

| Suite | Tests | Status |
|-------|-------|--------|
| IntentRegistryTest | 11 | ✅ All Pass |
| CircleTrustTest | 13 | ✅ All Pass |
| SaveCircleTest | 11 | ✅ All Pass |
| CounterTest | 2 | ✅ All Pass |

Run tests with:
```bash
forge test
```

## Deployment

### Prerequisites
- Foundry installed (`curl -L https://foundry.paradigm.xyz | bash`)
- Solidity ^0.8.20

### Build
```bash
forge build
```

### Deploy to Celo
```bash
forge script script/Deploy.s.sol:Deploy --rpc-url https://forno.celo.org
```

## Configuration

### Celo Addresses
- **cUSD (Alfajores)**: `0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1`
- **Moola Market LendingPool**: Verify via Celo docs
- **Chain IDs**: 42220 (mainnet), 44787 (Alfajores testnet)

## Project Structure

```
intent-circles/
├── src/
│   ├── IntentRegistry.sol
│   ├── CircleTrust.sol
│   ├── SaveCircle.sol
│   ├── CircleFactory.sol
│   └── interfaces/
│       └── IMoolaLendingPool.sol
├── test/
│   ├── IntentRegistry.t.sol
│   ├── CircleTrust.t.sol
│   ├── SaveCircle.t.sol
│   └── Counter.t.sol
├── remappings.txt
└── README.md
```

## Key Design Decisions

1. **Trust as Access Control**: Uses Circles V2 trust edges instead of complex reputation systems
2. **Agent-Managed**: Agents coordinate yield sweeps, penalties, and circle lifecycle
3. **Composable Intents**: Agents can fulfill multiple intents atomically (batch operations)
4. **Expirable Intents**: Intents have optional expiry to prevent stale requests
5. **Flexible Penalty System**: Penalties accumulate; 3 strikes and member is ejected
6. **Yield Integration Hooks**: Simple interface to Moola for maximum composability

## Next Steps

- [ ] Deploy to Celo Alfajores testnet
- [ ] Integrate with agent backend for intent matching
- [ ] Add factory initialization with default trust contracts
- [ ] Implement governance for configurable parameters
- [ ] Add emergency pause mechanisms
- [ ] Comprehensive integration tests with real Moola Market

## License

MIT
