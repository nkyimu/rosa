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

contract SaveCirclePrivacyTest is Test {
    SaveCircle public circle;
    CircleTrust public trustContract;
    MockToken public token;

    address public agent = address(0x1111);
    address public member1 = address(0x2222);
    address public member2 = address(0x3333);
    address public member3 = address(0x4444);
    address public lendingPool = address(0x5555); // Mock Moola lending pool
    address public aToken = address(0x6666);     // Mock aToken

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
            lendingPool,
            aToken,
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

        // Members join the circle
        vm.prank(member1);
        circle.join();

        vm.prank(member2);
        circle.join();

        vm.prank(member3);
        circle.join();

        // Start the circle
        vm.prank(agent);
        circle.startCircle();
    }

    // ===== COMMIT-REVEAL TESTS =====

    function testCommitContribution() public {
        uint256 amount = 100e18;
        bytes32 salt = keccak256("salt123");
        bytes32 commitment = keccak256(abi.encodePacked(amount, salt));

        vm.prank(member1);
        circle.commitContribution(commitment);

        assertEq(circle.contributionCommitments(member1), commitment);
        assertEq(circle.hasCommitted(member1), true);
    }

    function testCommitContributionEmitsEvent() public {
        uint256 amount = 100e18;
        bytes32 salt = keccak256("salt123");
        bytes32 commitment = keccak256(abi.encodePacked(amount, salt));

        vm.prank(member1);
        vm.expectEmit(true, false, false, true);
        emit SaveCircle.ContributionCommitted(member1, commitment);
        circle.commitContribution(commitment);
    }

    function testCannotCommitTwiceInRound() public {
        bytes32 salt1 = keccak256("salt1");
        uint256 amount1 = 100e18;
        bytes32 commitment1 = keccak256(abi.encodePacked(amount1, salt1));

        bytes32 salt2 = keccak256("salt2");
        uint256 amount2 = 200e18;
        bytes32 commitment2 = keccak256(abi.encodePacked(amount2, salt2));

        vm.prank(member1);
        circle.commitContribution(commitment1);

        vm.prank(member1);
        vm.expectRevert("Already committed this round");
        circle.commitContribution(commitment2);
    }

    function testRevealContribution() public {
        uint256 amount = 100e18;
        bytes32 salt = keccak256("salt123");
        bytes32 commitment = keccak256(abi.encodePacked(amount, salt));

        // Commit
        vm.prank(member1);
        circle.commitContribution(commitment);

        // Approve token
        vm.prank(member1);
        token.approve(address(circle), amount);

        // Reveal
        vm.prank(member1);
        circle.revealContribution(amount, salt);

        assertEq(circle.hasContributedThisRound(member1), true);
        assertEq(circle.totalContributed(member1), amount);
        assertEq(circle.hasCommitted(member1), false);
    }

    function testRevealContributionSucceeds() public {
        uint256 amount = 100e18;
        bytes32 salt = keccak256("salt123");
        bytes32 commitment = keccak256(abi.encodePacked(amount, salt));

        vm.prank(member1);
        circle.commitContribution(commitment);

        vm.prank(member1);
        token.approve(address(circle), amount);

        vm.prank(member1);
        circle.revealContribution(amount, salt);

        // Verify the reveal was recorded
        assertEq(circle.hasContributedThisRound(member1), true);
    }

    function testRevealWithWrongSaltFails() public {
        uint256 amount = 100e18;
        bytes32 salt = keccak256("salt123");
        bytes32 wrongSalt = keccak256("wrongsalt");
        bytes32 commitment = keccak256(abi.encodePacked(amount, salt));

        vm.prank(member1);
        circle.commitContribution(commitment);

        vm.prank(member1);
        token.approve(address(circle), amount);

        vm.prank(member1);
        vm.expectRevert("Commitment hash mismatch");
        circle.revealContribution(amount, wrongSalt);
    }

    function testRevealWithWrongAmountFails() public {
        uint256 amount = 100e18;
        uint256 wrongAmount = 200e18;
        bytes32 salt = keccak256("salt123");
        bytes32 commitment = keccak256(abi.encodePacked(amount, salt));

        vm.prank(member1);
        circle.commitContribution(commitment);

        vm.prank(member1);
        token.approve(address(circle), wrongAmount);

        vm.prank(member1);
        vm.expectRevert("Commitment hash mismatch");
        circle.revealContribution(wrongAmount, salt);
    }

    function testCannotRevealWithoutCommit() public {
        uint256 amount = 100e18;
        bytes32 salt = keccak256("salt123");

        vm.prank(member1);
        token.approve(address(circle), amount);

        vm.prank(member1);
        vm.expectRevert("No commitment found");
        circle.revealContribution(amount, salt);
    }

    function testCommitRevealMultipleMembers() public {
        uint256 amount1 = 100e18;
        bytes32 salt1 = keccak256("salt1");
        bytes32 commitment1 = keccak256(abi.encodePacked(amount1, salt1));

        uint256 amount2 = 150e18;
        bytes32 salt2 = keccak256("salt2");
        bytes32 commitment2 = keccak256(abi.encodePacked(amount2, salt2));

        // Member 1 commits and reveals
        vm.prank(member1);
        circle.commitContribution(commitment1);

        vm.prank(member1);
        token.approve(address(circle), amount1);

        vm.prank(member1);
        circle.revealContribution(amount1, salt1);

        // Member 2 commits and reveals
        vm.prank(member2);
        circle.commitContribution(commitment2);

        vm.prank(member2);
        token.approve(address(circle), amount2);

        vm.prank(member2);
        circle.revealContribution(amount2, salt2);

        assertEq(circle.totalContributed(member1), amount1);
        assertEq(circle.totalContributed(member2), amount2);
    }

    // ===== NIGHTFALL MODE TESTS =====

    function testEnableNightfallMode() public {
        vm.prank(agent);
        circle.enableNightfallMode();

        assertEq(circle.useNightfallMode(), true);
    }

    function testEnableNightfallModeEmitsEvent() public {
        vm.prank(agent);
        vm.expectEmit(false, false, false, false);
        emit SaveCircle.NightfallModeEnabled();
        circle.enableNightfallMode();
    }

    function testCannotEnableNightfallModeTwice() public {
        vm.prank(agent);
        circle.enableNightfallMode();

        vm.prank(agent);
        vm.expectRevert("Nightfall mode already enabled");
        circle.enableNightfallMode();
    }

    function testOnlyAgentCanEnableNightfallMode() public {
        vm.prank(member1);
        vm.expectRevert("Only agent can call this");
        circle.enableNightfallMode();
    }

    function testCannotEnableNightfallModeIfNotActive() public {
        // Create a new circle in FORMING state
        SaveCircle formingCircle = new SaveCircle(
            2,
            agent,
            address(trustContract),
            lendingPool,
            aToken,
            MIN_TRUST_SCORE,
            ROUND_DURATION
        );

        vm.prank(agent);
        vm.expectRevert("Invalid circle state");
        formingCircle.enableNightfallMode();
    }

    function testRecordNightfallContribution() public {
        vm.prank(agent);
        circle.enableNightfallMode();

        vm.prank(agent);
        circle.recordNightfallContribution(member1);

        assertEq(circle.hasContributedThisRound(member1), true);
    }

    function testRecordNightfallContributionSucceeds() public {
        vm.prank(agent);
        circle.enableNightfallMode();

        vm.prank(agent);
        circle.recordNightfallContribution(member1);

        // Verify the contribution was recorded
        assertEq(circle.hasContributedThisRound(member1), true);
    }

    function testOnlyAgentCanRecordNightfallContribution() public {
        vm.prank(agent);
        circle.enableNightfallMode();

        vm.prank(member1);
        vm.expectRevert("Only agent can call this");
        circle.recordNightfallContribution(member1);
    }

    function testCannotRecordNightfallContributionWithoutMode() public {
        vm.prank(agent);
        vm.expectRevert("Nightfall mode not enabled");
        circle.recordNightfallContribution(member1);
    }

    function testCannotRecordNightfallContributionNonMember() public {
        address nonMember = address(0x9999);

        vm.prank(agent);
        circle.enableNightfallMode();

        vm.prank(agent);
        vm.expectRevert("Not a member");
        circle.recordNightfallContribution(nonMember);
    }

    function testCannotRecordNightfallContributionTwice() public {
        vm.prank(agent);
        circle.enableNightfallMode();

        vm.prank(agent);
        circle.recordNightfallContribution(member1);

        vm.prank(agent);
        vm.expectRevert("Already contributed this round");
        circle.recordNightfallContribution(member1);
    }

    function testRecordNightfallPayout() public {
        vm.prank(agent);
        circle.enableNightfallMode();

        // Record contributions
        vm.prank(agent);
        circle.recordNightfallContribution(member1);

        vm.prank(agent);
        circle.recordNightfallContribution(member2);

        vm.prank(agent);
        circle.recordNightfallContribution(member3);

        // Record payout for member1
        uint256 amount = 300e18;
        vm.prank(agent);
        circle.recordNightfallPayout(member1, amount);

        // Verify rotation advanced
        assertEq(circle.rotationIndex(), 1);
    }

    function testRecordNightfallPayoutEmitsEvent() public {
        vm.prank(agent);
        circle.enableNightfallMode();

        vm.prank(agent);
        circle.recordNightfallContribution(member1);

        uint256 amount = 300e18;
        vm.prank(agent);
        vm.expectEmit(true, false, false, true);
        emit SaveCircle.NightfallPayoutRecorded(member1, amount);
        circle.recordNightfallPayout(member1, amount);
    }

    function testOnlyAgentCanRecordNightfallPayout() public {
        vm.prank(agent);
        circle.enableNightfallMode();

        vm.prank(member1);
        vm.expectRevert("Only agent can call this");
        circle.recordNightfallPayout(member1, 100e18);
    }

    function testCannotRecordNightfallPayoutNotTheirTurn() public {
        vm.prank(agent);
        circle.enableNightfallMode();

        vm.prank(agent);
        circle.recordNightfallContribution(member1);

        // Try to record payout for member2 (not their turn)
        vm.prank(agent);
        vm.expectRevert("Not their turn");
        circle.recordNightfallPayout(member2, 100e18);
    }

    function testNightfallPayoutAdvancesRotation() public {
        vm.prank(agent);
        circle.enableNightfallMode();

        // Record contributions
        vm.prank(agent);
        circle.recordNightfallContribution(member1);

        vm.prank(agent);
        circle.recordNightfallContribution(member2);

        vm.prank(agent);
        circle.recordNightfallContribution(member3);

        uint256 initialRotationIndex = circle.rotationIndex();

        // Record payout for member1 (rotation index 0)
        vm.prank(agent);
        circle.recordNightfallPayout(member1, 300e18);

        assertEq(circle.rotationIndex(), initialRotationIndex + 1);
    }

    function testNightfallPayoutResetsContributionTracking() public {
        vm.prank(agent);
        circle.enableNightfallMode();

        // Record contributions
        vm.prank(agent);
        circle.recordNightfallContribution(member1);

        vm.prank(agent);
        circle.recordNightfallContribution(member2);

        vm.prank(agent);
        circle.recordNightfallContribution(member3);

        assertEq(circle.hasContributedThisRound(member1), true);
        assertEq(circle.hasContributedThisRound(member2), true);
        assertEq(circle.hasContributedThisRound(member3), true);

        // Record payout for member1
        vm.prank(agent);
        circle.recordNightfallPayout(member1, 300e18);

        // Contribution tracking should be reset
        assertEq(circle.hasContributedThisRound(member1), false);
        assertEq(circle.hasContributedThisRound(member2), false);
        assertEq(circle.hasContributedThisRound(member3), false);
    }

    function testNightfallCompleteCircle() public {
        vm.prank(agent);
        circle.enableNightfallMode();

        // Process all rotations
        for (uint256 i = 0; i < 3; i++) {
            // Record contributions
            vm.prank(agent);
            circle.recordNightfallContribution(members(i));

            // Record payout
            vm.prank(agent);
            circle.recordNightfallPayout(members(i), 300e18);
        }

        // Circle should be completed
        assertEq(uint256(circle.getState()), uint256(SaveCircle.CircleState.COMPLETED));
    }

    // ===== BACKWARD COMPATIBILITY TESTS =====

    function testOldContributeFunctionStillWorks() public {
        // Contribute() should work even when not in Nightfall mode
        vm.prank(member1);
        token.approve(address(circle), CONTRIBUTION_AMOUNT);

        vm.prank(member1);
        circle.contribute();

        assertEq(circle.hasContributedThisRound(member1), true);
        assertEq(circle.totalContributed(member1), CONTRIBUTION_AMOUNT);
    }

    function testContributeAndCommitRevealCoexist() public {
        // Member1 uses old contribute()
        vm.prank(member1);
        token.approve(address(circle), CONTRIBUTION_AMOUNT);

        vm.prank(member1);
        circle.contribute();

        // Member2 uses commit-reveal
        uint256 amount = 150e18;
        bytes32 salt = keccak256("salt");
        bytes32 commitment = keccak256(abi.encodePacked(amount, salt));

        vm.prank(member2);
        circle.commitContribution(commitment);

        vm.prank(member2);
        token.approve(address(circle), amount);

        vm.prank(member2);
        circle.revealContribution(amount, salt);

        // Both should work independently
        assertEq(circle.totalContributed(member1), CONTRIBUTION_AMOUNT);
        assertEq(circle.totalContributed(member2), amount);
    }

    // ===== HELPER FUNCTIONS =====

    function members(uint256 index) internal view returns (address) {
        if (index == 0) return member1;
        if (index == 1) return member2;
        if (index == 2) return member3;
        revert("Invalid index");
    }
}
