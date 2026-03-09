// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AgentRegistry8004
 * @dev ERC-8004 compliant agent registration and reputation contract for IntentCircles
 *
 * Implements agent registration as ERC-721 NFTs with service endpoints and reputation tracking.
 * Each registered agent receives an NFT representing their identity, transferable and discoverable
 * in wallets. Reputation is tracked through feedback from any address, with self-rating prevention.
 */
contract AgentRegistry8004 is ERC721, Ownable {
    /**
     * @dev Agent information structure
     */
    struct AgentInfo {
        string name;
        string serviceEndpoint;
        string agentURI;
        uint256 successCount;
        uint256 failureCount;
        uint256 registrationTimestamp;
        bool isRegistered;
        address owner;
        address operator;
    }

    /**
     * @dev Reputation feedback tag structure
     */
    struct ReputationTag {
        string tagName;
        uint256 value;
        address rater;
        uint256 timestamp;
        string comment;
    }

    /**
     * @dev Agent reputation data
     */
    struct AgentReputation {
        mapping(bytes32 => uint256[]) tagValues; // tagHash => array of values
        mapping(bytes32 => address[]) tagRaters; // tagHash => array of raters
        ReputationTag[] allFeedback;
    }

    // Token ID counter for NFT minting
    uint256 private _tokenIdCounter = 0;

    /// @dev Mapping from agent address to token ID
    mapping(address => uint256) public agentToTokenId;

    /// @dev Mapping from token ID to agent address
    mapping(uint256 => address) public tokenIdToAgent;

    /// @dev Mapping from agent address to agent info
    mapping(address => AgentInfo) public agents;

    /// @dev Mapping from agent address to reputation data
    mapping(address => AgentReputation) internal agentReputations;

    /// @dev Mapping of authorized contracts that can report success/failure
    mapping(address => bool) public authorizedReporters;

    /// @dev Array of all registered agent addresses
    address[] public registeredAgentsList;

    /// @dev Allowed reputation tags
    mapping(bytes32 => bool) public allowedTags;

    event AgentRegistered(
        address indexed agent,
        string name,
        string serviceEndpoint,
        string agentURI,
        uint256 indexed tokenId,
        uint256 timestamp
    );

    event AgentURIUpdated(
        address indexed agent,
        string newAgentURI,
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

    event ReporterAuthorized(address indexed reporter);
    event ReporterDeauthorized(address indexed reporter);

    modifier onlyAuthorizedReporter() {
        require(authorizedReporters[msg.sender], "Not an authorized reporter");
        _;
    }

    /**
     * @dev Initialize with owner and allowed reputation tags
     */
    constructor() ERC721("IntentCircles Agent", "AGENT") Ownable(msg.sender) {
        // Initialize allowed reputation tags
        allowedTags[keccak256(abi.encodePacked("starred"))] = true;
        allowedTags[keccak256(abi.encodePacked("uptime"))] = true;
        allowedTags[keccak256(abi.encodePacked("successRate"))] = true;
        allowedTags[keccak256(abi.encodePacked("responseTime"))] = true;
        allowedTags[keccak256(abi.encodePacked("reachable"))] = true;
    }

    /**
     * @dev Register an agent and mint NFT identity (can be called by agent itself or by owner)
     * @param name Agent's display name
     * @param serviceEndpoint Agent's service endpoint (e.g., HTTPS URL or MCP endpoint)
     * @param uri Agent metadata URI (points to agent.json with endpoints, type, description)
     */
    function registerAgent(
        string calldata name,
        string calldata serviceEndpoint,
        string calldata uri
    ) external {
        require(bytes(name).length > 0, "Name cannot be empty");
        require(bytes(serviceEndpoint).length > 0, "Service endpoint cannot be empty");
        require(bytes(uri).length > 0, "Agent URI cannot be empty");
        require(!agents[msg.sender].isRegistered, "Agent already registered");

        // Mint NFT for agent identity
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;
        _mint(msg.sender, tokenId);

        // Store agent information
        agents[msg.sender] = AgentInfo({
            name: name,
            serviceEndpoint: serviceEndpoint,
            agentURI: uri,
            successCount: 0,
            failureCount: 0,
            registrationTimestamp: block.timestamp,
            isRegistered: true,
            owner: msg.sender,
            operator: address(0)
        });

        // Update mappings
        agentToTokenId[msg.sender] = tokenId;
        tokenIdToAgent[tokenId] = msg.sender;
        registeredAgentsList.push(msg.sender);

        emit AgentRegistered(msg.sender, name, serviceEndpoint, uri, tokenId, block.timestamp);
    }

    /**
     * @dev Update agent URI for an agent (only agent owner or operator can call)
     * @param agent Agent address
     * @param newAgentURI New agent metadata URI
     */
    function updateAgentURI(address agent, string calldata newAgentURI)
        external
    {
        require(bytes(newAgentURI).length > 0, "Agent URI cannot be empty");
        require(agents[agent].isRegistered, "Agent not registered");
        require(
            msg.sender == agent || msg.sender == agents[agent].operator || msg.sender == owner(),
            "Not authorized to update agent URI"
        );

        agents[agent].agentURI = newAgentURI;
        emit AgentURIUpdated(agent, newAgentURI, block.timestamp);
    }

    /**
     * @dev Get agent URI for a token ID (like tokenURI but for agent metadata)
     * @param tokenId Token ID of the agent NFT
     * @return Agent metadata URI pointing to agent.json
     */
    function agentURI(uint256 tokenId)
        external
        view
        returns (string memory)
    {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");

        address agent = tokenIdToAgent[tokenId];
        require(agents[agent].isRegistered, "Agent not registered");

        return agents[agent].agentURI;
    }

    /**
     * @dev Give feedback on an agent reputation (any address can provide feedback)
     * Prevents self-rating by owner or operator
     * @param agent Agent address to rate
     * @param tagName Name of the reputation tag (must be in allowed list)
     * @param value Value of the tag (0-100 for most tags, 0 for boolean tags)
     * @param comment Optional comment about the rating
     */
    function giveFeedback(
        address agent,
        string calldata tagName,
        uint256 value,
        string calldata comment
    ) external {
        require(agents[agent].isRegistered, "Agent not registered");
        
        // Prevent self-rating
        require(
            msg.sender != agent && msg.sender != agents[agent].operator,
            "Cannot rate own agent"
        );

        // Validate tag is allowed
        bytes32 tagHash = keccak256(abi.encodePacked(tagName));
        require(allowedTags[tagHash], "Tag not allowed");

        // Validate value range (0-100)
        require(value <= 100, "Value must be 0-100");

        // Record feedback
        AgentReputation storage reputation = agentReputations[agent];
        reputation.allFeedback.push(
            ReputationTag({
                tagName: tagName,
                value: value,
                rater: msg.sender,
                timestamp: block.timestamp,
                comment: comment
            })
        );

        // Update tag values and raters
        reputation.tagValues[tagHash].push(value);
        reputation.tagRaters[tagHash].push(msg.sender);

        emit FeedbackGiven(agent, msg.sender, tagName, value, comment, block.timestamp);
    }

    /**
     * @dev Get average reputation value for a specific tag
     * @param agent Agent address
     * @param tagName Name of the reputation tag
     * @return average Average value for the tag (0 if no feedback)
     * @return count Number of ratings for this tag
     */
    function getTagReputation(address agent, string calldata tagName)
        external
        view
        returns (uint256 average, uint256 count)
    {
        require(agents[agent].isRegistered, "Agent not registered");

        bytes32 tagHash = keccak256(abi.encodePacked(tagName));
        uint256[] storage values = agentReputations[agent].tagValues[tagHash];

        if (values.length == 0) {
            return (0, 0);
        }

        uint256 sum = 0;
        for (uint256 i = 0; i < values.length; i++) {
            sum += values[i];
        }

        return (sum / values.length, values.length);
    }

    /**
     * @dev Get all feedback for an agent
     * @param agent Agent address
     * @return Array of all feedback for the agent
     */
    function getAllFeedback(address agent)
        external
        view
        returns (ReputationTag[] memory)
    {
        require(agents[agent].isRegistered, "Agent not registered");
        return agentReputations[agent].allFeedback;
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
     * @dev Get agent reputation (success/failure counts and score)
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
     * @dev Get token ID for an agent
     */
    function getAgentTokenId(address agent) external view returns (uint256) {
        require(agents[agent].isRegistered, "Agent not registered");
        return agentToTokenId[agent];
    }

    /**
     * @dev Override required by ERC721
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
