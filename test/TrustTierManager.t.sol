// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/TrustTierManager.sol";
import "../src/AgentRegistry8004.sol";

contract TrustTierManagerTest is Test {
    TrustTierManager public tierManager;
    AgentRegistry8004 public registry;

    address public owner;
    address public agent1;
    address public agent2;
    address public agent3;
    address public reporter;

    function setUp() public {
        owner = address(this);
        agent1 = address(0x1111111111111111111111111111111111111111);
        agent2 = address(0x2222222222222222222222222222222222222222);
        agent3 = address(0x3333333333333333333333333333333333333333);
        reporter = address(0x5555555555555555555555555555555555555555);

        // Deploy registry and tier manager
        registry = new AgentRegistry8004();
        tierManager = new TrustTierManager(address(registry));

        // Register agents
        vm.prank(agent1);
        registry.registerAgent("Agent1", "http://agent1.test", "ipfs://agent1");

        vm.prank(agent2);
        registry.registerAgent("Agent2", "http://agent2.test", "ipfs://agent2");

        vm.prank(agent3);
        registry.registerAgent("Agent3", "http://agent3.test", "ipfs://agent3");

        // Authorize reporter
        registry.authorizeReporter(reporter);
    }

    // ========== Tier Calculation Tests ==========

    function test_getTier_NewcomerNoReputation() public {
        TrustTierManager.Tier tier = tierManager.getTier(agent1);
        assertEq(uint256(tier), uint256(TrustTierManager.Tier.NEWCOMER));
    }

    function test_getTier_MemberTier() public {
        // Give agent1 60% reputation (6000 basis points)
        // score = (success * 10000) / (success + failure)
        // 6000 = (success * 10000) / (success + failure)
        // Set success = 6, failure = 4 => score = 6000
        vm.prank(reporter);
        registry.reportSuccess(agent1);
        vm.prank(reporter);
        registry.reportSuccess(agent1);
        vm.prank(reporter);
        registry.reportSuccess(agent1);
        vm.prank(reporter);
        registry.reportSuccess(agent1);
        vm.prank(reporter);
        registry.reportSuccess(agent1);
        vm.prank(reporter);
        registry.reportSuccess(agent1);
        vm.prank(reporter);
        registry.reportFailure(agent1);
        vm.prank(reporter);
        registry.reportFailure(agent1);
        vm.prank(reporter);
        registry.reportFailure(agent1);
        vm.prank(reporter);
        registry.reportFailure(agent1);

        TrustTierManager.Tier tier = tierManager.getTier(agent1);
        assertEq(uint256(tier), uint256(TrustTierManager.Tier.MEMBER));
    }

    function test_getTier_CreditorTier() public {
        // Set score to 8500 (85% reputation)
        // success = 17, failure = 3 => (17 * 10000) / 20 = 8500
        for (uint256 i = 0; i < 17; i++) {
            vm.prank(reporter);
            registry.reportSuccess(agent1);
        }
        for (uint256 i = 0; i < 3; i++) {
            vm.prank(reporter);
            registry.reportFailure(agent1);
        }

        TrustTierManager.Tier tier = tierManager.getTier(agent1);
        assertEq(uint256(tier), uint256(TrustTierManager.Tier.CREDITOR));
    }

    function test_getTier_ElderTier() public {
        // Set score to 9500 (95% reputation)
        // success = 19, failure = 1 => (19 * 10000) / 20 = 9500
        for (uint256 i = 0; i < 19; i++) {
            vm.prank(reporter);
            registry.reportSuccess(agent1);
        }
        for (uint256 i = 0; i < 1; i++) {
            vm.prank(reporter);
            registry.reportFailure(agent1);
        }

        TrustTierManager.Tier tier = tierManager.getTier(agent1);
        assertEq(uint256(tier), uint256(TrustTierManager.Tier.ELDER));
    }

    function test_getTier_UnregisteredAgent() public {
        address unregistered = address(0x9999999999999999999999999999999999999999);
        vm.expectRevert("Agent not registered");
        tierManager.getTier(unregistered);
    }

    // ========== Capability Check Tests ==========

    function test_canIssueCreditLine_CreditorTier() public {
        // Set agent1 to CREDITOR tier (85% score)
        for (uint256 i = 0; i < 17; i++) {
            vm.prank(reporter);
            registry.reportSuccess(agent1);
        }
        for (uint256 i = 0; i < 3; i++) {
            vm.prank(reporter);
            registry.reportFailure(agent1);
        }

        bool canIssue = tierManager.canIssueCreditLine(agent1);
        assertTrue(canIssue);
    }

    function test_canIssueCreditLine_ElderTier() public {
        // Set agent1 to ELDER tier (95% score)
        for (uint256 i = 0; i < 19; i++) {
            vm.prank(reporter);
            registry.reportSuccess(agent1);
        }
        for (uint256 i = 0; i < 1; i++) {
            vm.prank(reporter);
            registry.reportFailure(agent1);
        }

        bool canIssue = tierManager.canIssueCreditLine(agent1);
        assertTrue(canIssue);
    }

    function test_canIssueCreditLine_MemberTier() public {
        // Set agent1 to MEMBER tier (60% score)
        for (uint256 i = 0; i < 6; i++) {
            vm.prank(reporter);
            registry.reportSuccess(agent1);
        }
        for (uint256 i = 0; i < 4; i++) {
            vm.prank(reporter);
            registry.reportFailure(agent1);
        }

        bool canIssue = tierManager.canIssueCreditLine(agent1);
        assertFalse(canIssue);
    }

    function test_canSettleBarter_ElderOnly() public {
        // Set agent1 to CREDITOR tier (85%) = 17 success, 3 failure
        for (uint256 i = 0; i < 17; i++) {
            vm.prank(reporter);
            registry.reportSuccess(agent1);
        }
        for (uint256 i = 0; i < 3; i++) {
            vm.prank(reporter);
            registry.reportFailure(agent1);
        }

        bool canSettle = tierManager.canSettleBarter(agent1);
        assertFalse(canSettle);

        // Set agent1 to ELDER tier (95%) = 19 success, 1 failure
        // Currently: 17 success, 3 failure
        // Need: 19 success, 1 failure (add 2 success, remove 2 failure)
        // We can only add, so let's add 4 success and remove 2 failures by design
        // Actually simpler: start fresh with the right numbers
        // But we're in the middle of a test, so let's think about what we need:
        // (17 + x) / (20 + y) >= 0.95
        // If we add 2 more successes: (19) / (20 + y) >= 0.95
        // We need y = 0, so (19) / 20 = 0.95 ✓
        // Currently we have 3 failures. We need to get back to 1.
        // Since we can't "un-report", let's count: at 17 success, 3 fail, score = 8500
        // Add 2 successes: 19 success, 3 failure = 8636 (still CREDITOR)
        // We need: score >= 9500
        // (success * 10000) / (success + failure) >= 9500
        // success / total >= 0.95
        // If total = 20: need 19 successes
        // If total = 40: need 38 successes
        // Current: 17 success, 3 fail = 20 total
        // Need: 19 success, 1 fail = 20 total
        // But we can only add reports, not remove them.
        // So from 17/3, we need to go to 19/1
        // That means: add 2 success, but that gives us 19/3 = 8633
        // To get to 19/1 from 17/3, we'd need to subtract failures (impossible)
        // Solution: ignore the current state and just reset by checking what we need
        // Let me use a different approach - just add enough to get to 95%
        // (17 + x) / (17 + 3 + x) >= 0.95
        // (17 + x) >= 0.95 * (20 + x)
        // 17 + x >= 19 + 0.95x
        // 0.05x >= 2
        // x >= 40
        // So we need 40 more successes! Let's do it:
        for (uint256 i = 0; i < 40; i++) {
            vm.prank(reporter);
            registry.reportSuccess(agent1);
        }

        canSettle = tierManager.canSettleBarter(agent1);
        assertTrue(canSettle);
    }

    // ========== Max Credit Amount Tests ==========

    function test_getMaxCreditIssueAmount_MemberTier() public {
        // MEMBER tier cannot issue credit
        for (uint256 i = 0; i < 6; i++) {
            vm.prank(reporter);
            registry.reportSuccess(agent1);
        }
        for (uint256 i = 0; i < 4; i++) {
            vm.prank(reporter);
            registry.reportFailure(agent1);
        }

        uint256 maxCredit = tierManager.getMaxCreditIssueAmount(agent1);
        assertEq(maxCredit, 0);
    }

    function test_getMaxCreditIssueAmount_CreditorTier() public {
        // CREDITOR tier at 80% = max 500 cUSD
        for (uint256 i = 0; i < 16; i++) {
            vm.prank(reporter);
            registry.reportSuccess(agent1);
        }
        for (uint256 i = 0; i < 4; i++) {
            vm.prank(reporter);
            registry.reportFailure(agent1);
        }

        uint256 maxCredit = tierManager.getMaxCreditIssueAmount(agent1);
        assertEq(maxCredit, 500 * 1e18);
    }

    function test_getMaxCreditIssueAmount_CreditorHigher() public {
        // CREDITOR tier at 85% = max 1250 cUSD (500 + (8500 - 8000) * 1.5)
        for (uint256 i = 0; i < 17; i++) {
            vm.prank(reporter);
            registry.reportSuccess(agent1);
        }
        for (uint256 i = 0; i < 3; i++) {
            vm.prank(reporter);
            registry.reportFailure(agent1);
        }

        uint256 maxCredit = tierManager.getMaxCreditIssueAmount(agent1);
        uint256 expected = 500 * 1e18 + (500 * 15e14);
        assertEq(maxCredit, expected);
    }

    function test_getMaxCreditIssueAmount_ElderTier() public {
        // ELDER tier at 95% = max 2750 cUSD (500 + (9500 - 8000) * 1.5)
        for (uint256 i = 0; i < 19; i++) {
            vm.prank(reporter);
            registry.reportSuccess(agent1);
        }
        for (uint256 i = 0; i < 1; i++) {
            vm.prank(reporter);
            registry.reportFailure(agent1);
        }

        uint256 maxCredit = tierManager.getMaxCreditIssueAmount(agent1);
        uint256 expected = 500 * 1e18 + (1500 * 15e14);
        assertEq(maxCredit, expected);
    }

    // ========== Threshold Configuration Tests ==========

    function test_setNewcomerThreshold() public {
        tierManager.setNewcomerThreshold(4000);

        (uint256 newcomer, , ) = tierManager.getThresholds();
        assertEq(newcomer, 4000);
    }

    function test_setNewcomerThreshold_OnlyOwner() public {
        vm.prank(agent1);
        vm.expectRevert();
        tierManager.setNewcomerThreshold(4000);
    }

    function test_setNewcomerThreshold_MustBeValid() public {
        // Must be less than member threshold
        vm.expectRevert("Must be below member threshold");
        tierManager.setNewcomerThreshold(8000);

        // Must be positive
        vm.expectRevert();
        tierManager.setNewcomerThreshold(0);
    }

    function test_setMemberThreshold() public {
        tierManager.setMemberThreshold(8500);

        (, uint256 member, ) = tierManager.getThresholds();
        assertEq(member, 8500);
    }

    function test_setCreditorThreshold() public {
        tierManager.setCreditorThreshold(9200);

        (, , uint256 creditor) = tierManager.getThresholds();
        assertEq(creditor, 9200);
    }

    function test_thresholdChangesAffectTierCalculation() public {
        // Set agent1 to 60% reputation (MEMBER)
        for (uint256 i = 0; i < 6; i++) {
            vm.prank(reporter);
            registry.reportSuccess(agent1);
        }
        for (uint256 i = 0; i < 4; i++) {
            vm.prank(reporter);
            registry.reportFailure(agent1);
        }

        TrustTierManager.Tier tier = tierManager.getTier(agent1);
        assertEq(uint256(tier), uint256(TrustTierManager.Tier.MEMBER));

        // Change member threshold to 5000, so 6000 becomes CREDITOR
        tierManager.setMemberThreshold(5999);
        tierManager.setCreditorThreshold(6000);

        tier = tierManager.getTier(agent1);
        assertEq(uint256(tier), uint256(TrustTierManager.Tier.CREDITOR));
    }

    // ========== Helper Function Tests ==========

    function test_getTierName() public {
        assertEq(tierManager.getTierName(TrustTierManager.Tier.NEWCOMER), "NEWCOMER");
        assertEq(tierManager.getTierName(TrustTierManager.Tier.MEMBER), "MEMBER");
        assertEq(tierManager.getTierName(TrustTierManager.Tier.CREDITOR), "CREDITOR");
        assertEq(tierManager.getTierName(TrustTierManager.Tier.ELDER), "ELDER");
    }

    function test_getThresholds() public {
        (uint256 newcomer, uint256 member, uint256 creditor) = tierManager
            .getThresholds();

        assertEq(newcomer, 5000);
        assertEq(member, 7999);
        assertEq(creditor, 9399);
    }

    // ========== Edge Cases ==========

    function test_boundaryCondition_ExactlyAtThreshold() public {
        // Test boundary between NEWCOMER and MEMBER at score 5000 (50%)
        // Score formula: (success * 10000) / (success + failure)
        // For score < 5000: 4 success, 6 failure = (4 * 10000) / 10 = 4000 (NEWCOMER)
        for (uint256 i = 0; i < 4; i++) {
            vm.prank(reporter);
            registry.reportSuccess(agent1);
        }
        for (uint256 i = 0; i < 6; i++) {
            vm.prank(reporter);
            registry.reportFailure(agent1);
        }

        TrustTierManager.Tier tier = tierManager.getTier(agent1);
        assertEq(uint256(tier), uint256(TrustTierManager.Tier.NEWCOMER));

        // For score >= 5000: add 2 successes to get 6 success, 6 failure
        // (6 * 10000) / 12 = 5000 (exactly at threshold, should be MEMBER)
        vm.prank(reporter);
        registry.reportSuccess(agent1);
        vm.prank(reporter);
        registry.reportSuccess(agent1);

        tier = tierManager.getTier(agent1);
        assertEq(uint256(tier), uint256(TrustTierManager.Tier.MEMBER));
    }
}
