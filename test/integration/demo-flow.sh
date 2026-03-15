#!/bin/bash

##
# demo-flow.sh - Scripted demo of IntentCircles user journey
#
# Walks through the complete user experience:
# 1. Start agent server
# 2. User: "I want to save 50 cUSD monthly for 6 months"
# 3. User: "What's my trust score?"
# 4. User: "Show my circles"
# 5. User: (After circle completion) "Can I issue credit?"
# 6. User: "Issue 100 cUSD credit to 0x..."
# 7. User: "I want to offer coding lessons for music lessons"
# 8. Each step prints the agent's response and waits 2 seconds
#
# Usage: ./demo-flow.sh [--host localhost:3002] [--no-pause]
##

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
HOST="${1:-localhost:3002}"
API_BASE="http://$HOST/api"
PAUSE_TIME=2
NO_PAUSE=false

if [[ "$2" == "--no-pause" ]]; then
    PAUSE_TIME=0
    NO_PAUSE=true
fi

# Demo addresses
ALICE="0x1111111111111111111111111111111111111111"
BOB="0x2222222222222222222222222222222222222222"

# ═══════════════════════════════════════════════════════════════════════════
# Helper Functions
# ═══════════════════════════════════════════════════════════════════════════

print_banner() {
    clear
    echo -e "${BLUE}"
    cat << "EOF"
╔═════════════════════════════════════════════════════════════════╗
║                                                                 ║
║            IntentCircles Demo - User Journey Flow              ║
║                                                                 ║
║    A complete walkthrough of the savings + credit + barter     ║
║    system showing how agents coordinate peer-to-peer money     ║
║    without banks or gatekeeping.                              ║
║                                                                 ║
╚═════════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
}

print_step() {
    local num=$1
    local title=$2
    echo -e "\n${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}STEP $num: $title${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_user_input() {
    echo -e "\n${GREEN}User:${NC} $1"
}

print_agent_response() {
    echo -e "\n${BLUE}Agent:${NC} $1"
}

print_info() {
    echo -e "${CYAN}ℹ${NC} $1"
}

pause_for_effect() {
    if [ "$NO_PAUSE" = false ]; then
        sleep "$PAUSE_TIME"
    fi
}

call_api() {
    local method=$1
    local endpoint=$2
    local data=$3
    
    if [ "$method" = "GET" ]; then
        curl -s "${API_BASE}${endpoint}"
    else
        curl -s -X POST "${API_BASE}${endpoint}" \
            -H "Content-Type: application/json" \
            -d "$data"
    fi
}

extract_reply() {
    local response=$1
    echo "$response" | jq -r '.reply // .message // .error // "No response"' 2>/dev/null || echo "Agent response received"
}

# ═══════════════════════════════════════════════════════════════════════════
# Demo Steps
# ═══════════════════════════════════════════════════════════════════════════

step_0_startup() {
    print_banner
    
    echo -e "${YELLOW}Starting IntentCircles agent server...${NC}"
    echo ""
    
    print_info "Checking if agent is running at http://$HOST"
    
    if curl -s "http://$HOST/" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Agent server is running${NC}"
    else
        echo -e "${RED}✗ Agent server not found at http://$HOST${NC}"
        echo -e "${YELLOW}Please start the agent with: cd agent && bun run src/index.ts${NC}"
        echo ""
        read -p "Press Enter once the agent is running, or Ctrl+C to exit: "
    fi
    
    pause_for_effect
}

step_1_savings_circle() {
    print_step 1 "Create a Savings Circle"
    
    print_user_input "I want to save 50 cUSD monthly for 6 months"
    
    local response=$(call_api "POST" "/chat" '{"message":"I want to save 50 cUSD monthly for 6 months"}')
    local reply=$(extract_reply "$response")
    
    print_agent_response "$reply"
    print_info "Agent is searching for compatible savers..."
    print_info "Looking for 2-4 other members saving similar amounts"
    
    pause_for_effect
}

step_2_trust_score() {
    print_step 2 "Check Trust Score"
    
    print_user_input "What's my trust score?"
    
    local response=$(call_api "POST" "/chat" '{"message":"What is my trust score?"}')
    local reply=$(extract_reply "$response")
    
    print_agent_response "$reply"
    print_info "Trust Score: 0 (new agent)"
    print_info "Trust Tier: NEWCOMER (can join small circles)"
    
    pause_for_effect
}

step_3_show_circles() {
    print_step 3 "View Active Circles"
    
    print_user_input "Show my circles"
    
    local response=$(call_api "POST" "/chat" '{"message":"Show my circles"}')
    local reply=$(extract_reply "$response")
    
    print_agent_response "$reply"
    
    cat << "EOF"

Active Circles:
  Circle #1: Family Savings (3 members, 50 cUSD/month)
    Status: ACTIVE (Round 1 of 6)
    Members: You, Maria, José
    Next contribution due: 2026-03-16
    Your payout: Will receive 300 cUSD in Round 3

  Circle #2: Diaspora Pool (5 members, 80 cUSD/month)
    Status: FORMING (need 1 more member)
    Members: You, Amara, Kavi, Chen, [empty slot]
EOF
    
    print_info "You're in 2 circles. Complete them to build trust score."
    
    pause_for_effect
}

step_4_circle_completion() {
    print_step 4 "Simulate Circle Completion (Trust Building)"
    
    print_info "Simulating 6 months of on-time contributions..."
    print_info "  Round 1: You contribute 50 cUSD → Maria receives 300 cUSD payout ✓"
    print_info "  Round 2: You contribute 50 cUSD → José receives 300 cUSD payout ✓"
    print_info "  Round 3: You contribute 50 cUSD → You receive 300 cUSD payout ✓"
    print_info "  Round 4: You contribute 50 cUSD → [final member] receives payout ✓"
    print_info ""
    print_info "Circle #1: COMPLETED"
    print_info "  → You earned +15 reputation (circle completion)"
    print_info "  → Trust Tier upgraded: NEWCOMER → MEMBER (50 points)"
    
    pause_for_effect
}

step_5_can_issue_credit() {
    print_step 5 "Check Credit Issuance Eligibility"
    
    print_user_input "Can I issue credit?"
    
    local response=$(call_api "POST" "/chat" '{"message":"Can I issue credit?"}')
    local reply=$(extract_reply "$response")
    
    print_agent_response "$reply"
    print_info "Current Trust Score: 15 (MEMBER tier)"
    print_info "Credit issuance requires: 80+ reputation (CREDITOR tier)"
    print_info "Next milestone: Complete 2 more circles → earn +30 points → reach 80"
    
    pause_for_effect
}

step_6_issue_credit() {
    print_step 6 "Issue Micro-Credit"
    
    print_user_input "Issue 100 cUSD credit to $BOB"
    
    cat << EOF

Simulating credit issuance after reaching CREDITOR tier (80+ reputation)...

Credit Line Created:
  Issuer: You ($ALICE)
  Borrower: Bob ($BOB)
  Amount: 100 cUSD
  Duration: 8 weeks
  Interest: 0% (reputation-backed, no profit-seeking)
  Condition: Bob must complete a savings circle during the term

Status: OPEN
  → Awaiting Bob to join a circle and activate the credit
  → Once Bob joins, he'll receive 100 cUSD
  → Bob must repay 100 cUSD before week 8 ends
EOF
    
    print_info "Credit issued successfully!"
    
    pause_for_effect
}

step_7_barter_intent() {
    print_step 7 "Submit Barter Intent (High Trust)"
    
    print_info "Simulating trust score reaching ELITE tier (95+)..."
    print_info "You've now completed 8 circles, built strong community reputation."
    print_info ""
    
    print_user_input "I want to offer coding lessons for music lessons"
    
    local response=$(call_api "POST" "/chat" '{"message":"I want to offer coding lessons for music lessons"}')
    local reply=$(extract_reply "$response")
    
    print_agent_response "$reply"
    
    cat << "EOF"

Barter Intent Submitted:
  You offer: Coding lessons (40 hours)
  You seek: Music lessons (40 hours)
  Your reputation: 96 (ELITE tier - can settle barter)

Intent Status: OPEN
  → Agent is searching for matching ELITE agents
  → Found match: Amara (96 reputation)
    - Amara offers: Music lessons (40 hours)
    - Amara seeks: Coding help

Barter Settlement (Atomic, No Currency):
  ✓ You provide: 40 hours coding lessons → Amara
  ✓ Amara provides: 40 hours music lessons → You
  ✓ Both complete off-chain
  ✓ Both earn reputation for service completion
  ✓ No fees, no currency conversion, no gatekeeping
EOF
    
    print_info "Barter settled atomically! Both communities benefit."
    
    pause_for_effect
}

step_8_summary() {
    print_step 8 "Demo Summary"
    
    cat << "EOF"

What You Experienced:

✓ Peer-to-Peer Credit: Individuals issue credit to each other
  (not banks), backed by on-chain reputation.

✓ Portable Reputation: Your trust score follows you across
  circles and protocols. One credit system, many communities.

✓ Trust Tiers: As you show up (save, repay, complete circles),
  your capabilities unlock:
  - NEWCOMER (< 50): Join small circles
  - MEMBER (50-80): Join medium circles
  - CREDITOR (80-95): Issue micro-credit to others
  - ELITE (95+): Settle intents via barter (no money needed)

✓ Barter for High-Trust: When reputation is high enough,
  economic activity doesn't need currency — pure peer exchange.

✓ No Bank: No KYC, no gatekeeping, no fees extracted by middlemen.
  The community holds its own credit system on-chain.

EOF
    
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}Demo Complete!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    echo ""
    echo "To record this as a demo video, run:"
    echo "  $ demo-video record --app Safari --url http://localhost:3000 --duration 30"
    echo ""
}

# ═══════════════════════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════════════════════

main() {
    step_0_startup
    step_1_savings_circle
    step_2_trust_score
    step_3_show_circles
    step_4_circle_completion
    step_5_can_issue_credit
    step_6_issue_credit
    step_7_barter_intent
    step_8_summary
}

# Run the demo
main
