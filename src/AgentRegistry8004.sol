// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";

/**
 * @title AgentRegistry8004
 * @dev Minimal ERC-8004 compliant agent registration and reputation contract for IntentCircles
 *
 * Implements agent registration with service endpoints and reputation tracking.
 * Only authorized contracts can report success/failure events.
 */
contract AgentRegistry8004 is Ownable, ERC165 {
    /**
     * @dev Agent information structure
     */
    struct AgentInfo {
        string name;
        string serviceEndpoint;
        uint256 successCount;
        uint256 failureCount;
        uint256 registrationTimestamp;
        bool isRegistered;
    }

    /// @dev Mapping from agent address to agent info
    mapping(address => AgentInfo) public agents;

    /// @dev Mapping of authorized contracts that can report success/failure
    mapping(address => bool) public authorizedReporters;

    /// @dev Array of all registered agent addresses
    address[] public registeredAgentsList;

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

    event ReporterAuthorized(address indexed reporter);
    event ReporterDeauthorized(address indexed reporter);

    modifier onlyAuthorizedReporter() {
        require(authorizedReporters[msg.sender], "Not an authorized reporter");
        _;
    }

    /**
     * @dev Initialize with owner
     */
    constructor() Ownable(msg.sender) {}

    /**
     * @dev Register an agent (can be called by agent itself or by owner)
     * @param name Agent's display name
     * @param serviceEndpoint Agent's service endpoint (e.g., HTTPS URL or MCP endpoint)
     */
    function registerAgent(string calldata name, string calldata serviceEndpoint)
        external
    {
        require(bytes(name).length > 0, "Name cannot be empty");
        require(bytes(serviceEndpoint).length > 0, "Service endpoint cannot be empty");
        require(!agents[msg.sender].isRegistered, "Agent already registered");

        agents[msg.sender] = AgentInfo({
            name: name,
            serviceEndpoint: serviceEndpoint,
            successCount: 0,
            failureCount: 0,
            registrationTimestamp: block.timestamp,
            isRegistered: true
        });

        registeredAgentsList.push(msg.sender);

        emit AgentRegistered(msg.sender, name, serviceEndpoint, block.timestamp);
    }

    /**
     * @dev Get agent information
     * @param agent Agent address
     * @return AgentInfo struct containing all agent data
     */
    function agentInfo(address agent)
        external
        view
        returns (AgentInfo memory)
    {
        require(agents[agent].isRegistered, "Agent not registered");
        return agents[agent];
    }

    /**
     * @dev Get agent reputation
     * @param agent Agent address
     * @return successCount Number of successful operations
     * @return failureCount Number of failed operations
     * @return score Reputation score as percentage (0-100, scaled by 10000)
     */
    function getReputation(address agent)
        external
        view
        returns (
            uint256 successCount,
            uint256 failureCount,
            uint256 score
        )
    {
        require(agents[agent].isRegistered, "Agent not registered");

        AgentInfo storage agentData = agents[agent];
        successCount = agentData.successCount;
        failureCount = agentData.failureCount;

        // Calculate score: success * 100 / (success + failure)
        // Returns 0 if no operations yet
        uint256 totalOps = successCount + failureCount;
        if (totalOps == 0) {
            score = 0;
        } else {
            // Return percentage with 2 decimal places (e.g., 95.50 = 9550)
            score = (successCount * 10000) / totalOps;
        }
    }

    /**
     * @dev Report a successful operation (only authorized reporters)
     * @param agent Agent address
     */
    function reportSuccess(address agent)
        external
        onlyAuthorizedReporter
    {
        require(agents[agent].isRegistered, "Agent not registered");

        agents[agent].successCount++;

        emit SuccessReported(agent, msg.sender, agents[agent].successCount);
    }

    /**
     * @dev Report a failed operation (only authorized reporters)
     * @param agent Agent address
     */
    function reportFailure(address agent)
        external
        onlyAuthorizedReporter
    {
        require(agents[agent].isRegistered, "Agent not registered");

        agents[agent].failureCount++;

        emit FailureReported(agent, msg.sender, agents[agent].failureCount);
    }

    /**
     * @dev Authorize a contract to report success/failure (only owner)
     * @param reporter Contract address to authorize
     */
    function authorizeReporter(address reporter) external onlyOwner {
        require(reporter != address(0), "Invalid reporter address");
        require(!authorizedReporters[reporter], "Reporter already authorized");

        authorizedReporters[reporter] = true;

        emit ReporterAuthorized(reporter);
    }

    /**
     * @dev Deauthorize a contract from reporting (only owner)
     * @param reporter Contract address to deauthorize
     */
    function deauthorizeReporter(address reporter) external onlyOwner {
        require(authorizedReporters[reporter], "Reporter not authorized");

        authorizedReporters[reporter] = false;

        emit ReporterDeauthorized(reporter);
    }

    /**
     * @dev Get all registered agents
     * @return Array of registered agent addresses
     */
    function getRegisteredAgents() external view returns (address[] memory) {
        return registeredAgentsList;
    }

    /**
     * @dev Get agent count
     */
    function getAgentCount() external view returns (uint256) {
        return registeredAgentsList.length;
    }

    /**
     * @dev Check if an agent is registered
     */
    function isAgentRegistered(address agent) external view returns (bool) {
        return agents[agent].isRegistered;
    }

    /**
     * @dev ERC-165 interface support
     * Indicates support for this interface
     */
    function supportsInterface(bytes4 interfaceId)
        public
        pure
        override(ERC165)
        returns (bool)
    {
        // Return true for ERC165 and this contract's interface
        return
            interfaceId == type(ERC165).interfaceId ||
            interfaceId == 0x12345678; // Placeholder for ERC-8004 interface ID
    }
}
