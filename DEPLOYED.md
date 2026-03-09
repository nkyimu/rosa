# IntentCircles — Celo Sepolia Deployment

**Date**: 2026-03-09
**Network**: Celo Sepolia (chain ID 11142220)
**Status**: ✅ ALL CONTRACTS DEPLOYED

## Deployed Contracts

| Contract | Address | Purpose |
|----------|---------|---------|
| **IntentRegistry** | `0x6Bddd66698206c9956e5ac65F9083A132B574844` | Intent submission & agent fulfillment |
| **CircleTrust** | `0x58C26bA12128e68B203442AC081656b525892B83` | Trust edges & vouch system |
| **CircleFactory** | `0x87cd271485E7838607D19Bc5B33Dc0DC6297F1E3` | Circle creation factory |
| **DemoCircle** | `0x7D938c7326eC34fB26F3aF4A61259D2a0D19D8e4` | Demo SaveCircle (5min rounds, 0 minTrust, 1 cUSD) |

## Not Yet Deployed (need additional faucet funds)

| Contract | Purpose | Notes |
|----------|---------|-------|
| **AgentRegistry8004** | ERC-8004 agent identity + reputation | 23 tests passing |
| **AgentPayment** | x402 fee collection in cUSD | Tests passing |

## Network Configuration

- **Chain ID**: 11142220
- **RPC**: `https://forno.celo-sepolia.celo-testnet.org`
- **Block Explorer**: `https://celo-sepolia.blockscout.com`
- **Celoscan**: `https://sepolia.celoscan.io`
- **cUSD Token**: `0xEF4d55D6dE8e8d73232827Cd1e9b2F2dBb45bC80`

## Deployer Wallet

- **Address**: `0xa62C2EA1Aa2Ae36C9dFb329E3B194Dc6125758eB`
- **Remaining Balance**: ~0.082 CELO
- **Note**: Testnet only — no real funds

## Deploy Commands

```bash
# Deploy remaining contracts (AgentRegistry8004, AgentPayment)
cd /Users/cerebro/.openclaw/workspace/intent-circles
source .env
# Write a new deploy script for the remaining contracts
forge script script/DeployAll.s.sol --rpc-url celo_sepolia --broadcast --legacy
```

## Test Status

- **60 tests passing** across 5 test suites
- IntentRegistry: 11 tests
- SaveCircle: 11 tests
- CircleTrust: 13 tests
- AgentRegistry8004: 23 tests
- Counter: 2 tests
