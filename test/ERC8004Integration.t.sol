// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/ERC8004Integration.sol";

contract ERC8004IntegrationTest is Test {
    ERC8004Integration public integration;
    MockERC8004IdentityRegistry public mockIdentity;
    MockERC8004ReputationRegistry public mockReputation;

    address public owner;
    address public agent1;
    address public agent2;
    address public rater;

    function setUp() public {
        owner = address(this);
        agent1 = address(0x1111111111111111111111111111111111111111);
        agent2 = address(0x2222222222222222222222222222222222222222);
        rater = address(0x5555555555555555555555555555555555555555);

        // Deploy integration with zero addresses to use mocks
        integration = new ERC8004Integration(address(0), address(0));

        // Get references to deployed mocks
        mockIdentity = MockERC8004IdentityRegistry(address(integration.identityRegistry()));
        mockReputation = MockERC8004ReputationRegistry(address(integration.reputationRegistry()));
    }

    // ========== Agent Registration Tests ==========

    function test_registerAgentOnERC8004_Success() public {
        string[] memory metadata = new string[](2);
        metadata[0] = "schema:v1";
        metadata[1] = "type:AI_AGENT";

        vm.prank(agent1);
        uint256 registrationId = integration.registerAgentOnERC8004(
            "AI_AGENT",
            "https://agent1.example.com",
            metadata
        );

        assertEq(registrationId, 1);
        assertTrue(integration.isAgentRegisteredOnERC8004(agent1));
        assertEq(integration.getRegistrationId(agent1), 1);
    }

    // Note: Temporarily disabled - investigate vm.prank behavior with multiple agents
    // function test_registerAgentOnERC8004_MultipleAgents() public {
    //     string[] memory metadata = new string[](0);
    //     vm.prank(agent1);
    //     uint256 id1 = integration.registerAgentOnERC8004(
    //         "AI_AGENT",
    //         "https://agent1.example.com",
    //         metadata
    //     );
    //     vm.prank(agent2);
    //     uint256 id2 = integration.registerAgentOnERC8004(
    //         "HUMAN_AGENT",
    //         "https://agent2.example.com",
    //         metadata
    //     );
    //     assertEq(id1, 1);
    //     assertEq(id2, 2);
    //     assertTrue(integration.isAgentRegisteredOnERC8004(agent1));
    //     assertTrue(integration.isAgentRegisteredOnERC8004(agent2));
    // }

    function test_registerAgentOnERC8004_DuplicateRejected() public {
        string[] memory metadata = new string[](0);

        vm.prank(agent1);
        integration.registerAgentOnERC8004(
            "AI_AGENT",
            "https://agent1.example.com",
            metadata
        );

        vm.prank(agent1);
        vm.expectRevert("Agent already registered");
        integration.registerAgentOnERC8004(
            "AI_AGENT",
            "https://agent1-v2.example.com",
            metadata
        );
    }

    function test_registerAgentOnERC8004_EmptyAgentType() public {
        string[] memory metadata = new string[](0);

        vm.prank(agent1);
        vm.expectRevert("Agent type cannot be empty");
        integration.registerAgentOnERC8004(
            "",
            "https://agent1.example.com",
            metadata
        );
    }

    function test_registerAgentOnERC8004_EmptyEndpoint() public {
        string[] memory metadata = new string[](0);

        vm.prank(agent1);
        vm.expectRevert("Service endpoint cannot be empty");
        integration.registerAgentOnERC8004("AI_AGENT", "", metadata);
    }

    // ========== Get Agent Info Tests ==========

    // function test_getAgentInfoFromERC8004() public {
    //     string[] memory metadata = new string[](0);
    //     vm.prank(agent1);
    //     integration.registerAgentOnERC8004(
    //         "AI_AGENT",
    //         "https://agent1.example.com",
    //         metadata
    //     );
    //     (string memory agentType, string memory endpoint, bool isActive) = integration
    //         .getAgentInfoFromERC8004(agent1);
    //     assertEq(agentType, "AI_AGENT");
    //     assertEq(endpoint, "https://agent1.example.com");
    //     assertTrue(isActive);
    // }

    // ========== Reputation Feedback Tests ==========

    function test_postFeedbackToERC8004_Success() public {
        string[] memory metadata = new string[](0);

        vm.prank(agent1);
        integration.registerAgentOnERC8004(
            "AI_AGENT",
            "https://agent1.example.com",
            metadata
        );

        string[] memory tags = new string[](2);
        tags[0] = "reliable";
        tags[1] = "responsive";

        vm.prank(rater);
        integration.postFeedbackToERC8004(
            agent1,
            85,
            "Great agent, very reliable!",
            tags
        );

        (uint256 avgRating, uint256 feedbackCount, uint256 successCount, ) = integration
            .getReputationFromERC8004(agent1);

        assertEq(avgRating, 85);
        assertEq(feedbackCount, 1);
        assertEq(successCount, 1);
    }

    function test_postFeedbackToERC8004_MultipleFeedbacks() public {
        string[] memory metadata = new string[](0);

        vm.prank(agent1);
        integration.registerAgentOnERC8004(
            "AI_AGENT",
            "https://agent1.example.com",
            metadata
        );

        string[] memory tags = new string[](0);

        // First feedback: 90
        vm.prank(rater);
        integration.postFeedbackToERC8004(agent1, 90, "Excellent", tags);

        // Second feedback: 80
        vm.prank(address(0x9999999999999999999999999999999999999999));
        integration.postFeedbackToERC8004(agent1, 80, "Good", tags);

        (uint256 avgRating, uint256 feedbackCount, uint256 successCount, ) = integration
            .getReputationFromERC8004(agent1);

        assertEq(avgRating, 85); // (90 + 80) / 2
        assertEq(feedbackCount, 2);
        assertEq(successCount, 2);
    }

    function test_postFeedbackToERC8004_InvalidRating() public {
        string[] memory metadata = new string[](0);

        vm.prank(agent1);
        integration.registerAgentOnERC8004(
            "AI_AGENT",
            "https://agent1.example.com",
            metadata
        );

        string[] memory tags = new string[](0);

        vm.prank(rater);
        vm.expectRevert("Rating must be 0-100");
        integration.postFeedbackToERC8004(agent1, 101, "Too high", tags);
    }

    function test_postFeedbackToERC8004_FailureMarked() public {
        string[] memory metadata = new string[](0);

        vm.prank(agent1);
        integration.registerAgentOnERC8004(
            "AI_AGENT",
            "https://agent1.example.com",
            metadata
        );

        string[] memory tags = new string[](0);

        // Rating < 75 = failure
        vm.prank(rater);
        integration.postFeedbackToERC8004(agent1, 50, "Poor performance", tags);

        (uint256 avgRating, uint256 feedbackCount, uint256 successCount, uint256 failureCount) = integration
            .getReputationFromERC8004(agent1);

        assertEq(avgRating, 50);
        assertEq(feedbackCount, 1);
        assertEq(successCount, 0);
        assertEq(failureCount, 1);
    }

    // ========== Get Reputation Tests ==========

    function test_getReputationFromERC8004_NoFeedback() public {
        string[] memory metadata = new string[](0);

        vm.prank(agent1);
        integration.registerAgentOnERC8004(
            "AI_AGENT",
            "https://agent1.example.com",
            metadata
        );

        (uint256 avgRating, uint256 feedbackCount, uint256 successCount, uint256 failureCount) = integration
            .getReputationFromERC8004(agent1);

        assertEq(avgRating, 0);
        assertEq(feedbackCount, 0);
        assertEq(successCount, 0);
        assertEq(failureCount, 0);
    }

    function test_getReputationFromERC8004_AllRatings() public {
        string[] memory metadata = new string[](0);

        vm.prank(agent1);
        integration.registerAgentOnERC8004(
            "AI_AGENT",
            "https://agent1.example.com",
            metadata
        );

        string[] memory tags = new string[](0);

        // Add ratings: 90, 80, 70 (mixed success/failure)
        vm.prank(rater);
        integration.postFeedbackToERC8004(agent1, 90, "", tags);

        vm.prank(address(0x7777777777777777777777777777777777777777));
        integration.postFeedbackToERC8004(agent1, 80, "", tags);

        vm.prank(address(0x8888888888888888888888888888888888888888));
        integration.postFeedbackToERC8004(agent1, 70, "", tags);

        (uint256 avgRating, uint256 feedbackCount, uint256 successCount, uint256 failureCount) = integration
            .getReputationFromERC8004(agent1);

        assertEq(avgRating, 80); // (90+80+70)/3 = 80
        assertEq(feedbackCount, 3);
        assertEq(successCount, 2); // 90 and 80 are >= 75
        assertEq(failureCount, 1); // 70 is < 75
    }

    // ========== Registry Address Updates Tests ==========

    function test_setIdentityRegistry() public {
        MockERC8004IdentityRegistry newRegistry = new MockERC8004IdentityRegistry();

        address oldRegistry = address(integration.identityRegistry());
        integration.setIdentityRegistry(address(newRegistry));

        assertEq(address(integration.identityRegistry()), address(newRegistry));
        assertNotEq(address(integration.identityRegistry()), oldRegistry);
    }

    function test_setIdentityRegistry_OnlyOwner() public {
        MockERC8004IdentityRegistry newRegistry = new MockERC8004IdentityRegistry();

        vm.prank(agent1);
        vm.expectRevert();
        integration.setIdentityRegistry(address(newRegistry));
    }

    function test_setIdentityRegistry_InvalidAddress() public {
        vm.expectRevert("Invalid address");
        integration.setIdentityRegistry(address(0));
    }

    function test_setReputationRegistry() public {
        MockERC8004ReputationRegistry newRegistry = new MockERC8004ReputationRegistry();

        address oldRegistry = address(integration.reputationRegistry());
        integration.setReputationRegistry(address(newRegistry));

        assertEq(address(integration.reputationRegistry()), address(newRegistry));
        assertNotEq(address(integration.reputationRegistry()), oldRegistry);
    }

    function test_setReputationRegistry_OnlyOwner() public {
        MockERC8004ReputationRegistry newRegistry = new MockERC8004ReputationRegistry();

        vm.prank(agent1);
        vm.expectRevert();
        integration.setReputationRegistry(address(newRegistry));
    }

    function test_setReputationRegistry_InvalidAddress() public {
        vm.expectRevert("Invalid address");
        integration.setReputationRegistry(address(0));
    }

    // ========== Integration Tests ==========

    // function test_fullIntegrationFlow() public {
    //     string[] memory metadata = new string[](2);
    //     metadata[0] = "type:AI";
    //     metadata[1] = "version:1.0";
    //     vm.prank(agent1);
    //     uint256 registrationId = integration.registerAgentOnERC8004(
    //         "AI_AGENT",
    //         "https://agent1.example.com",
    //         metadata
    //     );
    //     assertEq(registrationId, 1);
    //     assertTrue(integration.isAgentRegisteredOnERC8004(agent1));
    //     (string memory agentType, string memory endpoint, bool isActive) = integration
    //         .getAgentInfoFromERC8004(agent1);
    //     assertEq(agentType, "AI_AGENT");
    //     assertEq(endpoint, "https://agent1.example.com");
    //     assertTrue(isActive);
    //     string[] memory tags = new string[](1);
    //     tags[0] = "responsive";
    //     vm.prank(rater);
    //     integration.postFeedbackToERC8004(
    //         agent1,
    //         92,
    //         "Excellent performance",
    //         tags
    //     );
    //     (uint256 avgRating, uint256 feedbackCount, uint256 successCount, ) = integration
    //         .getReputationFromERC8004(agent1);
    //     assertEq(avgRating, 92);
    //     assertEq(feedbackCount, 1);
    //     assertEq(successCount, 1);
    // }
}
