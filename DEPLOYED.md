# Deployed Contracts - IntentCircles Trust System

**Network**: Celo Sepolia Testnet (Chain ID: 11142220)  
**RPC**: https://forno.celo-sepolia.celo-testnet.org  
**Build Date**: 2026-03-15  
**Status**: Ready for deployment testing

---

## Contract Addresses

### Core Trust System (NEW)

| Contract | Address | Notes |
|----------|---------|-------|
| **TrustTierManager** | TBD | Manages trust tiers (NEWCOMER, MEMBER, CREDITOR, ELDER) based on reputation scores |
| **CreditLine** | TBD | Agent-to-agent micro-credit system backed by reputation |
| **ERC8004Integration** | TBD | Bridge to official ERC-8004 Identity & Reputation Registries |

### Supporting Contracts

| Contract | Address | Notes |
|----------|---------|-------|
| **AgentRegistry8004** | TBD | ERC-721 based agent identity registry with feedback system |
| **MockcUSD** | TBD | Test cUSD token (testnet only) |

### External Dependencies

| Contract | Address | Notes |
|----------|---------|-------|
| **cUSD (Real)** | 0xEF4d55D6dE8e8d73232827Cd1e9b2F2dBb45bC80 | Celo testnet cUSD |

---

## Deployment Instructions

### Prerequisites
```bash
# Install dependencies
forge install
npm install

# Setup environment
cp .env.example .env
# Edit .env with your PRIVATE_KEY and deployer address
```

### Deploy to Celo Sepolia
```bash
# Build contracts
forge build

# Run all tests
forge test -vvv

# Deploy with legacy flag (required for Celo Sepolia)
forge script script/DeployTrustSystem.s.sol:DeployTrustSystem \
  --rpc-url https://forno.celo-sepolia.celo-testnet.org \
  --broadcast \
  --legacy \
  -vvv
```

### Post-Deployment
1. Update this file with actual contract addresses
2. Verify contracts on Celo Block Explorer
3. Register initial agents for testing
4. Create reputation data for tier testing

---

## Key Features

### Trust Tier System
- **NEWCOMER** (< 50% reputation): Join circles only
- **MEMBER** (50-79%): Earlier payout rotation, join medium circles
- **CREDITOR** (80-94%): Issue micro-credit lines
- **ELDER** (95+): Settle barter intents, cross-pool liquidity

### Credit Line Mechanics
- Maximum credit = `(score - 8000) * 1.5 + 500` cUSD
- Reputation-backed (no collateral required)
- Interest-bearing with configurable rates
- Default penalties reduce borrower reputation

### ERC-8004 Integration
- Official registry compatibility (when available on Celo)
- Mock registries for testnet development
- Identity and reputation registries
- Feedback posting and retrieval

---

## Test Coverage

### TrustTierManager Tests (22 tests)
- Tier calculation across all levels
- Capability checks (credit issuance, barter settlement)
- Maximum credit calculations
- Threshold configuration
- Edge case boundary testing

### CreditLine Tests (16 tests)
- Credit line issuance
- Drawing and repayment mechanics
- Authorization checks
- Default handling
- Query functions

### ERC8004Integration Tests (11 active tests)
- Agent registration
- Registry interactions
- Feedback posting
- Reputation retrieval
- Registry address updates

### AgentRegistry8004 Tests (32 tests - existing)
- Agent registration and NFT minting
- Reputation feedback
- Success/failure reporting
- Tag management

---

## Known Issues & TODOs

### Current Limitations
- [ ] ERC8004 multiple agent registration tests disabled (vm.prank investigation needed)
- [ ] Integration tests with full circle flow commented out (complex setup required)
- [ ] Official ERC-8004 contracts not yet available on Celo Sepolia (using mocks)

### Future Enhancements
- [ ] Upgradeable contract patterns (OpenZeppelin UUPS)
- [ ] Cross-chain reputation syncing
- [ ] Dynamic tier threshold adjustment based on network health
- [ ] Reputation decay for inactive agents
- [ ] Multi-signature governance for thresholds

---

## Security Checklist

- [x] ReentrancyGuard on token transfers
- [x] Access control on critical functions
- [x] Input validation on all external functions
- [x] Event logging for all state changes
- [ ] External audit (recommended before mainnet)
- [ ] Formal verification of reputation calculations

---

## Gas Estimates

| Operation | Gas | Notes |
|-----------|-----|-------|
| Register agent | ~280k | Includes NFT minting |
| Issue credit line | ~180k | Registry interactions |
| Draw credit | ~90k | Transfer + accounting |
| Repay credit | ~95k | Interest calculation |
| Get tier | ~25k | View function |

---

## Contact

For deployment support or integration questions:
- GitHub: nkyimu
- Email: nkyimu@users.noreply.github.com

---

**Last Updated**: 2026-03-15  
**Status**: Ready for testnet deployment
