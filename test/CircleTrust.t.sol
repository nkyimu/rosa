// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/CircleTrust.sol";

contract CircleTrustTest is Test {
    CircleTrust public trust;
    address public user1 = address(0x1111);
    address public user2 = address(0x2222);
    address public user3 = address(0x3333);
    address public user4 = address(0x4444);

    function setUp() public {
        trust = new CircleTrust();
    }

    function testTrustCreation() public {
        uint96 expiresAt = uint96(block.timestamp + 365 days);

        vm.prank(user1);
        trust.trust(user2, expiresAt);

        assertTrue(trust.isTrusted(user1, user2));
    }

    function testTrustExpiry() public {
        uint96 expiresAt = uint96(block.timestamp + 1 days);

        vm.prank(user1);
        trust.trust(user2, expiresAt);

        assertTrue(trust.isTrusted(user1, user2));

        // Move time forward past expiry
        vm.warp(block.timestamp + 2 days);

        assertFalse(trust.isTrusted(user1, user2));
    }

    function testTrustRevocation() public {
        vm.prank(user1);
        trust.trust(user2, 0);

        assertTrue(trust.isTrusted(user1, user2));

        vm.prank(user1);
        trust.revokeTrust(user2);

        assertFalse(trust.isTrusted(user1, user2));
    }

    function testCannotTrustSelf() public {
        vm.prank(user1);
        vm.expectRevert("Cannot trust yourself");
        trust.trust(user1, 0);
    }

    function testCannotTrustZeroAddress() public {
        vm.prank(user1);
        vm.expectRevert("Cannot trust zero address");
        trust.trust(address(0), 0);
    }

    function testTrustScore() public {
        // User3 is trusted by user1, user2, and user4
        vm.prank(user1);
        trust.trust(user3, 0);

        assertEq(trust.trustScore(user3), 1);

        vm.prank(user2);
        trust.trust(user3, 0);

        assertEq(trust.trustScore(user3), 2);

        vm.prank(user4);
        trust.trust(user3, 0);

        assertEq(trust.trustScore(user3), 3);
    }

    function testMeetsMinTrust() public {
        // Need at least 2 people to trust user3
        vm.prank(user1);
        trust.trust(user3, 0);

        assertFalse(trust.meetsMinTrust(user3, 2));

        vm.prank(user2);
        trust.trust(user3, 0);

        assertTrue(trust.meetsMinTrust(user3, 2));
    }

    function testDirectionalTrust() public {
        // user1 trusts user2
        vm.prank(user1);
        trust.trust(user2, 0);

        // But user2 doesn't necessarily trust user1
        assertFalse(trust.isTrusted(user2, user1));

        // user2 can still trust user1
        vm.prank(user2);
        trust.trust(user1, 0);

        assertTrue(trust.isTrusted(user2, user1));
    }

    function testTrustReplacement() public {
        // Trust with expiry
        vm.prank(user1);
        trust.trust(user2, uint96(block.timestamp + 1 days));

        // Add same trust with different expiry - should replace
        vm.prank(user1);
        trust.trust(user2, uint96(block.timestamp + 365 days));

        assertTrue(trust.isTrusted(user1, user2));
        assertEq(trust.trustScore(user2), 1); // Still only 1 trust edge
    }

    function testNeverExpiringTrust() public {
        vm.prank(user1);
        trust.trust(user2, 0); // 0 = never expires

        assertTrue(trust.isTrusted(user1, user2));

        // Move far into future
        vm.warp(block.timestamp + 1000000 days);

        assertTrue(trust.isTrusted(user1, user2));
    }

    function testCannotRevokeNonexistentTrust() public {
        vm.prank(user1);
        vm.expectRevert("Not trusting this address");
        trust.revokeTrust(user2);
    }

    function testMultipleTrustEdges() public {
        // user1 trusts multiple people
        vm.prank(user1);
        trust.trust(user2, 0);

        vm.prank(user1);
        trust.trust(user3, 0);

        vm.prank(user1);
        trust.trust(user4, 0);

        assertTrue(trust.isTrusted(user1, user2));
        assertTrue(trust.isTrusted(user1, user3));
        assertTrue(trust.isTrusted(user1, user4));

        // Revoke one
        vm.prank(user1);
        trust.revokeTrust(user3);

        assertTrue(trust.isTrusted(user1, user2));
        assertFalse(trust.isTrusted(user1, user3));
        assertTrue(trust.isTrusted(user1, user4));
    }

    function testGetTrustEdges() public {
        uint96 expiry1 = uint96(block.timestamp + 365 days);
        uint96 expiry2 = uint96(block.timestamp + 730 days);

        vm.prank(user1);
        trust.trust(user2, expiry1);

        vm.prank(user1);
        trust.trust(user3, expiry2);

        CircleTrust.TrustEdge[] memory edges = trust.getTrustEdges(user1);

        assertEq(edges.length, 2);
        assertEq(edges[0].expiresAt, expiry1);
        assertEq(edges[1].expiresAt, expiry2);
    }
}
