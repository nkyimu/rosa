// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/SaveCircle.sol";

contract DeployDemoCircleScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        address cUSD = 0xEF4d55D6dE8e8d73232827Cd1e9b2F2dBb45bC80;
        
        console.log("Deployer:", deployer);
        
        vm.startBroadcast(deployerPrivateKey);
        
        address circleTrust = 0x0c2098e90A078b2183b765eFB38Bd912FcDBb8Ba;
        
        // Create a demo circle
        SaveCircle demo = new SaveCircle(
            1,                 // circleId
            deployer,          // agent
            circleTrust,       // trust contract
            address(0),        // no lending pool
            address(0),        // no aToken
            0,                 // min trust score (0 for demo)
            7 days             // round duration
        );
        console.log("DemoCircle:", address(demo));
        
        vm.stopBroadcast();
    }
}
