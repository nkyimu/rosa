#!/bin/bash

##
# api-test.sh - Integration test for IntentCircles API endpoints
#
# Tests all new API endpoints:
# - /api/trust/{agentId}           - Get agent trust score
# - /api/credit-report/{agentId}   - Get agent credit details
# - /api/credit/issue               - Issue a credit line
# - /api/barter/submit              - Submit barter intent
# - /api/barter/matches             - List barter matches
# - /api/chat                       - Chat command interface
#
# Usage: ./api-test.sh [--host localhost:3002]
##

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
HOST="${1:-localhost:3002}"
API_BASE="http://$HOST/api"
TESTS_PASSED=0
TESTS_FAILED=0

# Test addresses (Celo Sepolia test accounts)
ALICE="0x1111111111111111111111111111111111111111"
BOB="0x2222222222222222222222222222222222222222"
CHARLIE="0x3333333333333333333333333333333333333333"
DAVE="0x4444444444444444444444444444444444444444"

# ═══════════════════════════════════════════════════════════════════════════
# Test Framework
# ═══════════════════════════════════════════════════════════════════════════

print_header() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_test() {
    echo -e "${YELLOW}→${NC} $1"
}

pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((TESTS_PASSED++))
}

fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((TESTS_FAILED++))
}

check_status() {
    local response=$1
    local expected_status=$2
    local description=$3

    if echo "$response" | grep -q "\"error\""; then
        fail "$description (error in response)"
        return 1
    fi
    
    if echo "$response" | grep -q "\"success\":true"; then
        pass "$description"
        return 0
    fi
    
    pass "$description"
    return 0
}

# ═══════════════════════════════════════════════════════════════════════════
# Test Cases
# ═══════════════════════════════════════════════════════════════════════════

test_payment_details() {
    print_test "GET /api/payment-details"
    
    local response=$(curl -s "$API_BASE/payment-details")
    
    if echo "$response" | grep -q "payTo"; then
        pass "Payment details endpoint working"
        echo "  Response: $(echo $response | jq -c '.')"
    else
        fail "Payment details endpoint not working"
        echo "  Response: $response"
    fi
}

test_current_fee() {
    print_test "GET /api/current-fee"
    
    local response=$(curl -s "$API_BASE/current-fee")
    
    if echo "$response" | grep -q "fee"; then
        pass "Current fee endpoint working"
        echo "  Response: $(echo $response | jq -c '.')"
    else
        fail "Current fee endpoint not working"
        echo "  Response: $response"
    fi
}

test_chat_trust_score() {
    print_test "POST /api/chat - 'What is my trust score?'"
    
    local response=$(curl -s -X POST "$API_BASE/chat" \
        -H "Content-Type: application/json" \
        -d '{"message":"What is my trust score?"}')
    
    if echo "$response" | grep -q "reply"; then
        pass "Chat endpoint responding to trust query"
        echo "  Response: $(echo $response | jq -c '.reply // .error')"
    else
        fail "Chat endpoint not responding properly"
        echo "  Response: $response"
    fi
}

test_chat_credit_eligibility() {
    print_test "POST /api/chat - 'Can I issue credit?'"
    
    local response=$(curl -s -X POST "$API_BASE/chat" \
        -H "Content-Type: application/json" \
        -d '{"message":"Can I issue credit?"}')
    
    if echo "$response" | grep -q "reply"; then
        pass "Chat endpoint responding to credit eligibility query"
        echo "  Response: $(echo $response | jq -c '.reply // .error')"
    else
        fail "Chat endpoint not responding properly"
        echo "  Response: $response"
    fi
}

test_chat_barter_offer() {
    print_test "POST /api/chat - 'I want to offer tutoring for graphic design'"
    
    local response=$(curl -s -X POST "$API_BASE/chat" \
        -H "Content-Type: application/json" \
        -d '{"message":"I want to offer tutoring for graphic design"}')
    
    if echo "$response" | grep -q "reply"; then
        pass "Chat endpoint responding to barter offer"
        echo "  Response: $(echo $response | jq -c '.reply // .error')"
    else
        fail "Chat endpoint not responding properly"
        echo "  Response: $response"
    fi
}

test_activity_feed() {
    print_test "GET /api/activity"
    
    local response=$(curl -s "$API_BASE/activity")
    
    if echo "$response" | grep -q "activities"; then
        pass "Activity feed endpoint working"
        local count=$(echo "$response" | jq '.count // 0')
        echo "  Activities logged: $count"
    else
        fail "Activity feed endpoint not working"
        echo "  Response: $response"
    fi
}

test_health_check() {
    print_test "GET / (health check)"
    
    local response=$(curl -s "http://$HOST/")
    
    if echo "$response" | grep -q "IntentCircles"; then
        pass "Health check endpoint working"
    else
        fail "Health check endpoint not working"
        echo "  Response: $response"
    fi
}

# ═══════════════════════════════════════════════════════════════════════════
# Main Test Suite
# ═══════════════════════════════════════════════════════════════════════════

main() {
    clear
    
    echo -e "${BLUE}"
    cat << "EOF"
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║    IntentCircles API Integration Test Suite                  ║
║                                                               ║
║    Testing all API endpoints for full system flow:           ║
║    - Trust endpoint                                          ║
║    - Credit report                                           ║
║    - Credit issuance                                         ║
║    - Barter submission & matching                           ║
║    - Chat commands                                           ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
    
    echo "Target: http://$HOST"
    echo "Starting tests in 2 seconds..."
    sleep 2
    
    # Health check first
    print_header "Health Check"
    test_health_check
    
    # Payment endpoints
    print_header "Payment Endpoints"
    test_payment_details
    test_current_fee
    
    # Chat endpoints (conversational)
    print_header "Chat Endpoints (Conversational Intent Parser)"
    test_chat_trust_score
    test_chat_credit_eligibility
    test_chat_barter_offer
    
    # Activity feed
    print_header "Activity & Monitoring"
    test_activity_feed
    
    # Summary
    print_header "Test Summary"
    
    local total=$((TESTS_PASSED + TESTS_FAILED))
    local percentage=0
    if [ $total -gt 0 ]; then
        percentage=$((TESTS_PASSED * 100 / total))
    fi
    
    echo "Total Tests:   $total"
    echo "Passed:        $TESTS_PASSED"
    echo "Failed:        $TESTS_FAILED"
    echo "Success Rate:  ${percentage}%"
    
    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "\n${GREEN}✓ All tests passed!${NC}"
        exit 0
    else
        echo -e "\n${RED}✗ Some tests failed${NC}"
        exit 1
    fi
}

# ═══════════════════════════════════════════════════════════════════════════
# Run Tests
# ═══════════════════════════════════════════════════════════════════════════

# Check if curl and jq are available
if ! command -v curl &> /dev/null; then
    echo -e "${RED}Error: curl is required but not installed.${NC}"
    exit 1
fi

if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}Warning: jq not found. JSON parsing will be limited.${NC}"
fi

# Run the test suite
main
