// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/IntentRegistry.sol";

contract IntentRegistryTest is Test {
    IntentRegistry public registry;
    address public agent1 = address(0x1111);
    address public agent2 = address(0x2222);
    address public user1 = address(0x3333);
    address public user2 = address(0x4444);

    function setUp() public {
        registry = new IntentRegistry();
        registry.registerAgent(agent1);
        registry.registerAgent(agent2);
    }

    function testSubmitIntent() public {
        vm.prank(user1);
        uint256 intentId = registry.submitIntent(
            IntentRegistry.IntentType.JOIN_CIRCLE,
            abi.encode(123),
            0
        );

        assertEq(intentId, 1);

        IntentRegistry.Intent memory intent = registry.getIntent(intentId);
        assertEq(uint256(intent.intentType), uint256(IntentRegistry.IntentType.JOIN_CIRCLE));
        assertEq(intent.creator, user1);
        assertEq(intent.fulfilled, false);
        assertEq(intent.cancelled, false);
    }

    function testSubmitIntentWithExpiry() public {
        vm.prank(user1);
        uint256 expiryTime = block.timestamp + 1 days;
        uint256 intentId = registry.submitIntent(
            IntentRegistry.IntentType.CREATE_CIRCLE,
            abi.encode(456),
            expiryTime
        );

        IntentRegistry.Intent memory intent = registry.getIntent(intentId);
        assertEq(intent.expiresAt, expiryTime);
    }

    function testCancelIntent() public {
        vm.prank(user1);
        uint256 intentId = registry.submitIntent(
            IntentRegistry.IntentType.JOIN_CIRCLE,
            abi.encode(789),
            0
        );

        vm.prank(user1);
        registry.cancelIntent(intentId);

        IntentRegistry.Intent memory intent = registry.getIntent(intentId);
        assertEq(intent.cancelled, true);
    }

    function testCannotCancelOthersIntent() public {
        vm.prank(user1);
        uint256 intentId = registry.submitIntent(
            IntentRegistry.IntentType.JOIN_CIRCLE,
            abi.encode(789),
            0
        );

        vm.prank(user2);
        vm.expectRevert("Only creator can cancel");
        registry.cancelIntent(intentId);
    }

    function testFulfillIntent() public {
        vm.prank(user1);
        uint256 intentId = registry.submitIntent(
            IntentRegistry.IntentType.JOIN_CIRCLE,
            abi.encode(789),
            0
        );

        vm.prank(agent1);
        registry.fulfillIntent(intentId, abi.encode(999));

        IntentRegistry.Intent memory intent = registry.getIntent(intentId);
        assertEq(intent.fulfilled, true);
    }

    function testOnlyAgentCanFulfill() public {
        vm.prank(user1);
        uint256 intentId = registry.submitIntent(
            IntentRegistry.IntentType.JOIN_CIRCLE,
            abi.encode(789),
            0
        );

        vm.prank(user2);
        vm.expectRevert("Not a registered agent");
        registry.fulfillIntent(intentId, abi.encode(999));
    }

    function testBatchFulfill() public {
        vm.prank(user1);
        uint256 intentId1 = registry.submitIntent(
            IntentRegistry.IntentType.JOIN_CIRCLE,
            abi.encode(1),
            0
        );

        vm.prank(user2);
        uint256 intentId2 = registry.submitIntent(
            IntentRegistry.IntentType.CONTRIBUTE,
            abi.encode(2),
            0
        );

        uint256[] memory ids = new uint256[](2);
        ids[0] = intentId1;
        ids[1] = intentId2;

        vm.prank(agent1);
        registry.batchFulfill(ids, abi.encode("composite"));

        assertEq(registry.getIntent(intentId1).fulfilled, true);
        assertEq(registry.getIntent(intentId2).fulfilled, true);
    }

    function testGetOpenIntents() public {
        vm.prank(user1);
        registry.submitIntent(IntentRegistry.IntentType.JOIN_CIRCLE, abi.encode(1), 0);

        vm.prank(user2);
        registry.submitIntent(IntentRegistry.IntentType.JOIN_CIRCLE, abi.encode(2), 0);

        vm.prank(user1);
        registry.submitIntent(IntentRegistry.IntentType.CONTRIBUTE, abi.encode(3), 0);

        IntentRegistry.Intent[] memory openIntents = registry.getOpenIntents(
            IntentRegistry.IntentType.JOIN_CIRCLE
        );

        assertEq(openIntents.length, 2);
    }

    function testExpiredIntentNotFulfillable() public {
        vm.prank(user1);
        uint256 intentId = registry.submitIntent(
            IntentRegistry.IntentType.JOIN_CIRCLE,
            abi.encode(789),
            block.timestamp + 1
        );

        // Move time forward past expiry
        vm.warp(block.timestamp + 2);

        vm.prank(agent1);
        vm.expectRevert("Intent expired");
        registry.fulfillIntent(intentId, abi.encode(999));
    }

    function testRegisterAndDeregisterAgent() public {
        address newAgent = address(0x5555);

        registry.registerAgent(newAgent);
        assertEq(registry.registeredAgents(newAgent), true);

        registry.deregisterAgent(newAgent);
        assertEq(registry.registeredAgents(newAgent), false);
    }

    function testIntentCounter() public {
        assertEq(registry.getIntentCount(), 0);

        vm.prank(user1);
        registry.submitIntent(IntentRegistry.IntentType.JOIN_CIRCLE, abi.encode(1), 0);

        assertEq(registry.getIntentCount(), 1);

        vm.prank(user2);
        registry.submitIntent(IntentRegistry.IntentType.CONTRIBUTE, abi.encode(2), 0);

        assertEq(registry.getIntentCount(), 2);
    }
}
