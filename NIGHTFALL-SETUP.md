# Nightfall Setup Report

**Date**: 2026-03-09
**Status**: ✅ Client Running + Keys Derived

## Docker Setup
- **Repo**: `/Users/cerebro/.openclaw/workspace/intent-circles/nightfall/` (cloned from `celo-org/nightfall_4_CE`, branch `celo`)
- **Build time**: ~3 minutes (pre-built images)
- **Port**: 3001 (remapped from 3000 to avoid vite conflict)
- **Containers**: `nf4_indie_client` (healthy) + `nf4_db_client` (MongoDB, healthy)

## Configuration
- `NF4_RUN_MODE=celo_sepolia`
- Client signing key: deployer key
- Client address: `0xa62C2EA1Aa2Ae36C9dFb329E3B194Dc6125758eB`

## Test Results

### Health Check ✅
```
curl http://localhost:3001/v1/health → "Healthy"
```

### Key Derivation ✅
```json
{
  "root_key": "103c34dc...",
  "nullifier_key": "2f34cd70...",
  "zkp_private_key": "01be2210...",
  "zkp_public_key": "ad4af641..."
}
```

### Deposit Test
- Pending: need cUSD on deployer address first (have CELO but need to swap for cUSD via Mento)

## Agent Integration
- Module: `agent/src/nightfall.ts`
- Client URL: `http://localhost:3001`
- Webhook URL: `http://localhost:8081/webhook`

## Known Issues
- Azure vault warnings in logs (harmless, proposer config not needed for indie-client)
- Port 3000 was in use by vite dev server, remapped to 3001
- Need cUSD to test deposit flow (swap CELO → cUSD via Mento)

## Next Steps
- [ ] Get cUSD on deployer (swap via Mento or faucet)
- [ ] Test deposit flow
- [ ] Test transfer flow  
- [ ] Test withdrawal flow
- [ ] Wire agent keeper to call Nightfall APIs
