// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title MockcUSD - Testnet mock of Celo Dollar for demo purposes
/// @notice Public mint function for testing. NOT for production use.
contract MockcUSD is ERC20 {
    constructor() ERC20("Celo Dollar (Mock)", "cUSD") {
        _mint(msg.sender, 10000 * 1e18); // 10,000 cUSD to deployer
    }

    /// @notice Anyone can mint for testing
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
