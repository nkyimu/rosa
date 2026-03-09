// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/AgentRegistry8004.sol";
import "../src/AgentPayment.sol";

contract DeployAgent8004Script is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        address cUSD = 0xEF4d55D6dE8e8d73232827Cd1e9b2F2dBb45bC80;
        
        console.log("Deployer:", deployer);
        console.log("Balance:", deployer.balance);
        
        vm.startBroadcast(deployerPrivateKey);
        
        AgentRegistry8004 registry = new AgentRegistry8004();
        console.log("AgentRegistry8004:", address(registry));
        
        AgentPayment payment = new AgentPayment(cUSD, 0.01 ether); // 0.01 cUSD fee
        console.log("AgentPayment:", address(payment));
        
        // Register agent
        registry.registerAgent(
            "IntentCircles Keeper",
            "https://intentcircles.example.com/agent",
            "ipfs://QmIntentCirclesAgent"
        );
        console.log("Agent registered");
        
        vm.stopBroadcast();
    }
}
