// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/AgentRegistry8004.sol";

contract AgentRegistry8004Test is Test {
    AgentRegistry8004 public registry;
    address public owner;
    address public agent1;
    address public agent2;
    address public rater1;
    address public rater2;
    address public reporter;
    address public unauthorized;

    event AgentRegistered(
        address indexed agent,
        string name,
        string serviceEndpoint,
        string agentURI,
        uint256 indexed tokenId,
        uint256 timestamp
    );

    event FeedbackGiven(
        address indexed agent,
        address indexed rater,
        string tagName,
        uint256 value,
        string comment,
        uint256 timestamp
    );

    event SuccessReported(
        address indexed agent,
        address indexed reporter,
        uint256 newSuccessCount
    );

    event FailureReported(
        address indexed agent,
        address indexed reporter,
        uint256 newFailureCount
    );

    function setUp() public {
        registry = new AgentRegistry8004();
        owner = address(this);
        agent1 = address(0x1111111111111111111111111111111111111111);
        agent2 = address(0x2222222222222222222222222222222222222222);
        rater1 = address(0x5555555555555555555555555555555555555555);
        rater2 = address(0x6666666666666666666666666666666666666666);
        reporter = address(0x3333333333333333333333333333333333333333);
        unauthorized = address(0x4444444444444444444444444444444444444444);
    }

    // ========== Registration Tests ==========

    function test_RegisterAgent_Success() public {
        vm.prank(agent1);
        vm.expectEmit(true, true, false, true);
        emit AgentRegistered(
            agent1,
            "TestAgent",
            "https://agent.example.com",
            "ipfs://QmXyz123",
            0,
            block.timestamp
        );

        registry.registerAgent(
            "TestAgent",
            "https://agent.example.com",
            "ipfs://QmXyz123"
        );

        // Verify agent is registered
        assert(registry.isAgentRegistered(agent1));

        // Get agent info
        AgentRegistry8004.AgentInfo memory info = registry.agentInfo(agent1);
        assertEq(info.name, "TestAgent");
        assertEq(info.serviceEndpoint, "https://agent.example.com");
        assertEq(info.agentURI, "ipfs://QmXyz123");
        assertEq(info.successCount, 0);
        assertEq(info.failureCount, 0);
        assertEq(info.registrationTimestamp, block.timestamp);
        assert(info.isRegistered);
        assertEq(info.owner, agent1);

        // Verify NFT was minted
        assertEq(registry.balanceOf(agent1), 1);
        assertEq(registry.getAgentTokenId(agent1), 0);
    }

    function test_RegisterAgent_DuplicateRejection() public {
        vm.prank(agent1);
        registry.registerAgent(
            "TestAgent",
            "https://agent.example.com",
            "ipfs://QmXyz123"
        );

        // Try to register again
        vm.prank(agent1);
        vm.expectRevert("Agent already registered");
        registry.registerAgent("TestAgent2", "https://agent2.example.com", "ipfs://QmAbc456");
    }

    function test_RegisterAgent_EmptyName() public {
        vm.prank(agent1);
        vm.expectRevert("Name cannot be empty");
        registry.registerAgent("", "https://agent.example.com", "ipfs://QmXyz123");
    }

    function test_RegisterAgent_EmptyEndpoint() public {
        vm.prank(agent1);
        vm.expectRevert("Service endpoint cannot be empty");
        registry.registerAgent("TestAgent", "", "ipfs://QmXyz123");
    }

    function test_RegisterAgent_EmptyAgentURI() public {
        vm.prank(agent1);
        vm.expectRevert("Agent URI cannot be empty");
        registry.registerAgent("TestAgent", "https://agent.example.com", "");
    }

    function test_MultipleAgentsRegistration() public {
        vm.prank(agent1);
        registry.registerAgent(
            "Agent1",
            "https://agent1.example.com",
            "ipfs://QmAgent1"
        );

        vm.prank(agent2);
        registry.registerAgent(
            "Agent2",
            "https://agent2.example.com",
            "ipfs://QmAgent2"
        );

        // Verify both are registered
        assert(registry.isAgentRegistered(agent1));
        assert(registry.isAgentRegistered(agent2));

        // Check agent list
        address[] memory agents = registry.getRegisteredAgents();
        assertEq(agents.length, 2);
        assertEq(registry.getAgentCount(), 2);

        // Verify NFTs were minted
        assertEq(registry.balanceOf(agent1), 1);
        assertEq(registry.balanceOf(agent2), 1);
    }

    // ========== Agent URI Tests ==========

    function test_AgentURI_Success() public {
        vm.prank(agent1);
        registry.registerAgent(
            "TestAgent",
            "https://agent.example.com",
            "ipfs://QmOriginal"
        );

        uint256 tokenId = registry.getAgentTokenId(agent1);
        string memory uri = registry.agentURI(tokenId);

        assertEq(uri, "ipfs://QmOriginal");
    }

    function test_UpdateAgentURI_ByOwner() public {
        vm.prank(agent1);
        registry.registerAgent(
            "TestAgent",
            "https://agent.example.com",
            "ipfs://QmOriginal"
        );

        vm.prank(agent1);
        registry.updateAgentURI(agent1, "ipfs://QmUpdated");

        uint256 tokenId = registry.getAgentTokenId(agent1);
        string memory uri = registry.agentURI(tokenId);

        assertEq(uri, "ipfs://QmUpdated");
    }

    // ========== Feedback System Tests ==========

    function test_GiveFeedback_Starred() public {
        vm.prank(agent1);
        registry.registerAgent(
            "TestAgent",
            "https://agent.example.com",
            "ipfs://QmXyz123"
        );

        vm.prank(rater1);
        vm.expectEmit(true, true, false, true);
        emit FeedbackGiven(agent1, rater1, "starred", 95, "Great agent!", block.timestamp);

        registry.giveFeedback(agent1, "starred", 95, "Great agent!");

        // Get feedback
        (uint256 average, uint256 count) = registry.getTagReputation(agent1, "starred");

        assertEq(average, 95);
        assertEq(count, 1);
    }

    function test_GiveFeedback_MultipleRaters() public {
        vm.prank(agent1);
        registry.registerAgent(
            "TestAgent",
            "https://agent.example.com",
            "ipfs://QmXyz123"
        );

        // First rater gives 100
        vm.prank(rater1);
        registry.giveFeedback(agent1, "starred", 100, "Excellent!");

        // Second rater gives 90
        vm.prank(rater2);
        registry.giveFeedback(agent1, "starred", 90, "Good!");

        (uint256 average, uint256 count) = registry.getTagReputation(agent1, "starred");

        assertEq(average, 95); // (100 + 90) / 2
        assertEq(count, 2);
    }

    function test_GiveFeedback_AllTags() public {
        vm.prank(agent1);
        registry.registerAgent(
            "TestAgent",
            "https://agent.example.com",
            "ipfs://QmXyz123"
        );

        // Test all allowed tags
        vm.prank(rater1);
        registry.giveFeedback(agent1, "starred", 85, "Good");

        vm.prank(rater1);
        registry.giveFeedback(agent1, "uptime", 99, "Always up");

        vm.prank(rater1);
        registry.giveFeedback(agent1, "successRate", 95, "Very reliable");

        vm.prank(rater1);
        registry.giveFeedback(agent1, "responseTime", 100, "Fast");

        vm.prank(rater1);
        registry.giveFeedback(agent1, "reachable", 100, "Always reachable");

        // All should be recorded
        (uint256 starred, uint256 starredCount) = registry.getTagReputation(
            agent1,
            "starred"
        );
        (uint256 uptime, uint256 uptimeCount) = registry.getTagReputation(agent1, "uptime");

        assertEq(starred, 85);
        assertEq(starredCount, 1);
        assertEq(uptime, 99);
        assertEq(uptimeCount, 1);
    }

    function test_GiveFeedback_SelfRatingPrevention() public {
        vm.prank(agent1);
        registry.registerAgent(
            "TestAgent",
            "https://agent.example.com",
            "ipfs://QmXyz123"
        );

        // Agent cannot rate itself
        vm.prank(agent1);
        vm.expectRevert("Cannot rate own agent");
        registry.giveFeedback(agent1, "starred", 100, "Self rate");
    }

    function test_GiveFeedback_InvalidTag() public {
        vm.prank(agent1);
        registry.registerAgent(
            "TestAgent",
            "https://agent.example.com",
            "ipfs://QmXyz123"
        );

        vm.prank(rater1);
        vm.expectRevert("Tag not allowed");
        registry.giveFeedback(agent1, "invalidTag", 50, "Invalid");
    }

    function test_GiveFeedback_ValueOutOfRange() public {
        vm.prank(agent1);
        registry.registerAgent(
            "TestAgent",
            "https://agent.example.com",
            "ipfs://QmXyz123"
        );

        vm.prank(rater1);
        vm.expectRevert("Value must be 0-100");
        registry.giveFeedback(agent1, "starred", 101, "Too high");
    }

    function test_GetAllFeedback() public {
        vm.prank(agent1);
        registry.registerAgent(
            "TestAgent",
            "https://agent.example.com",
            "ipfs://QmXyz123"
        );

        vm.prank(rater1);
        registry.giveFeedback(agent1, "starred", 95, "Great!");

        vm.prank(rater2);
        registry.giveFeedback(agent1, "uptime", 100, "Perfect uptime");

        AgentRegistry8004.ReputationTag[] memory feedback = registry.getAllFeedback(agent1);

        assertEq(feedback.length, 2);
        assertEq(feedback[0].value, 95);
        assertEq(feedback[1].value, 100);
    }

    // ========== Reputation System Tests ==========

    function test_GetReputation_Unregistered() public {
        vm.expectRevert("Agent not registered");
        registry.getReputation(agent1);
    }

    function test_GetReputation_InitialState() public {
        vm.prank(agent1);
        registry.registerAgent(
            "TestAgent",
            "https://agent.example.com",
            "ipfs://QmXyz123"
        );

        (uint256 success, uint256 failure, uint256 score) = registry.getReputation(agent1);

        assertEq(success, 0);
        assertEq(failure, 0);
        assertEq(score, 0);
    }

    function test_ReportSuccess() public {
        vm.prank(agent1);
        registry.registerAgent(
            "TestAgent",
            "https://agent.example.com",
            "ipfs://QmXyz123"
        );

        registry.authorizeReporter(reporter);

        vm.prank(reporter);
        vm.expectEmit(true, true, false, true);
        emit SuccessReported(agent1, reporter, 1);

        registry.reportSuccess(agent1);

        (uint256 success, uint256 failure, uint256 score) = registry.getReputation(agent1);

        assertEq(success, 1);
        assertEq(failure, 0);
        assertEq(score, 10000); // 100%
    }

    function test_ReportFailure() public {
        vm.prank(agent1);
        registry.registerAgent(
            "TestAgent",
            "https://agent.example.com",
            "ipfs://QmXyz123"
        );

        registry.authorizeReporter(reporter);

        vm.prank(reporter);
        vm.expectEmit(true, true, false, true);
        emit FailureReported(agent1, reporter, 1);

        registry.reportFailure(agent1);

        (uint256 success, uint256 failure, uint256 score) = registry.getReputation(agent1);

        assertEq(success, 0);
        assertEq(failure, 1);
        assertEq(score, 0); // 0%
    }

    // ========== Score Calculation Tests ==========

    function test_ScoreCalculation_50Percent() public {
        vm.prank(agent1);
        registry.registerAgent(
            "TestAgent",
            "https://agent.example.com",
            "ipfs://QmXyz123"
        );

        registry.authorizeReporter(reporter);

        vm.prank(reporter);
        registry.reportSuccess(agent1);

        vm.prank(reporter);
        registry.reportFailure(agent1);

        (uint256 success, uint256 failure, uint256 score) = registry.getReputation(agent1);

        assertEq(success, 1);
        assertEq(failure, 1);
        assertEq(score, 5000); // 50%
    }

    function test_ScoreCalculation_87Percent() public {
        vm.prank(agent1);
        registry.registerAgent(
            "TestAgent",
            "https://agent.example.com",
            "ipfs://QmXyz123"
        );

        registry.authorizeReporter(reporter);

        for (uint256 i = 0; i < 87; i++) {
            vm.prank(reporter);
            registry.reportSuccess(agent1);
        }

        for (uint256 i = 0; i < 13; i++) {
            vm.prank(reporter);
            registry.reportFailure(agent1);
        }

        (uint256 success, uint256 failure, uint256 score) = registry.getReputation(agent1);

        assertEq(success, 87);
        assertEq(failure, 13);
        assertEq(score, 8700); // 87%
    }

    // ========== Authorization Tests ==========

    function test_UnauthorizedReporterCannotReport() public {
        vm.prank(agent1);
        registry.registerAgent(
            "TestAgent",
            "https://agent.example.com",
            "ipfs://QmXyz123"
        );

        vm.prank(unauthorized);
        vm.expectRevert("Not an authorized reporter");
        registry.reportSuccess(agent1);

        vm.prank(unauthorized);
        vm.expectRevert("Not an authorized reporter");
        registry.reportFailure(agent1);
    }

    function test_AuthorizeReporter() public {
        registry.authorizeReporter(reporter);

        assert(registry.authorizedReporters(reporter));
    }

    function test_AuthorizeReporter_DuplicateRejection() public {
        registry.authorizeReporter(reporter);

        vm.expectRevert("Reporter already authorized");
        registry.authorizeReporter(reporter);
    }

    function test_DeauthorizeReporter() public {
        registry.authorizeReporter(reporter);
        assert(registry.authorizedReporters(reporter));

        registry.deauthorizeReporter(reporter);
        assert(!registry.authorizedReporters(reporter));

        vm.prank(agent1);
        registry.registerAgent(
            "TestAgent",
            "https://agent.example.com",
            "ipfs://QmXyz123"
        );

        vm.prank(reporter);
        vm.expectRevert("Not an authorized reporter");
        registry.reportSuccess(agent1);
    }

    function test_OnlyOwnerCanAuthorize() public {
        vm.prank(unauthorized);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, unauthorized));
        registry.authorizeReporter(reporter);
    }

    // ========== Agent Info Tests ==========

    function test_AgentInfo_NotRegistered() public {
        vm.expectRevert("Agent not registered");
        registry.agentInfo(agent1);
    }

    function test_AgentInfo_ReturnsCorrectData() public {
        vm.prank(agent1);
        registry.registerAgent("MyAgent", "https://myagent.io", "ipfs://QmAgent");

        AgentRegistry8004.AgentInfo memory info = registry.agentInfo(agent1);

        assertEq(info.name, "MyAgent");
        assertEq(info.serviceEndpoint, "https://myagent.io");
        assertEq(info.agentURI, "ipfs://QmAgent");
        assertEq(info.successCount, 0);
        assertEq(info.failureCount, 0);
        assertEq(info.registrationTimestamp, block.timestamp);
        assert(info.isRegistered);
        assertEq(info.owner, agent1);
    }

    // ========== NFT Tests ==========

    function test_NFT_Minting_OnRegistration() public {
        vm.prank(agent1);
        registry.registerAgent(
            "TestAgent",
            "https://agent.example.com",
            "ipfs://QmXyz123"
        );

        // Check that agent1 owns the NFT
        assertEq(registry.balanceOf(agent1), 1);

        // Check the token ID
        uint256 tokenId = registry.getAgentTokenId(agent1);
        assertEq(tokenId, 0);

        // Check ownership
        assertEq(registry.ownerOf(0), agent1);
    }

    function test_NFT_MultipleTokenIds() public {
        vm.prank(agent1);
        registry.registerAgent(
            "Agent1",
            "https://agent1.example.com",
            "ipfs://QmAgent1"
        );

        vm.prank(agent2);
        registry.registerAgent(
            "Agent2",
            "https://agent2.example.com",
            "ipfs://QmAgent2"
        );

        uint256 tokenId1 = registry.getAgentTokenId(agent1);
        uint256 tokenId2 = registry.getAgentTokenId(agent2);

        assertEq(tokenId1, 0);
        assertEq(tokenId2, 1);
    }

    // ========== Integration Tests ==========

    function test_IntegrationFullFlow() public {
        // Register agent
        vm.prank(agent1);
        registry.registerAgent(
            "CircleAgent",
            "ipfs://QmCircle",
            "ipfs://QmCircleURI"
        );

        // Add feedback from community
        vm.prank(rater1);
        registry.giveFeedback(agent1, "starred", 95, "Excellent");

        vm.prank(rater2);
        registry.giveFeedback(agent1, "starred", 90, "Great");

        // Authorize reporter and report success/failure
        registry.authorizeReporter(reporter);

        for (uint256 i = 0; i < 5; i++) {
            vm.prank(reporter);
            registry.reportSuccess(agent1);
        }

        vm.prank(reporter);
        registry.reportFailure(agent1);

        // Check final reputation
        (uint256 success, uint256 failure, uint256 score) = registry.getReputation(agent1);

        assertEq(success, 5);
        assertEq(failure, 1);
        assertEq(score, 8333); // ~83.33%

        // Check feedback reputation
        (uint256 avg, uint256 count) = registry.getTagReputation(agent1, "starred");
        assertEq(avg, 92); // (95 + 90) / 2
        assertEq(count, 2);

        // Verify agent is discoverable
        address[] memory agents = registry.getRegisteredAgents();
        assertEq(agents.length, 1);
        assertEq(agents[0], agent1);

        // Verify NFT
        assertEq(registry.balanceOf(agent1), 1);
    }

    function test_IntegrationMultipleAgentsWithFeedback() public {
        // Register agents
        vm.prank(agent1);
        registry.registerAgent("Agent1", "https://agent1.io", "ipfs://QmAgent1");

        vm.prank(agent2);
        registry.registerAgent("Agent2", "https://agent2.io", "ipfs://QmAgent2");

        // Agent1 receives high feedback
        vm.prank(rater1);
        registry.giveFeedback(agent1, "starred", 100, "Perfect");

        // Agent2 receives lower feedback
        vm.prank(rater1);
        registry.giveFeedback(agent2, "starred", 50, "Needs improvement");

        // Check independent reputations
        (uint256 avg1, uint256 count1) = registry.getTagReputation(agent1, "starred");
        (uint256 avg2, uint256 count2) = registry.getTagReputation(agent2, "starred");

        assertEq(avg1, 100);
        assertEq(count1, 1);
        assertEq(avg2, 50);
        assertEq(count2, 1);

        // Both have NFTs
        assertEq(registry.balanceOf(agent1), 1);
        assertEq(registry.balanceOf(agent2), 1);
    }
}
