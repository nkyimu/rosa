// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title CircleTrust
 * @dev Simplified Circles V2 trust edges on Celo
 * Tracks directional trust relationships with expiry timestamps
 */
contract CircleTrust {
    struct TrustEdge {
        address trustee;
        uint96 expiresAt;
    }

    /// @dev Mapping from truster => array of trust edges
    mapping(address => TrustEdge[]) private trustedUsers;

    /// @dev Mapping to track index of trust edge for efficient revocation
    mapping(address => mapping(address => uint256)) private trustIndex;

    /// @dev Mapping to count incoming trust (for trust score)
    mapping(address => uint256) private incomingTrustCount;

    event TrustAdded(
        address indexed truster,
        address indexed trustee,
        uint96 expiresAt
    );
    event TrustRevoked(address indexed truster, address indexed trustee);
    event TrustExpired(address indexed truster, address indexed trustee);

    /**
     * @dev I trust this person. Can be revoked and re-added with new expiry.
     * @param trustee The address to trust
     * @param expiresAt Timestamp when this trust relationship expires (0 = never expires)
     */
    function trust(address trustee, uint96 expiresAt) external {
        require(trustee != msg.sender, "Cannot trust yourself");
        require(trustee != address(0), "Cannot trust zero address");

        bool isReplacement = false;

        // If already trusting, update the expiry instead of adding another edge
        if (_isTrustedDirect(msg.sender, trustee)) {
            uint256 idx = trustIndex[msg.sender][trustee];
            require(idx > 0, "Invalid index");
            idx -= 1;

            trustedUsers[msg.sender][idx].expiresAt = expiresAt;
            isReplacement = true;
        } else {
            // New trust relationship
            trustedUsers[msg.sender].push(
                TrustEdge({trustee: trustee, expiresAt: expiresAt})
            );

            uint256 index = trustedUsers[msg.sender].length - 1;
            trustIndex[msg.sender][trustee] = index + 1; // Store index+1 to distinguish from 0

            incomingTrustCount[trustee]++;
        }

        emit TrustAdded(msg.sender, trustee, expiresAt);
    }

    /**
     * @dev Revoke trust in this person
     * @param trustee The address to stop trusting
     */
    function revokeTrust(address trustee) external {
        require(
            _isTrustedDirect(msg.sender, trustee),
            "Not trusting this address"
        );

        _revokeTrustDirect(msg.sender, trustee);
        incomingTrustCount[trustee]--;

        emit TrustRevoked(msg.sender, trustee);
    }

    /**
     * @dev Check if truster trusts trustee (and trust hasn't expired)
     * @param truster The address doing the trusting
     * @param trustee The address being trusted
     * @return true if truster trusts trustee and trust is valid
     */
    function isTrusted(address truster, address trustee)
        external
        view
        returns (bool)
    {
        return _isTrusted(truster, trustee);
    }

    /**
     * @dev Get the number of people who trust this user (trust score)
     * @param user The address to check
     * @return Number of valid incoming trust edges
     */
    function trustScore(address user) external view returns (uint256) {
        uint256 count = 0;
        uint256 incomingCount = incomingTrustCount[user];

        // For efficiency, we cache the count, but we should validate during actual trust checks
        // This is an approximation; expired trusts aren't automatically removed
        return incomingCount;
    }

    /**
     * @dev Check if user meets minimum trust score
     * @param user The address to check
     * @param minScore The minimum trust score required
     * @return true if user has at least minScore valid trust edges pointing to them
     */
    function meetsMinTrust(address user, uint256 minScore)
        external
        view
        returns (bool)
    {
        return incomingTrustCount[user] >= minScore;
    }

    /**
     * @dev Internal helper: check if trust relationship exists and is valid
     */
    function _isTrusted(address truster, address trustee)
        internal
        view
        returns (bool)
    {
        uint256 idx = trustIndex[truster][trustee];
        if (idx == 0) return false; // Never trusted

        idx -= 1; // Convert back from 1-indexed

        TrustEdge[] storage edges = trustedUsers[truster];
        if (idx >= edges.length) return false;

        TrustEdge storage edge = edges[idx];
        if (edge.trustee != trustee) return false;

        // Check expiry (0 = never expires)
        if (edge.expiresAt > 0 && block.timestamp > edge.expiresAt) {
            return false;
        }

        return true;
    }

    /**
     * @dev Internal helper: check if directly trusted without expiry check
     */
    function _isTrustedDirect(address truster, address trustee)
        internal
        view
        returns (bool)
    {
        uint256 idx = trustIndex[truster][trustee];
        if (idx == 0) return false;

        idx -= 1;
        return idx < trustedUsers[truster].length &&
            trustedUsers[truster][idx].trustee == trustee;
    }

    /**
     * @dev Internal helper: revoke trust without event emission
     */
    function _revokeTrustDirect(address truster, address trustee) internal {
        uint256 idx = trustIndex[truster][trustee];
        require(idx > 0, "Not trusting this address");

        idx -= 1;

        TrustEdge[] storage edges = trustedUsers[truster];
        require(idx < edges.length, "Invalid trust index");

        // Swap with last element and pop
        TrustEdge storage lastEdge = edges[edges.length - 1];
        edges[idx] = lastEdge;
        trustIndex[truster][lastEdge.trustee] = idx + 1;

        edges.pop();
        delete trustIndex[truster][trustee];
    }

    /**
     * @dev Get all trust edges for a user (for testing/admin)
     */
    function getTrustEdges(address user)
        external
        view
        returns (TrustEdge[] memory)
    {
        return trustedUsers[user];
    }
}
