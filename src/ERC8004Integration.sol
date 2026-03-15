// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ERC8004Integration
 * @dev Integration with ERC-8004 official IdentityRegistry and ReputationRegistry
 *
 * ERC-8004 defines standards for agent identity and reputation registries on Ethereum.
 * This contract provides interfaces and methods to:
 * 1. Register agents on the official ERC-8004 IdentityRegistry
 * 2. Read agent registration data
 * 3. Post feedback to the ReputationRegistry
 *
 * Since the official ERC-8004 contracts may not be deployed on Celo Sepolia,
 * this contract includes a mock implementation that follows the official interface.
 *
 * Reference: https://eips.ethereum.org/EIPS/eip-8004
 */

// ERC-8004 IdentityRegistry Interface
interface IERC8004IdentityRegistry {
    function registerAgent(
        string calldata agentType,
        string calldata serviceEndpoint,
        string[] calldata endpointMetadata
    ) external returns (uint256 registrationId);

    function getAgentInfo(address agent)
        external
        view
        returns (
            string memory agentType,
            string memory serviceEndpoint,
            bool isActive
        );

    function updateServiceEndpoint(address agent, string calldata newEndpoint)
        external;
}

// ERC-8004 ReputationRegistry Interface
interface IERC8004ReputationRegistry {
    function postFeedback(
        address agent,
        uint8 rating,
        string calldata feedbackText,
        string[] calldata tags
    ) external;

    function getReputation(address agent)
        external
        view
        returns (
            uint256 avgRating,
            uint256 feedbackCount,
            uint256 successCount,
            uint256 failureCount
        );
}

/**
 * @title MockERC8004IdentityRegistry
 * @dev Mock implementation of ERC-8004 IdentityRegistry for testing/fallback
 */
contract MockERC8004IdentityRegistry is IERC8004IdentityRegistry {
    struct AgentInfo {
        address agent;
        string agentType;
        string serviceEndpoint;
        bool isActive;
        uint256 registrationId;
        uint256 registeredAt;
    }

    mapping(address => AgentInfo) public agents;
    mapping(uint256 => address) public registrationIdToAgent;

    uint256 private registrationIdCounter = 1;

    event AgentRegisteredOnRegistry(
        address indexed agent,
        uint256 registrationId,
        string agentType,
        string serviceEndpoint
    );

    event ServiceEndpointUpdated(address indexed agent, string newEndpoint);

    function registerAgent(
        string calldata agentType,
        string calldata serviceEndpoint,
        string[] calldata endpointMetadata
    ) external override returns (uint256 registrationId) {
        require(bytes(agentType).length > 0, "Agent type cannot be empty");
        require(
            bytes(serviceEndpoint).length > 0,
            "Service endpoint cannot be empty"
        );
        require(agents[msg.sender].registrationId == 0, "Agent already registered");

        registrationId = registrationIdCounter;
        registrationIdCounter++;

        agents[msg.sender] = AgentInfo({
            agent: msg.sender,
            agentType: agentType,
            serviceEndpoint: serviceEndpoint,
            isActive: true,
            registrationId: registrationId,
            registeredAt: block.timestamp
        });

        registrationIdToAgent[registrationId] = msg.sender;

        emit AgentRegisteredOnRegistry(
            msg.sender,
            registrationId,
            agentType,
            serviceEndpoint
        );
    }

    function getAgentInfo(address agent)
        external
        view
        override
        returns (
            string memory agentType,
            string memory serviceEndpoint,
            bool isActive
        )
    {
        require(agents[agent].registrationId != 0, "Agent not registered");
        AgentInfo storage info = agents[agent];
        return (info.agentType, info.serviceEndpoint, info.isActive);
    }

    function updateServiceEndpoint(
        address agent,
        string calldata newEndpoint
    ) external override {
        require(agents[agent].registrationId != 0, "Agent not registered");
        require(msg.sender == agent, "Only agent can update endpoint");
        agents[agent].serviceEndpoint = newEndpoint;
        emit ServiceEndpointUpdated(agent, newEndpoint);
    }
}

/**
 * @title MockERC8004ReputationRegistry
 * @dev Mock implementation of ERC-8004 ReputationRegistry for testing/fallback
 */
contract MockERC8004ReputationRegistry is IERC8004ReputationRegistry {
    struct ReputationData {
        uint256 totalRating;
        uint256 feedbackCount;
        uint256 successCount;
        uint256 failureCount;
    }

    struct Feedback {
        address rater;
        uint8 rating;
        string feedbackText;
        string[] tags;
        uint256 timestamp;
    }

    mapping(address => ReputationData) public reputations;
    mapping(address => Feedback[]) public allFeedback;

    event FeedbackPosted(
        address indexed agent,
        address indexed rater,
        uint8 rating,
        string feedbackText,
        uint256 timestamp
    );

    function postFeedback(
        address agent,
        uint8 rating,
        string calldata feedbackText,
        string[] calldata tags
    ) external override {
        require(rating <= 100, "Rating must be 0-100");
        require(agent != address(0), "Invalid agent address");

        ReputationData storage rep = reputations[agent];
        rep.totalRating += rating;
        rep.feedbackCount++;

        if (rating >= 75) {
            rep.successCount++;
        } else {
            rep.failureCount++;
        }

        allFeedback[agent].push(
            Feedback({
                rater: msg.sender,
                rating: rating,
                feedbackText: feedbackText,
                tags: tags,
                timestamp: block.timestamp
            })
        );

        emit FeedbackPosted(
            agent,
            msg.sender,
            rating,
            feedbackText,
            block.timestamp
        );
    }

    function getReputation(address agent)
        external
        view
        override
        returns (
            uint256 avgRating,
            uint256 feedbackCount,
            uint256 successCount,
            uint256 failureCount
        )
    {
        ReputationData storage rep = reputations[agent];

        avgRating = rep.feedbackCount > 0 ? rep.totalRating / rep.feedbackCount : 0;

        return (avgRating, rep.feedbackCount, rep.successCount, rep.failureCount);
    }

    function getAllFeedback(address agent)
        external
        view
        returns (Feedback[] memory)
    {
        return allFeedback[agent];
    }
}

/**
 * @title ERC8004Integration
 * @dev Main contract for integrating with ERC-8004 registries
 *
 * Provides a unified interface to interact with official or mock ERC-8004 registries.
 * Can be configured to use official mainnet registries or mock implementations.
 */
contract ERC8004Integration is Ownable {
    IERC8004IdentityRegistry public identityRegistry;
    IERC8004ReputationRegistry public reputationRegistry;

    // Track registered agents
    mapping(address => bool) public isRegisteredOnERC8004;
    mapping(address => uint256) public erc8004RegistrationIds;

    event AgentRegisteredOnERC8004(
        address indexed agent,
        uint256 registrationId,
        string agentType
    );

    event FeedbackPostedToERC8004(
        address indexed agent,
        uint8 rating,
        address indexed rater
    );

    event RegistryAddressUpdated(
        string indexed registryType,
        address oldAddress,
        address newAddress
    );

    /**
     * @dev Initialize with identity and reputation registry addresses
     * If either address is zero, a mock registry will be deployed
     * @param _identityRegistry Address of ERC-8004 IdentityRegistry (or zero to deploy mock)
     * @param _reputationRegistry Address of ERC-8004 ReputationRegistry (or zero to deploy mock)
     */
    constructor(address _identityRegistry, address _reputationRegistry)
        Ownable(msg.sender)
    {
        // Deploy mocks if addresses are zero
        if (_identityRegistry == address(0)) {
            identityRegistry = new MockERC8004IdentityRegistry();
        } else {
            identityRegistry = IERC8004IdentityRegistry(_identityRegistry);
        }

        if (_reputationRegistry == address(0)) {
            reputationRegistry = new MockERC8004ReputationRegistry();
        } else {
            reputationRegistry = IERC8004ReputationRegistry(_reputationRegistry);
        }
    }

    /**
     * @dev Register an agent on the ERC-8004 IdentityRegistry
     * @param agentType Type of agent (e.g., "AI_AGENT", "HUMAN_AGENT")
     * @param serviceEndpoint Service endpoint URL or identifier
     * @param endpointMetadata Additional metadata about endpoints
     * @return registrationId The registration ID from the registry
     */
    function registerAgentOnERC8004(
        string calldata agentType,
        string calldata serviceEndpoint,
        string[] calldata endpointMetadata
    ) external returns (uint256 registrationId) {
        require(!isRegisteredOnERC8004[msg.sender], "Agent already registered");

        registrationId = identityRegistry.registerAgent(
            agentType,
            serviceEndpoint,
            endpointMetadata
        );

        isRegisteredOnERC8004[msg.sender] = true;
        erc8004RegistrationIds[msg.sender] = registrationId;

        emit AgentRegisteredOnERC8004(msg.sender, registrationId, agentType);
    }

    /**
     * @dev Get agent registration info from ERC-8004 IdentityRegistry
     * @param agent Address of the agent
     * @return agentType Type of the agent
     * @return serviceEndpoint Service endpoint
     * @return isActive Whether the agent is active
     */
    function getAgentInfoFromERC8004(address agent)
        external
        view
        returns (
            string memory agentType,
            string memory serviceEndpoint,
            bool isActive
        )
    {
        return identityRegistry.getAgentInfo(agent);
    }

    /**
     * @dev Post feedback to the ERC-8004 ReputationRegistry
     * @param agent Address of the agent being rated
     * @param rating Rating value (0-100)
     * @param feedbackText Text feedback
     * @param tags Array of feedback tags
     */
    function postFeedbackToERC8004(
        address agent,
        uint8 rating,
        string calldata feedbackText,
        string[] calldata tags
    ) external {
        require(rating <= 100, "Rating must be 0-100");
        require(agent != address(0), "Invalid agent address");

        reputationRegistry.postFeedback(agent, rating, feedbackText, tags);

        emit FeedbackPostedToERC8004(agent, rating, msg.sender);
    }

    /**
     * @dev Get reputation data from ERC-8004 ReputationRegistry
     * @param agent Address of the agent
     * @return avgRating Average rating
     * @return feedbackCount Total feedback count
     * @return successCount Successful interactions
     * @return failureCount Failed interactions
     */
    function getReputationFromERC8004(address agent)
        external
        view
        returns (
            uint256 avgRating,
            uint256 feedbackCount,
            uint256 successCount,
            uint256 failureCount
        )
    {
        return reputationRegistry.getReputation(agent);
    }

    /**
     * @dev Check if an agent is registered on ERC-8004
     * @param agent Address of the agent
     * @return isRegistered True if agent is registered
     */
    function isAgentRegisteredOnERC8004(address agent)
        external
        view
        returns (bool isRegistered)
    {
        return isRegisteredOnERC8004[agent];
    }

    /**
     * @dev Get registration ID for an agent
     * @param agent Address of the agent
     * @return registrationId The ERC-8004 registration ID
     */
    function getRegistrationId(address agent)
        external
        view
        returns (uint256 registrationId)
    {
        return erc8004RegistrationIds[agent];
    }

    /**
     * @dev Update the identity registry address (owner only)
     * @param newRegistry Address of the new identity registry
     */
    function setIdentityRegistry(address newRegistry) external onlyOwner {
        require(newRegistry != address(0), "Invalid address");
        address oldRegistry = address(identityRegistry);
        identityRegistry = IERC8004IdentityRegistry(newRegistry);
        emit RegistryAddressUpdated("identity", oldRegistry, newRegistry);
    }

    /**
     * @dev Update the reputation registry address (owner only)
     * @param newRegistry Address of the new reputation registry
     */
    function setReputationRegistry(address newRegistry) external onlyOwner {
        require(newRegistry != address(0), "Invalid address");
        address oldRegistry = address(reputationRegistry);
        reputationRegistry = IERC8004ReputationRegistry(newRegistry);
        emit RegistryAddressUpdated("reputation", oldRegistry, newRegistry);
    }
}
