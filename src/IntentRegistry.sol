// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IntentRegistry
 * @dev Onchain registry where users submit intents and agents fulfill them
 */
contract IntentRegistry {
    enum IntentType {
        JOIN_CIRCLE,
        CREATE_CIRCLE,
        CONTRIBUTE,
        EXIT_CIRCLE,
        DISPUTE
    }

    struct Intent {
        uint256 id;
        IntentType intentType;
        address creator;
        bytes32 paramsHash;
        uint256 createdAt;
        uint256 expiresAt;
        bool fulfilled;
        bool cancelled;
    }

    /// @dev Counter for intent IDs
    uint256 private intentCounter = 1;

    /// @dev Mapping from intent ID to Intent struct
    mapping(uint256 => Intent) public intents;

    /// @dev Mapping from intent type to array of open intent IDs
    mapping(IntentType => uint256[]) private openIntentsByType;

    /// @dev Mapping to track if an agent is registered
    mapping(address => bool) public registeredAgents;

    /// @dev Owner/admin of the registry
    address public owner;

    event IntentSubmitted(
        uint256 indexed intentId,
        IntentType indexed intentType,
        address indexed creator,
        uint256 expiresAt
    );
    event IntentCancelled(uint256 indexed intentId);
    event IntentFulfilled(uint256 indexed intentId, address indexed agent);
    event IntentBatchFulfilled(
        uint256[] intentIds,
        address indexed agent,
        bytes compositeSolution
    );
    event AgentRegistered(address indexed agent);
    event AgentDeregistered(address indexed agent);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }

    modifier onlyAgent() {
        require(registeredAgents[msg.sender], "Not a registered agent");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @dev Register an agent (only owner)
     */
    function registerAgent(address agent) external onlyOwner {
        require(agent != address(0), "Invalid agent address");
        registeredAgents[agent] = true;
        emit AgentRegistered(agent);
    }

    /**
     * @dev Deregister an agent (only owner)
     */
    function deregisterAgent(address agent) external onlyOwner {
        registeredAgents[agent] = false;
        emit AgentDeregistered(agent);
    }

    /**
     * @dev Submit an intent
     * @param intentType The type of intent
     * @param params Encoded parameters for the intent
     * @param expiresAt Unix timestamp when intent expires (0 = never expires)
     * @return intentId The ID of the submitted intent
     */
    function submitIntent(
        IntentType intentType,
        bytes calldata params,
        uint256 expiresAt
    ) external returns (uint256) {
        require(expiresAt == 0 || expiresAt > block.timestamp, "Invalid expiry");

        uint256 intentId = intentCounter++;
        bytes32 paramsHash = keccak256(params);

        Intent storage intent = intents[intentId];
        intent.id = intentId;
        intent.intentType = intentType;
        intent.creator = msg.sender;
        intent.paramsHash = paramsHash;
        intent.createdAt = block.timestamp;
        intent.expiresAt = expiresAt;
        intent.fulfilled = false;
        intent.cancelled = false;

        openIntentsByType[intentType].push(intentId);

        emit IntentSubmitted(intentId, intentType, msg.sender, expiresAt);
        return intentId;
    }

    /**
     * @dev Cancel an intent (only creator can cancel)
     */
    function cancelIntent(uint256 intentId) external {
        Intent storage intent = intents[intentId];
        require(intent.creator == msg.sender, "Only creator can cancel");
        require(!intent.fulfilled, "Cannot cancel fulfilled intent");
        require(!intent.cancelled, "Already cancelled");

        intent.cancelled = true;

        emit IntentCancelled(intentId);
    }

    /**
     * @dev Fulfill an intent (only registered agents)
     * @param intentId The ID of the intent to fulfill
     * @param solution The solution/data for fulfilling the intent
     */
    function fulfillIntent(uint256 intentId, bytes calldata solution)
        external
        onlyAgent
    {
        Intent storage intent = intents[intentId];
        require(!intent.fulfilled, "Already fulfilled");
        require(!intent.cancelled, "Intent is cancelled");
        require(
            intent.expiresAt == 0 || block.timestamp <= intent.expiresAt,
            "Intent expired"
        );

        intent.fulfilled = true;

        emit IntentFulfilled(intentId, msg.sender);
    }

    /**
     * @dev Batch fulfill multiple intents with a composite solution
     * @param intentIds Array of intent IDs to fulfill
     * @param compositeSolution The composite solution data
     */
    function batchFulfill(uint256[] calldata intentIds, bytes calldata compositeSolution)
        external
        onlyAgent
    {
        require(intentIds.length > 0, "Must fulfill at least one intent");

        for (uint256 i = 0; i < intentIds.length; i++) {
            uint256 intentId = intentIds[i];
            Intent storage intent = intents[intentId];

            require(!intent.fulfilled, "Intent already fulfilled");
            require(!intent.cancelled, "Intent is cancelled");
            require(
                intent.expiresAt == 0 || block.timestamp <= intent.expiresAt,
                "Intent expired"
            );

            intent.fulfilled = true;
        }

        emit IntentBatchFulfilled(intentIds, msg.sender, compositeSolution);
    }

    /**
     * @dev Get all open intents of a specific type
     * @param intentType The type of intents to retrieve
     * @return Array of open Intent structs
     */
    function getOpenIntents(IntentType intentType)
        external
        view
        returns (Intent[] memory)
    {
        uint256[] storage openIds = openIntentsByType[intentType];
        uint256 count = 0;

        // Count open intents
        for (uint256 i = 0; i < openIds.length; i++) {
            Intent storage intent = intents[openIds[i]];
            if (!intent.fulfilled && !intent.cancelled) {
                if (intent.expiresAt == 0 || block.timestamp <= intent.expiresAt) {
                    count++;
                }
            }
        }

        // Build result array
        Intent[] memory result = new Intent[](count);
        uint256 resultIdx = 0;

        for (uint256 i = 0; i < openIds.length; i++) {
            Intent storage intent = intents[openIds[i]];
            if (!intent.fulfilled && !intent.cancelled) {
                if (intent.expiresAt == 0 || block.timestamp <= intent.expiresAt) {
                    result[resultIdx] = intent;
                    resultIdx++;
                }
            }
        }

        return result;
    }

    /**
     * @dev Get a specific intent by ID
     */
    function getIntent(uint256 intentId)
        external
        view
        returns (Intent memory)
    {
        return intents[intentId];
    }

    /**
     * @dev Get total number of intents
     */
    function getIntentCount() external view returns (uint256) {
        return intentCounter - 1;
    }

    /**
     * @dev Transfer ownership (only owner)
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid new owner");
        owner = newOwner;
    }
}
