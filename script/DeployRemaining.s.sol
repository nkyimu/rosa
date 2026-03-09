// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/CircleTrust.sol";
import "../src/CircleFactory.sol";
import "../src/SaveCircle.sol";

contract DeployRemainingScript is Script {
    // Already deployed
    address constant INTENT_REGISTRY = 0x6Bddd66698206c9956e5ac65F9083A132B574844;
    // Celo Sepolia cUSD
    address constant CUSD = 0xEF4d55D6dE8e8d73232827Cd1e9b2F2dBb45bC80;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("Deployer:", deployer);
        console.log("Balance:", deployer.balance);

        vm.startBroadcast(deployerPrivateKey);

        // Deploy CircleTrust
        CircleTrust trust = new CircleTrust();
        console.log("CircleTrust:", address(trust));

        // Deploy CircleFactory
        CircleFactory factory = new CircleFactory();
        console.log("CircleFactory:", address(factory));

        // Deploy a demo SaveCircle directly (bypass factory for testing)
        SaveCircle demo = new SaveCircle(
            1,              // circleId
            deployer,       // agent
            address(trust), // trustContract
            CUSD,           // lendingPool (use cUSD as placeholder)
            CUSD,           // aToken (use cUSD as placeholder)
            0,              // minTrustScore
            300             // 5 min rounds
        );
        console.log("DemoCircle:", address(demo));

        // Register agent on IntentRegistry
        (bool ok,) = INTENT_REGISTRY.call(
            abi.encodeWithSignature("registerAgent(address)", deployer)
        );
        console.log("Agent registered:", ok);

        vm.stopBroadcast();
    }
}
