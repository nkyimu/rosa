// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockLendingPool
 * @dev Minimal mock of Moola/Aave V2 lending pool for testnet.
 *      No actual yield — deposits are held and returned 1:1.
 */
contract MockLendingPool {
    mapping(address => mapping(address => uint256)) public deposits; // asset => user => amount

    function deposit(address asset, uint256 amount, address onBehalfOf, uint16) external {
        deposits[asset][onBehalfOf] += amount;
    }

    function withdraw(address asset, uint256 amount, address to) external returns (uint256) {
        if (amount > deposits[asset][msg.sender]) {
            amount = deposits[asset][msg.sender];
        }
        deposits[asset][msg.sender] -= amount;
        return amount;
    }

    function getReserveNormalizedIncome(address) external pure returns (uint256) {
        return 1e27; // 1.0 (no yield — ray units)
    }
}
