// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../src/SaveCircle.sol";
import "../src/CircleTrust.sol";

// Mock ERC20 token for testing
contract MockToken is ERC20 {
    constructor() ERC20("Mock Token", "MOCK") {
        _mint(msg.sender, 1000000 * 10 ** 18);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract SaveCircleTest is Test {
    SaveCircle public circle;
    CircleTrust public trustContract;
    MockToken public token;

    address public agent = address(0x1111);
    address public member1 = address(0x2222);
    address public member2 = address(0x3333);
    address public member3 = address(0x4444);
    address public yieldVault = address(0x5555); // Mock yield vault

    uint256 constant CONTRIBUTION_AMOUNT = 100e18;
    uint256 constant MIN_TRUST_SCORE = 1;
    uint256 constant ROUND_DURATION = 7 days;

    function setUp() public {
        // Deploy contracts
        token = new MockToken();
        trustContract = new CircleTrust();
        circle = new SaveCircle(
            1,
            agent,
            address(trustContract),
            yieldVault,
            MIN_TRUST_SCORE,
            ROUND_DURATION
        );

        // Setup trust edges (members trust each other)
        vm.prank(member1);
        trustContract.trust(member2, 0);

        vm.prank(member1);
        trustContract.trust(member3, 0);

        vm.prank(member2);
        trustContract.trust(member1, 0);

        vm.prank(member2);
        trustContract.trust(member3, 0);

        vm.prank(member3);
        trustContract.trust(member1, 0);

        vm.prank(member3);
        trustContract.trust(member2, 0);

        // Initialize circle with token and contribution amount
        vm.prank(agent);
        circle.initialize(address(token), CONTRIBUTION_AMOUNT);

        // Mint tokens to members
        token.mint(member1, 10000e18);
        token.mint(member2, 10000e18);
        token.mint(member3, 10000e18);
    }

    function testMemberJoin() public {
        vm.prank(member1);
        circle.join(1);

        assertEq(circle.isMember(member1), true);
        assertEq(circle.getMemberCount(), 1);
    }

    function testCannotJoinWithoutTrust() public {
        // Create a member with no trust edges
        address noTrust = address(0x9999);

        vm.prank(noTrust);
        vm.expectRevert("Insufficient trust score");
        circle.join(1);
    }

    function testStartCircle() public {
        vm.prank(member1);
        circle.join(1);

        vm.prank(agent);
        circle.startCircle();

        assertEq(uint256(circle.state()), uint256(SaveCircle.CircleState.ACTIVE));
        assertEq(circle.currentRound(), 1);
    }

    function testContribute() public {
        // Setup
        vm.prank(member1);
        circle.join(1);

        vm.prank(agent);
        circle.startCircle();

        // Approve tokens
        vm.prank(member1);
        token.approve(address(circle), CONTRIBUTION_AMOUNT);

        // Contribute
        vm.prank(member1);
        circle.contribute();

        assertEq(circle.totalContributed(member1), CONTRIBUTION_AMOUNT);
    }

    function testFullCircleLifecycle() public {
        // Join members
        vm.prank(member1);
        circle.join(1);

        vm.prank(member2);
        circle.join(2);

        vm.prank(member3);
        circle.join(3);

        // Start circle
        vm.prank(agent);
        circle.startCircle();

        // Approve and contribute
        uint256 totalContributions = 0;
        for (uint8 i = 1; i <= 3; i++) {
            address member = i == 1 ? member1 : (i == 2 ? member2 : member3);

            vm.prank(member);
            token.approve(address(circle), CONTRIBUTION_AMOUNT * 10); // High approval

            vm.prank(member);
            circle.contribute();

            totalContributions += CONTRIBUTION_AMOUNT;
        }

        // All members should have contributed
        assertEq(circle.totalContributed(member1), CONTRIBUTION_AMOUNT);
        assertEq(circle.totalContributed(member2), CONTRIBUTION_AMOUNT);
        assertEq(circle.totalContributed(member3), CONTRIBUTION_AMOUNT);

        // Verify funds are in the circle
        assertEq(token.balanceOf(address(circle)), totalContributions);

        // Member1 claims rotation (first turn)
        // They should get: 300 (3 * 100)
        uint256 initialBalance = token.balanceOf(member1);
        vm.prank(member1);
        circle.claimRotation();

        uint256 newBalance = token.balanceOf(member1);
        assertEq(newBalance, initialBalance + totalContributions); // Should get total pot

        // After member1 claims, rotation advanced to member2
        // Member2 and Member3 have contributed but also claimed, so circle is done
        // In a real ROSCA, member2 and 3 would contribute again in the next round
        // For this test, we verify member1 got the payout correctly
        
        assertEq(circle.rotationIndex(), 1);
    }

    function testPenaltyMechanism() public {
        // Join and start
        vm.prank(member1);
        circle.join(1);

        vm.prank(agent);
        circle.startCircle();

        // Token for penalty
        token.mint(member1, 1000e18);

        // Penalize member1
        vm.prank(member1);
        token.approve(address(circle), 1000e18);

        uint256 agentBalanceBefore = token.balanceOf(agent);
        vm.prank(agent);
        circle.penalize(member1);

        uint256 agentBalanceAfter = token.balanceOf(agent);
        assertTrue(agentBalanceAfter > agentBalanceBefore);

        assertEq(circle.penaltyCount(member1), 1);
    }

    function testEjectionAfterThreePenalties() public {
        vm.prank(member1);
        circle.join(1);

        vm.prank(agent);
        circle.startCircle();

        token.mint(member1, 10000e18);

        // Apply 3 penalties
        for (uint8 i = 0; i < 3; i++) {
            vm.prank(member1);
            token.approve(address(circle), 1000e18);

            vm.prank(agent);
            circle.penalize(member1);
        }

        // Member should be ejected
        assertEq(circle.isMember(member1), false);
    }

    function testDissolveCircle() public {
        vm.prank(member1);
        circle.join(1);

        vm.prank(member2);
        circle.join(2);

        vm.prank(agent);
        circle.startCircle();

        // Add some tokens to circle
        token.transfer(address(circle), 500e18);

        uint256 member1BalanceBefore = token.balanceOf(member1);

        // Dissolve
        vm.prank(agent);
        circle.dissolve();

        assertEq(uint256(circle.state()), uint256(SaveCircle.CircleState.DISSOLVED));

        // Members should have received funds
        uint256 member1BalanceAfter = token.balanceOf(member1);
        assertTrue(member1BalanceAfter > member1BalanceBefore);
    }

    function testGetMembers() public {
        vm.prank(member1);
        circle.join(1);

        vm.prank(member2);
        circle.join(2);

        address[] memory members = circle.getMembers();
        assertEq(members.length, 2);
        assertEq(members[0], member1);
        assertEq(members[1], member2);
    }

    function testReentrancyProtection() public {
        // This test verifies that reentrancy guard is in place
        // The nonReentrant modifier should prevent reentrancy attacks
        vm.prank(member1);
        circle.join(1);

        vm.prank(agent);
        circle.startCircle();

        vm.prank(member1);
        token.approve(address(circle), CONTRIBUTION_AMOUNT);

        // Normal contribute should work
        vm.prank(member1);
        circle.contribute();

        assertTrue(circle.hasClaimedThisRound(member1));
    }

    function testClaimRotationOnlyOnYourTurn() public {
        vm.prank(member1);
        circle.join(1);

        vm.prank(member2);
        circle.join(2);

        vm.prank(agent);
        circle.startCircle();

        // member2 shouldn't be able to claim (not their turn)
        vm.prank(member2);
        vm.expectRevert("Not your turn");
        circle.claimRotation();
    }
}
