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
        DISPUTE,
        NIGHTFALL_DEPOSIT,
        NIGHTFALL_ROTATION
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

    struct NightfallDepositIntent {
        uint256 circleId;
        uint256 amount;
        bytes32 salt;
        bytes32 commitmentHash;
        uint256 createdAt;
        bool deposited;
    }

    /// @dev Counter for intent IDs
    uint256 private intentCounter = 1;

    /// @dev Counter for Nightfall deposit intents
    uint256 public depositIntentCounter = 1;

    /// @dev Mapping from intent ID to Intent struct
    mapping(uint256 => Intent) public intents;

    /// @dev Mapping from intent type to array of open intent IDs
    mapping(IntentType => uint256[]) private openIntentsByType;

    /// @dev Mapping from deposit intent ID to NightfallDepositIntent struct
    mapping(uint256 => NightfallDepositIntent) public depositIntents;

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

    // ===== NIGHTFALL DEPOSIT INTENTS =====

    /**
     * @dev Submit a Nightfall deposit intent
     * User wants to make a private contribution via Nightfall
     * @param circleId The circle ID to contribute to
     * @param amount The amount to contribute (in wei)
     * @param salt Random salt chosen by user for commitment hash
     * @return depositIntentId The ID of the submitted Nightfall deposit intent
     */
    function submitNightfallDeposit(
        uint256 circleId,
        uint256 amount,
        bytes32 salt
    ) external returns (uint256) {
        require(circleId > 0, "Invalid circle ID");
        require(amount > 0, "Invalid amount");

        // Compute commitment hash
        bytes32 commitmentHash = keccak256(abi.encodePacked(amount, salt));

        uint256 depositIntentId = depositIntentCounter++;
        depositIntents[depositIntentId] = NightfallDepositIntent({
            circleId: circleId,
            amount: amount,
            salt: salt,
            commitmentHash: commitmentHash,
            createdAt: block.timestamp,
            deposited: false
        });

        emit IntentSubmitted(depositIntentId, IntentType.NIGHTFALL_DEPOSIT, msg.sender, 0);
        return depositIntentId;
    }

    /**
     * @dev Mark a Nightfall deposit intent as deposited
     * Agent calls this after verifying the deposit proof off-chain
     * @param depositIntentId The ID of the deposit intent to mark as complete
     */
    function markNightfallDeposited(uint256 depositIntentId) external onlyAgent {
        NightfallDepositIntent storage depositIntent = depositIntents[depositIntentId];
        require(depositIntent.createdAt != 0, "Deposit intent not found");
        require(!depositIntent.deposited, "Already marked as deposited");

        depositIntent.deposited = true;

        emit IntentFulfilled(depositIntentId, msg.sender);
    }

    /**
     * @dev Get a specific Nightfall deposit intent by ID
     */
    function getDepositIntent(uint256 depositIntentId)
        external
        view
        returns (NightfallDepositIntent memory)
    {
        return depositIntents[depositIntentId];
    }
}
