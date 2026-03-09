// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/IntentRegistry.sol";

contract IntentRegistryNightfallTest is Test {
    IntentRegistry public registry;

    address public agent = address(0x1111);
    address public user1 = address(0x2222);
    address public user2 = address(0x3333);
    address public owner = address(0x4444);

    uint256 constant CIRCLE_ID = 1;
    uint256 constant CONTRIBUTION_AMOUNT = 100e18;

    function setUp() public {
        registry = new IntentRegistry();
        
        // Transfer ownership to our test owner
        registry.transferOwnership(owner);

        // Register agent
        vm.prank(owner);
        registry.registerAgent(agent);
    }

    // ===== NIGHTFALL DEPOSIT INTENT TESTS =====

    function testSubmitNightfallDeposit() public {
        uint256 amount = 100e18;
        bytes32 salt = keccak256("salt123");

        vm.prank(user1);
        uint256 depositIntentId = registry.submitNightfallDeposit(CIRCLE_ID, amount, salt);

        assertEq(depositIntentId, 1);

        IntentRegistry.NightfallDepositIntent memory depositIntent = registry.getDepositIntent(depositIntentId);
        assertEq(depositIntent.circleId, CIRCLE_ID);
        assertEq(depositIntent.amount, amount);
        assertEq(depositIntent.salt, salt);
        assertEq(depositIntent.deposited, false);
        assertEq(depositIntent.createdAt, block.timestamp);
    }

    function testSubmitNightfallDepositCreatesCommitmentHash() public {
        uint256 amount = 100e18;
        bytes32 salt = keccak256("salt123");
        bytes32 expectedCommitment = keccak256(abi.encodePacked(amount, salt));

        vm.prank(user1);
        uint256 depositIntentId = registry.submitNightfallDeposit(CIRCLE_ID, amount, salt);

        IntentRegistry.NightfallDepositIntent memory depositIntent = registry.getDepositIntent(depositIntentId);
        assertEq(depositIntent.commitmentHash, expectedCommitment);
    }

    function testSubmitNightfallDepositEmitsEvent() public {
        uint256 amount = 100e18;
        bytes32 salt = keccak256("salt123");

        vm.prank(user1);
        vm.expectEmit(true, true, true, true);
        emit IntentRegistry.IntentSubmitted(
            1,
            IntentRegistry.IntentType.NIGHTFALL_DEPOSIT,
            user1,
            0
        );
        registry.submitNightfallDeposit(CIRCLE_ID, amount, salt);
    }

    function testCannotSubmitNightfallDepositWithZeroAmount() public {
        bytes32 salt = keccak256("salt");

        vm.prank(user1);
        vm.expectRevert("Invalid amount");
        registry.submitNightfallDeposit(CIRCLE_ID, 0, salt);
    }

    function testCannotSubmitNightfallDepositWithZeroCircleId() public {
        uint256 amount = 100e18;
        bytes32 salt = keccak256("salt");

        vm.prank(user1);
        vm.expectRevert("Invalid circle ID");
        registry.submitNightfallDeposit(0, amount, salt);
    }

    function testSubmitMultipleNightfallDeposits() public {
        uint256 amount1 = 100e18;
        bytes32 salt1 = keccak256("salt1");

        uint256 amount2 = 150e18;
        bytes32 salt2 = keccak256("salt2");

        vm.prank(user1);
        uint256 id1 = registry.submitNightfallDeposit(CIRCLE_ID, amount1, salt1);

        vm.prank(user2);
        uint256 id2 = registry.submitNightfallDeposit(CIRCLE_ID, amount2, salt2);

        assertEq(id1, 1);
        assertEq(id2, 2);

        IntentRegistry.NightfallDepositIntent memory deposit1 = registry.getDepositIntent(id1);
        IntentRegistry.NightfallDepositIntent memory deposit2 = registry.getDepositIntent(id2);

        assertEq(deposit1.amount, amount1);
        assertEq(deposit2.amount, amount2);
    }

    function testMarkNightfallDeposited() public {
        uint256 amount = 100e18;
        bytes32 salt = keccak256("salt123");

        vm.prank(user1);
        uint256 depositIntentId = registry.submitNightfallDeposit(CIRCLE_ID, amount, salt);

        // Verify initially not deposited
        IntentRegistry.NightfallDepositIntent memory depositIntent = registry.getDepositIntent(depositIntentId);
        assertEq(depositIntent.deposited, false);

        // Agent marks it as deposited
        vm.prank(agent);
        registry.markNightfallDeposited(depositIntentId);

        // Verify now marked as deposited
        depositIntent = registry.getDepositIntent(depositIntentId);
        assertEq(depositIntent.deposited, true);
    }

    function testMarkNightfallDepositedEmitsEvent() public {
        uint256 amount = 100e18;
        bytes32 salt = keccak256("salt123");

        vm.prank(user1);
        uint256 depositIntentId = registry.submitNightfallDeposit(CIRCLE_ID, amount, salt);

        vm.prank(agent);
        vm.expectEmit(true, true, false, false);
        emit IntentRegistry.IntentFulfilled(depositIntentId, agent);
        registry.markNightfallDeposited(depositIntentId);
    }

    function testOnlyAgentCanMarkNightfallDeposited() public {
        uint256 amount = 100e18;
        bytes32 salt = keccak256("salt123");

        vm.prank(user1);
        uint256 depositIntentId = registry.submitNightfallDeposit(CIRCLE_ID, amount, salt);

        // Non-agent cannot mark as deposited
        vm.prank(user2);
        vm.expectRevert("Not a registered agent");
        registry.markNightfallDeposited(depositIntentId);
    }

    function testCannotMarkNonexistentDepositIntentAsDeposited() public {
        vm.prank(agent);
        vm.expectRevert("Deposit intent not found");
        registry.markNightfallDeposited(999);
    }

    function testCannotMarkAlreadyDepositedAsDeposited() public {
        uint256 amount = 100e18;
        bytes32 salt = keccak256("salt123");

        vm.prank(user1);
        uint256 depositIntentId = registry.submitNightfallDeposit(CIRCLE_ID, amount, salt);

        // Mark as deposited
        vm.prank(agent);
        registry.markNightfallDeposited(depositIntentId);

        // Try to mark again
        vm.prank(agent);
        vm.expectRevert("Already marked as deposited");
        registry.markNightfallDeposited(depositIntentId);
    }

    // ===== ENUM EXTENSION TESTS =====

    function testIntentTypeEnumContainsNightfallTypes() public pure {
        // These should not revert
        IntentRegistry.IntentType joinCircle = IntentRegistry.IntentType.JOIN_CIRCLE;
        IntentRegistry.IntentType createCircle = IntentRegistry.IntentType.CREATE_CIRCLE;
        IntentRegistry.IntentType contribute = IntentRegistry.IntentType.CONTRIBUTE;
        IntentRegistry.IntentType exitCircle = IntentRegistry.IntentType.EXIT_CIRCLE;
        IntentRegistry.IntentType dispute = IntentRegistry.IntentType.DISPUTE;
        IntentRegistry.IntentType nightfallDeposit = IntentRegistry.IntentType.NIGHTFALL_DEPOSIT;
        IntentRegistry.IntentType nightfallRotation = IntentRegistry.IntentType.NIGHTFALL_ROTATION;

        // Just assign to local variables to avoid unused variable warnings
        assert(uint256(joinCircle) == 0);
        assert(uint256(createCircle) == 1);
        assert(uint256(contribute) == 2);
        assert(uint256(exitCircle) == 3);
        assert(uint256(dispute) == 4);
        assert(uint256(nightfallDeposit) == 5);
        assert(uint256(nightfallRotation) == 6);
    }

    // ===== INTEGRATION TESTS =====

    function testNightfallDepositIntentLifecycle() public {
        uint256 amount = 100e18;
        bytes32 salt = keccak256("salt123");

        // Step 1: User submits deposit intent
        vm.prank(user1);
        uint256 depositIntentId = registry.submitNightfallDeposit(CIRCLE_ID, amount, salt);

        // Step 2: Verify intent created
        IntentRegistry.NightfallDepositIntent memory depositIntent = registry.getDepositIntent(depositIntentId);
        assertEq(depositIntent.circleId, CIRCLE_ID);
        assertEq(depositIntent.amount, amount);
        assertEq(depositIntent.deposited, false);

        // Step 3: Agent verifies proof and marks as deposited
        vm.prank(agent);
        registry.markNightfallDeposited(depositIntentId);

        // Step 4: Verify intent is marked complete
        depositIntent = registry.getDepositIntent(depositIntentId);
        assertEq(depositIntent.deposited, true);
    }

    function testBatchNightfallDeposits() public {
        // Submit multiple deposits
        uint256[] memory depositIds = new uint256[](3);

        for (uint256 i = 0; i < 3; i++) {
            uint256 amount = (100 + i * 50) * 1e18;
            bytes32 salt = keccak256(abi.encodePacked("salt", i));

            vm.prank(user1);
            depositIds[i] = registry.submitNightfallDeposit(CIRCLE_ID, amount, salt);
        }

        // Agent marks all as deposited
        for (uint256 i = 0; i < 3; i++) {
            vm.prank(agent);
            registry.markNightfallDeposited(depositIds[i]);
        }

        // Verify all are marked
        for (uint256 i = 0; i < 3; i++) {
            IntentRegistry.NightfallDepositIntent memory depositIntent = registry.getDepositIntent(depositIds[i]);
            assertEq(depositIntent.deposited, true);
        }
    }

    function testNightfallDepositDifferentCircles() public {
        uint256 circle1 = 1;
        uint256 circle2 = 2;
        uint256 amount = 100e18;
        bytes32 salt = keccak256("salt");

        // Submit to circle 1
        vm.prank(user1);
        uint256 id1 = registry.submitNightfallDeposit(circle1, amount, salt);

        // Submit to circle 2
        vm.prank(user2);
        uint256 id2 = registry.submitNightfallDeposit(circle2, amount, salt);

        IntentRegistry.NightfallDepositIntent memory deposit1 = registry.getDepositIntent(id1);
        IntentRegistry.NightfallDepositIntent memory deposit2 = registry.getDepositIntent(id2);

        assertEq(deposit1.circleId, circle1);
        assertEq(deposit2.circleId, circle2);
    }

    function testNightfallDepositCounterIncrements() public {
        uint256 amount = 100e18;
        bytes32 salt = keccak256("salt");

        uint256 initialCounter = registry.depositIntentCounter();

        vm.prank(user1);
        uint256 id1 = registry.submitNightfallDeposit(CIRCLE_ID, amount, salt);

        assertEq(id1, initialCounter);
        assertEq(registry.depositIntentCounter(), initialCounter + 1);

        vm.prank(user1);
        uint256 id2 = registry.submitNightfallDeposit(CIRCLE_ID, amount, salt);

        assertEq(id2, initialCounter + 1);
        assertEq(registry.depositIntentCounter(), initialCounter + 2);
    }

    function testGetDepositIntentForNonexistentIntent() public {
        IntentRegistry.NightfallDepositIntent memory depositIntent = registry.getDepositIntent(999);
        
        // Should return empty struct (all zeros)
        assertEq(depositIntent.circleId, 0);
        assertEq(depositIntent.amount, 0);
        assertEq(depositIntent.createdAt, 0);
        assertEq(depositIntent.deposited, false);
    }

    function testNightfallDepositWithVariousSalts() public {
        uint256 amount = 100e18;

        // Test with different salts (same amount)
        bytes32[] memory salts = new bytes32[](3);
        salts[0] = keccak256("salt1");
        salts[1] = keccak256("salt2");
        salts[2] = keccak256("salt3");

        uint256[] memory ids = new uint256[](3);

        for (uint256 i = 0; i < 3; i++) {
            vm.prank(user1);
            ids[i] = registry.submitNightfallDeposit(CIRCLE_ID, amount, salts[i]);
        }

        // Verify all have different commitment hashes
        bytes32[] memory commitments = new bytes32[](3);
        for (uint256 i = 0; i < 3; i++) {
            IntentRegistry.NightfallDepositIntent memory deposit = registry.getDepositIntent(ids[i]);
            commitments[i] = deposit.commitmentHash;
        }

        // Each commitment should be unique
        for (uint256 i = 0; i < 3; i++) {
            for (uint256 j = i + 1; j < 3; j++) {
                assertNotEq(commitments[i], commitments[j]);
            }
        }
    }
}
