#!/usr/bin/env bash
# deploy-celo.sh — Deploy IntentCircles Trust System to Celo Sepolia
# Usage: PRIVATE_KEY=0x... ./deploy-celo.sh
# Or:    add PRIVATE_KEY to .env, then ./deploy-celo.sh
#
# After deploy: automatically captures contract addresses into DEPLOYED.md

set -euo pipefail

# Load .env
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

# Validate private key
if [ -z "${PRIVATE_KEY:-}" ]; then
  echo "❌ PRIVATE_KEY not set."
  echo "   Either: export PRIVATE_KEY=0x..."
  echo "   Or:     add PRIVATE_KEY=0x... to .env"
  exit 1
fi

RPC_URL="${RPC_URL:-https://forno.celo-sepolia.celo-testnet.org}"

echo "🚀 Deploying IntentCircles Trust System to Celo Sepolia..."
echo "   Deployer: ${DEPLOYER:-unknown}"
echo "   RPC: $RPC_URL"
echo ""

# Build first
forge build --quiet

# Run deployment, capture output
DEPLOY_OUTPUT=$(forge script script/DeployTrustSystem.s.sol:DeployTrustSystem \
  --rpc-url "$RPC_URL" \
  --broadcast \
  --legacy \
  -vvv 2>&1 | tee /dev/stderr)

# Extract contract addresses from forge output
AGENT_REGISTRY=$(echo "$DEPLOY_OUTPUT"   | grep -E "AgentRegistry8004 deployed at:" | awk '{print $NF}' | head -1)
TRUST_TIER=$(echo "$DEPLOY_OUTPUT"       | grep -E "TrustTierManager deployed at:"  | awk '{print $NF}' | head -1)
CREDIT_LINE=$(echo "$DEPLOY_OUTPUT"      | grep -E "CreditLine deployed at:"        | awk '{print $NF}' | head -1)
ERC8004=$(echo "$DEPLOY_OUTPUT"          | grep -E "ERC8004Integration deployed at:"| awk '{print $NF}' | head -1)
IDENTITY_REG=$(echo "$DEPLOY_OUTPUT"     | grep -E "MockERC8004IdentityRegistry"    | awk '{print $NF}' | head -1)
REPUTATION_REG=$(echo "$DEPLOY_OUTPUT"   | grep -E "MockERC8004ReputationRegistry"  | awk '{print $NF}' | head -1)

DEPLOY_DATE=$(date -u +"%Y-%m-%d %H:%M UTC")

if [ -z "$AGENT_REGISTRY" ]; then
  echo ""
  echo "⚠️  Could not auto-parse contract addresses. Check forge output above."
  echo "   Manually update DEPLOYED.md with the addresses printed in the summary."
  exit 1
fi

echo ""
echo "✅ Deployment successful!"
echo ""
echo "   AgentRegistry8004:         $AGENT_REGISTRY"
echo "   TrustTierManager:          $TRUST_TIER"
echo "   CreditLine:                $CREDIT_LINE"
echo "   ERC8004Integration:        $ERC8004"
echo "   MockIdentityRegistry:      $IDENTITY_REG"
echo "   MockReputationRegistry:    $REPUTATION_REG"

# Update DEPLOYED.md
sed -i '' \
  -e "s|TBD.*Manages trust tiers|$TRUST_TIER | Manages trust tiers|" \
  -e "s|TBD.*Agent-to-agent micro-credit|$CREDIT_LINE | Agent-to-agent micro-credit|" \
  -e "s|TBD.*Bridge to official ERC-8004|$ERC8004 | Bridge to official ERC-8004|" \
  -e "s|TBD.*ERC-721 based agent identity|$AGENT_REGISTRY | ERC-721 based agent identity|" \
  -e "s|TBD.*Test cUSD token|0xB3567F61d19506A023ae7216a27848B13e5c331B | Test cUSD token|" \
  DEPLOYED.md 2>/dev/null || true

# Also update the header with deploy date and status
sed -i '' \
  -e "s|**Build Date**: .*|**Build Date**: $DEPLOY_DATE|" \
  -e "s|**Status**: Ready for deployment testing|**Status**: ✅ DEPLOYED — $DEPLOY_DATE|" \
  DEPLOYED.md 2>/dev/null || true

echo ""
echo "📄 DEPLOYED.md updated with contract addresses."
echo ""
echo "🎯 Next steps:"
echo "   1. git add DEPLOYED.md && git commit -m 'deploy: Trust System to Celo Sepolia $DEPLOY_DATE'"
echo "   2. git push origin HEAD"
echo "   3. Update frontend wagmi.ts with contract addresses"
echo "   4. Register agent: GUARDIAN_PRIVATE_KEY=... npm run register-erc8004"
echo ""
echo "🏆 Celo track (\$5K): contracts are now deployed — submit via Synthesis registration"
