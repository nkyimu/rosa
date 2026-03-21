#!/bin/bash
# ROSA — One-command push to nkyimu/rosa
# Run this from the intent-circles directory after authenticating as nkyimu
#
# Prerequisites:
#   gh auth login  (authenticate as nkyimu)
#
# Usage:
#   bash PUSH-TO-GITHUB.sh

set -e

echo "🔒 ROSA — Push to GitHub (nkyimu/rosa)"
echo ""

# Step 1: Create the repo
echo "1/3 Creating nkyimu/rosa on GitHub..."
gh repo create nkyimu/rosa --public \
  --description "ROSA — Private savings circles managed by an autonomous agent on Celo. Synthesis Hackathon 2026." \
  --homepage "https://synthesis.md" || echo "Repo may already exist"

# Step 2: Push
echo ""
echo "2/3 Pushing to nkyimu/rosa..."
git push -u origin main

# Step 3: Verify
echo ""
echo "3/3 Verifying..."
gh repo view nkyimu/rosa --json url,description
echo ""
echo "✅ Done! Repo live at: https://github.com/nkyimu/rosa"
echo ""
echo "Next steps:"
echo "  1. Register on synthesis.md API"
echo "  2. Record demo video"
echo "  3. Create agent.json"
