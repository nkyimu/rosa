// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/IntentRegistry.sol";
import "../src/CircleTrust.sol";
import "../src/CircleFactory.sol";
import "../src/SaveCircle.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("Deploying from:", deployer);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy IntentRegistry
        IntentRegistry registry = new IntentRegistry();
        console.log("IntentRegistry:", address(registry));

        // 2. Deploy CircleTrust
        CircleTrust trust = new CircleTrust();
        console.log("CircleTrust:", address(trust));

        // 3. Deploy CircleFactory (no-arg constructor)
        CircleFactory factory = new CircleFactory();
        console.log("CircleFactory:", address(factory));

        // 4. Register deployer as agent on IntentRegistry
        registry.registerAgent(deployer);
        console.log("Registered deployer as agent");

        // 5. Deploy a demo SaveCircle directly (bypass factory's non-zero checks for testnet)
        SaveCircle demoCircle = new SaveCircle(
            1,                  // circleId
            deployer,           // agent
            address(trust),     // trustContract
            address(1),         // lendingPool (placeholder - no Moola on Alfajores)
            address(2),         // aToken (placeholder)
            0,                  // minTrustScore (0 = anyone can join for testing)
            300                 // roundDuration (5 minutes for testing)
        );
        console.log("DemoCircle:", address(demoCircle));

        // 6. Initialize demo circle with Celo Sepolia cUSD
        address cUSD = 0xEF4d55D6dE8e8d73232827Cd1e9b2F2dBb45bC80;
        demoCircle.initialize(cUSD, 1e18); // 1 cUSD contribution
        console.log("Demo circle initialized with 1 cUSD contribution, 5-min rounds");

        vm.stopBroadcast();

        // Output for frontend .env
        console.log("\n--- Copy to frontend/.env ---");
        console.log(string.concat("VITE_INTENT_REGISTRY=", vm.toString(address(registry))));
        console.log(string.concat("VITE_CIRCLE_FACTORY=", vm.toString(address(factory))));
        console.log(string.concat("VITE_CIRCLE_TRUST=", vm.toString(address(trust))));
        console.log(string.concat("VITE_DEMO_CIRCLE=", vm.toString(address(demoCircle))));
    }
}
