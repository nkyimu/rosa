// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/MockcUSD.sol";

contract DeployMockcUSD is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);
        MockcUSD token = new MockcUSD();
        console.log("MockcUSD:", address(token));
        vm.stopBroadcast();
    }
}
