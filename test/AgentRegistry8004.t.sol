// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/AgentRegistry8004.sol";

contract AgentRegistry8004Test is Test {
    AgentRegistry8004 public registry;
    address public owner;
    address public agent1;
    address public agent2;
    address public reporter;
    address public unauthorized;

    event AgentRegistered(
        address indexed agent,
        string name,
        string serviceEndpoint,
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
        reporter = address(0x3333333333333333333333333333333333333333);
        unauthorized = address(0x4444444444444444444444444444444444444444);
    }

    // ========== Registration Tests ==========

    function test_RegisterAgent_Success() public {
        vm.prank(agent1);
        vm.expectEmit(true, false, false, true);
        emit AgentRegistered(agent1, "TestAgent", "https://agent.example.com", block.timestamp);

        registry.registerAgent("TestAgent", "https://agent.example.com");

        // Verify agent is registered
        assert(registry.isAgentRegistered(agent1));

        // Get agent info
        AgentRegistry8004.AgentInfo memory info = registry.agentInfo(agent1);
        assertEq(info.name, "TestAgent");
        assertEq(info.serviceEndpoint, "https://agent.example.com");
        assertEq(info.successCount, 0);
        assertEq(info.failureCount, 0);
        assertEq(info.registrationTimestamp, block.timestamp);
        assert(info.isRegistered);
    }

    function test_RegisterAgent_DuplicateRejection() public {
        vm.prank(agent1);
        registry.registerAgent("TestAgent", "https://agent.example.com");

        // Try to register again
        vm.prank(agent1);
        vm.expectRevert("Agent already registered");
        registry.registerAgent("TestAgent2", "https://agent2.example.com");
    }

    function test_RegisterAgent_EmptyName() public {
        vm.prank(agent1);
        vm.expectRevert("Name cannot be empty");
        registry.registerAgent("", "https://agent.example.com");
    }

    function test_RegisterAgent_EmptyEndpoint() public {
        vm.prank(agent1);
        vm.expectRevert("Service endpoint cannot be empty");
        registry.registerAgent("TestAgent", "");
    }

    function test_MultipleAgentsRegistration() public {
        vm.prank(agent1);
        registry.registerAgent("Agent1", "https://agent1.example.com");

        vm.prank(agent2);
        registry.registerAgent("Agent2", "https://agent2.example.com");

        // Verify both are registered
        assert(registry.isAgentRegistered(agent1));
        assert(registry.isAgentRegistered(agent2));

        // Check agent list
        address[] memory agents = registry.getRegisteredAgents();
        assertEq(agents.length, 2);
        assertEq(registry.getAgentCount(), 2);
    }

    // ========== Reputation System Tests ==========

    function test_GetReputation_Unregistered() public {
        vm.expectRevert("Agent not registered");
        registry.getReputation(agent1);
    }

    function test_GetReputation_InitialState() public {
        vm.prank(agent1);
        registry.registerAgent("TestAgent", "https://agent.example.com");

        (uint256 success, uint256 failure, uint256 score) = registry.getReputation(agent1);

        assertEq(success, 0);
        assertEq(failure, 0);
        assertEq(score, 0);
    }

    function test_ReportSuccess() public {
        // Register agent and authorize reporter
        vm.prank(agent1);
        registry.registerAgent("TestAgent", "https://agent.example.com");

        registry.authorizeReporter(reporter);

        // Report success
        vm.prank(reporter);
        vm.expectEmit(true, true, false, true);
        emit SuccessReported(agent1, reporter, 1);

        registry.reportSuccess(agent1);

        // Check reputation
        (uint256 success, uint256 failure, uint256 score) = registry.getReputation(agent1);

        assertEq(success, 1);
        assertEq(failure, 0);
        assertEq(score, 10000); // 100% (scaled by 10000)
    }

    function test_ReportFailure() public {
        // Register agent and authorize reporter
        vm.prank(agent1);
        registry.registerAgent("TestAgent", "https://agent.example.com");

        registry.authorizeReporter(reporter);

        // Report failure
        vm.prank(reporter);
        vm.expectEmit(true, true, false, true);
        emit FailureReported(agent1, reporter, 1);

        registry.reportFailure(agent1);

        // Check reputation
        (uint256 success, uint256 failure, uint256 score) = registry.getReputation(agent1);

        assertEq(success, 0);
        assertEq(failure, 1);
        assertEq(score, 0); // 0% (scaled by 10000)
    }

    // ========== Score Calculation Tests ==========

    function test_ScoreCalculation_50Percent() public {
        vm.prank(agent1);
        registry.registerAgent("TestAgent", "https://agent.example.com");

        registry.authorizeReporter(reporter);

        // Report 1 success and 1 failure
        vm.prank(reporter);
        registry.reportSuccess(agent1);

        vm.prank(reporter);
        registry.reportFailure(agent1);

        (uint256 success, uint256 failure, uint256 score) = registry.getReputation(agent1);

        assertEq(success, 1);
        assertEq(failure, 1);
        assertEq(score, 5000); // 50% (scaled by 10000)
    }

    function test_ScoreCalculation_87Percent() public {
        vm.prank(agent1);
        registry.registerAgent("TestAgent", "https://agent.example.com");

        registry.authorizeReporter(reporter);

        // Report 87 successes and 13 failures
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
        assertEq(score, 8700); // 87% (scaled by 10000)
    }

    // ========== Authorization Tests ==========

    function test_UnauthorizedReporterCannotReport() public {
        vm.prank(agent1);
        registry.registerAgent("TestAgent", "https://agent.example.com");

        // Try to report without authorization
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

        // Now reporting should fail
        vm.prank(agent1);
        registry.registerAgent("TestAgent", "https://agent.example.com");

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
        registry.registerAgent("MyAgent", "https://myagent.io");

        AgentRegistry8004.AgentInfo memory info = registry.agentInfo(agent1);

        assertEq(info.name, "MyAgent");
        assertEq(info.serviceEndpoint, "https://myagent.io");
        assertEq(info.successCount, 0);
        assertEq(info.failureCount, 0);
        assertEq(info.registrationTimestamp, block.timestamp);
        assert(info.isRegistered);
    }

    // ========== Integration Tests ==========

    function test_IntegrationFullFlow() public {
        // Register an agent
        vm.prank(agent1);
        registry.registerAgent("CircleAgent", "ipfs://QmXyz123");

        // Authorize reporter (simulating SaveCircle contract)
        registry.authorizeReporter(reporter);

        // Simulate multiple successful rounds
        for (uint256 i = 0; i < 5; i++) {
            vm.prank(reporter);
            registry.reportSuccess(agent1);
        }

        // Simulate a failure
        vm.prank(reporter);
        registry.reportFailure(agent1);

        // Check final reputation
        (uint256 success, uint256 failure, uint256 score) = registry.getReputation(agent1);

        assertEq(success, 5);
        assertEq(failure, 1);
        assertEq(score, 8333); // ~83.33% (scaled by 10000)

        // Verify agent is discoverable
        address[] memory agents = registry.getRegisteredAgents();
        assertEq(agents.length, 1);
        assertEq(agents[0], agent1);
    }

    function test_IntegrationMultipleAgentsWithReporters() public {
        // Register multiple agents
        vm.prank(agent1);
        registry.registerAgent("Agent1", "https://agent1.io");

        vm.prank(agent2);
        registry.registerAgent("Agent2", "https://agent2.io");

        // Authorize multiple reporters
        address reporter1 = address(0x5555555555555555555555555555555555555555);
        address reporter2 = address(0x6666666666666666666666666666666666666666);

        registry.authorizeReporter(reporter1);
        registry.authorizeReporter(reporter2);

        // Report on agent1 from reporter1
        vm.prank(reporter1);
        registry.reportSuccess(agent1);

        vm.prank(reporter1);
        registry.reportSuccess(agent1);

        // Report on agent2 from reporter2
        vm.prank(reporter2);
        registry.reportFailure(agent2);

        // Check independent reputations
        (uint256 success1, uint256 failure1, uint256 score1) = registry.getReputation(agent1);
        (uint256 success2, uint256 failure2, uint256 score2) = registry.getReputation(agent2);

        assertEq(success1, 2);
        assertEq(failure1, 0);
        assertEq(score1, 10000);

        assertEq(success2, 0);
        assertEq(failure2, 1);
        assertEq(score2, 0);
    }

    // ========== ERC-165 Tests ==========

    function test_SupportsInterface_ERC165() public view {
        assert(registry.supportsInterface(type(ERC165).interfaceId));
    }

    function test_SupportsInterface_This() public view {
        // Test placeholder ERC-8004 interface ID
        assert(registry.supportsInterface(0x12345678));
    }

    function test_SupportsInterface_Unsupported() public view {
        assert(!registry.supportsInterface(0xffffffff));
    }
}
