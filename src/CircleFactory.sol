// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./SaveCircle.sol";

/**
 * @title CircleFactory
 * @dev Factory that deploys new SaveCircle instances
 */
contract CircleFactory {
    /// @dev Counter for circle IDs
    uint256 private circleCounter = 1;

    /// @dev Mapping from circle ID to circle address
    mapping(uint256 => address) public circles;

    /// @dev Array of all circle addresses for enumeration
    address[] public circleList;

    /// @dev Owner/admin of the factory
    address public owner;

    event CircleCreated(
        uint256 indexed circleId,
        address indexed circleAddress,
        address indexed agent,
        address trustContract,
        address yieldVault,
        uint256 minTrustScore,
        uint256 roundDuration
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @dev Create a new SaveCircle instance
     * @param agent The agent managing this circle
     * @param trustContract Address of CircleTrust contract
     * @param yieldVault Address where yield is deposited (Moola)
     * @param minTrustScore Minimum trust score to join
     * @param roundDuration Duration of each round in seconds
     * @return circleAddress Address of the new SaveCircle
     */
    function createCircle(
        address agent,
        address trustContract,
        address yieldVault,
        uint256 minTrustScore,
        uint256 roundDuration
    ) external returns (address circleAddress) {
        require(agent != address(0), "Invalid agent");
        require(trustContract != address(0), "Invalid trust contract");
        require(yieldVault != address(0), "Invalid yield vault");
        require(roundDuration > 0, "Round duration must be > 0");

        uint256 circleId = circleCounter++;

        SaveCircle newCircle = new SaveCircle(
            circleId,
            agent,
            trustContract,
            yieldVault,
            minTrustScore,
            roundDuration
        );

        circleAddress = address(newCircle);
        circles[circleId] = circleAddress;
        circleList.push(circleAddress);

        emit CircleCreated(
            circleId,
            circleAddress,
            agent,
            trustContract,
            yieldVault,
            minTrustScore,
            roundDuration
        );

        return circleAddress;
    }

    /**
     * @dev Get circle address by ID
     */
    function getCircle(uint256 circleId) external view returns (address) {
        return circles[circleId];
    }

    /**
     * @dev Get total number of circles created
     */
    function getCircleCount() external view returns (uint256) {
        return circleCounter - 1;
    }

    /**
     * @dev Get all circle addresses
     */
    function getAllCircles() external view returns (address[] memory) {
        return circleList;
    }

    /**
     * @dev Transfer ownership (only owner)
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid new owner");
        owner = newOwner;
    }
}
