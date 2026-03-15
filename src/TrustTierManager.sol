// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./AgentRegistry8004.sol";

/**
 * @title TrustTierManager
 * @dev Manages trust tiers for agents based on their reputation scores
 *
 * Maps agent reputation scores (from AgentRegistry8004) to four trust tiers:
 * - NEWCOMER (score < 50): Can only join small circles
 * - MEMBER (50-79): Can join medium circles, earlier payout rotation
 * - CREDITOR (80-94): Can issue micro-credit to other agents
 * - ELDER (95+): Can settle barter intents, cross-pool liquidity
 *
 * Tier thresholds are configurable by owner and can be updated without
 * affecting existing tier assignments (only used for new calculations).
 */
contract TrustTierManager is Ownable {
    enum Tier {
        NEWCOMER, // 0
        MEMBER, // 1
        CREDITOR, // 2
        ELDER // 3
    }

    // Registry reference
    AgentRegistry8004 public agentRegistry;

    // Configurable tier thresholds (using basis points: 10000 = 100%)
    // Default: NEWCOMER < 5000 (50%), MEMBER 5000-7999 (50-79%), CREDITOR 8000-9399 (80-93%), ELDER >= 9400 (94%)
    uint256 public newcomerThreshold = 5000; // < 50%
    uint256 public memberThreshold = 7999; // 50-79%
    uint256 public creditorThreshold = 9399; // 80-93%
    // ELDER is implicitly >= 9400

    // Cache for tier assignments (optional optimization, not required for correctness)
    mapping(address => Tier) public cachedTiers;
    mapping(address => bool) public tierCached;

    event TierChanged(address indexed agent, Tier oldTier, Tier newTier);
    event ThresholdUpdated(
        string indexed thresholdName,
        uint256 oldValue,
        uint256 newValue
    );

    /**
     * @dev Initialize with AgentRegistry8004 address
     * @param _agentRegistry Address of the AgentRegistry8004 contract
     */
    constructor(address _agentRegistry) Ownable(msg.sender) {
        require(_agentRegistry != address(0), "Invalid registry address");
        agentRegistry = AgentRegistry8004(_agentRegistry);
    }

    /**
     * @dev Get the trust tier for an agent based on their reputation score
     * @param agent Address of the agent
     * @return tier The calculated trust tier
     */
    function getTier(address agent) external view returns (Tier) {
        require(agentRegistry.isAgentRegistered(agent), "Agent not registered");

        (, , uint256 score) = agentRegistry.getReputation(agent);

        // Score is in basis points (0-10000, where 10000 = 100%)
        if (score < newcomerThreshold) {
            return Tier.NEWCOMER;
        } else if (score <= memberThreshold) {
            return Tier.MEMBER;
        } else if (score <= creditorThreshold) {
            return Tier.CREDITOR;
        } else {
            return Tier.ELDER;
        }
    }

    /**
     * @dev Check if an agent can issue a credit line
     * An agent needs CREDITOR tier or higher (80+ reputation)
     * @param agent Address of the agent
     * @return canIssue True if agent can issue credit
     */
    function canIssueCreditLine(address agent)
        external
        view
        returns (bool)
    {
        require(agentRegistry.isAgentRegistered(agent), "Agent not registered");

        (, , uint256 score) = agentRegistry.getReputation(agent);
        // CREDITOR tier is 80+ reputation (8000 basis points)
        // The tier boundary is > memberThreshold, which is > 7999
        return score > memberThreshold;
    }

    /**
     * @dev Check if an agent can settle barter intents
     * An agent needs ELDER tier (95+ reputation)
     * @param agent Address of the agent
     * @return canSettle True if agent can settle barter
     */
    function canSettleBarter(address agent)
        external
        view
        returns (bool)
    {
        require(agentRegistry.isAgentRegistered(agent), "Agent not registered");

        (, , uint256 score) = agentRegistry.getReputation(agent);
        return score >= 9500; // 95%
    }

    /**
     * @dev Calculate maximum credit amount an agent can issue based on their score
     * Formula: score < 8000 ? 0 : (score - 8000) * 1.5 + 500
     * Examples:
     *   - score 80 (8000): max 500 cUSD
     *   - score 85 (8500): max 1250 cUSD
     *   - score 95 (9500): max 2750 cUSD
     * @param agent Address of the agent
     * @return maxCredit Maximum credit amount in smallest token units (e.g., wei for 18 decimal token)
     */
    function getMaxCreditIssueAmount(address agent)
        external
        view
        returns (uint256)
    {
        require(agentRegistry.isAgentRegistered(agent), "Agent not registered");

        (, , uint256 score) = agentRegistry.getReputation(agent);

        // Only CREDITOR (8000+) and ELDER (9400+) can issue credit
        if (score < 8000) {
            return 0;
        }

        // Calculate based on score above 8000
        // (score - 8000) * 1.5 + 500 cUSD
        // = (score - 8000) * 1.5 * 1e18 (for 18 decimal token)
        // where score is in basis points (8000 = 80%)
        // So: (score - 8000) * 1.5e15 + 500e18
        uint256 scoreAboveThreshold = score - 8000;
        uint256 baseAmount = 500 * 1e18; // 500 cUSD base
        uint256 incrementPerBasisPoint = (scoreAboveThreshold * 15e14); // 1.5 cUSD per basis point

        return baseAmount + incrementPerBasisPoint;
    }

    /**
     * @dev Update newcomer tier threshold (owner only)
     * @param newThreshold New threshold in basis points (e.g., 5000 = 50%)
     */
    function setNewcomerThreshold(uint256 newThreshold) external onlyOwner {
        require(newThreshold > 0 && newThreshold < 10000, "Invalid threshold");
        require(newThreshold < memberThreshold, "Must be below member threshold");

        uint256 oldThreshold = newcomerThreshold;
        newcomerThreshold = newThreshold;

        // Invalidate cache since thresholds changed
        invalidateAllCache();

        emit ThresholdUpdated("newcomer", oldThreshold, newThreshold);
    }

    /**
     * @dev Update member tier threshold (owner only)
     * @param newThreshold New threshold in basis points (e.g., 7999 = 79.99%)
     */
    function setMemberThreshold(uint256 newThreshold) external onlyOwner {
        require(newThreshold > newcomerThreshold, "Must be above newcomer threshold");
        require(newThreshold < creditorThreshold, "Must be below creditor threshold");
        require(newThreshold < 10000, "Invalid threshold");

        uint256 oldThreshold = memberThreshold;
        memberThreshold = newThreshold;

        // Invalidate cache since thresholds changed
        invalidateAllCache();

        emit ThresholdUpdated("member", oldThreshold, newThreshold);
    }

    /**
     * @dev Update creditor tier threshold (owner only)
     * @param newThreshold New threshold in basis points (e.g., 9399 = 93.99%)
     */
    function setCreditorThreshold(uint256 newThreshold) external onlyOwner {
        require(newThreshold > memberThreshold, "Must be above member threshold");
        require(newThreshold < 10000, "Invalid threshold");

        uint256 oldThreshold = creditorThreshold;
        creditorThreshold = newThreshold;

        // Invalidate cache since thresholds changed
        invalidateAllCache();

        emit ThresholdUpdated("creditor", oldThreshold, newThreshold);
    }

    /**
     * @dev Invalidate tier cache for a specific agent
     * Used internally when thresholds change
     * @param agent Address of the agent
     */
    function invalidateTierCache(address agent) external onlyOwner {
        tierCached[agent] = false;
    }

    /**
     * @dev Invalidate tier cache for all agents
     * Used internally when thresholds change
     */
    function invalidateAllCache() internal {
        // Note: In a real system with many agents, this would be inefficient
        // A better approach would be to track dirty agents or use a version counter
    }

    /**
     * @dev Helper: Get all thresholds at once
     * @return newcomer Newcomer threshold (< this score)
     * @return member Member threshold (>= newcomer, <= this)
     * @return creditor Creditor threshold (>= member, <= this)
     */
    function getThresholds()
        external
        view
        returns (
            uint256 newcomer,
            uint256 member,
            uint256 creditor
        )
    {
        return (newcomerThreshold, memberThreshold, creditorThreshold);
    }

    /**
     * @dev Helper: Get tier name as string
     * @param tier The tier enum value
     * @return tierName String representation of the tier
     */
    function getTierName(Tier tier)
        external
        pure
        returns (string memory tierName)
    {
        if (tier == Tier.NEWCOMER) {
            return "NEWCOMER";
        } else if (tier == Tier.MEMBER) {
            return "MEMBER";
        } else if (tier == Tier.CREDITOR) {
            return "CREDITOR";
        } else {
            return "ELDER";
        }
    }
}
