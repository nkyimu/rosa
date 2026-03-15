// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/TrustTierManager.sol";
import "../src/CreditLine.sol";
import "../src/ERC8004Integration.sol";
import "../src/AgentRegistry8004.sol";

/**
 * @title DeployTrustSystem
 * @dev Deployment script for the complete Trust System on Celo Sepolia
 *
 * Usage:
 * forge script script/DeployTrustSystem.s.sol:DeployTrustSystem \
 *   --rpc-url https://forno.celo-sepolia.celo-testnet.org \
 *   --broadcast \
 *   --legacy \
 *   -vvv
 */
contract DeployTrustSystem is Script {
    // Contract instances
    AgentRegistry8004 public registry;
    TrustTierManager public tierManager;
    CreditLine public creditLine;
    ERC8004Integration public erc8004;

    // Deployment info
    address public deployer;
    address public cusdAddress = 0xB3567F61d19506A023ae7216a27848B13e5c331B; // Celo Sepolia cUSD

    function setUp() public {
        deployer = msg.sender;
    }

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        // Step 1: Deploy AgentRegistry8004 (if not already deployed)
        console.log("Deploying AgentRegistry8004...");
        registry = new AgentRegistry8004();
        console.log("AgentRegistry8004 deployed at:", address(registry));

        // Step 2: Deploy TrustTierManager
        console.log("Deploying TrustTierManager...");
        tierManager = new TrustTierManager(address(registry));
        console.log("TrustTierManager deployed at:", address(tierManager));

        // Step 3: Deploy CreditLine
        console.log("Deploying CreditLine...");
        creditLine = new CreditLine(
            cusdAddress,
            address(tierManager),
            address(registry)
        );
        console.log("CreditLine deployed at:", address(creditLine));

        // Step 4: Deploy ERC8004Integration with mock registries
        console.log("Deploying ERC8004Integration with mock registries...");
        erc8004 = new ERC8004Integration(address(0), address(0));
        console.log("ERC8004Integration deployed at:", address(erc8004));
        console.log("MockERC8004IdentityRegistry deployed at:", address(erc8004.identityRegistry()));
        console.log("MockERC8004ReputationRegistry deployed at:", address(erc8004.reputationRegistry()));

        vm.stopBroadcast();

        // Log deployment summary
        console.log("\n========== DEPLOYMENT SUMMARY ==========");
        console.log("Network: Celo Sepolia (11142220)");
        console.log("Deployer:", deployer);
        console.log("\nDeployed Contracts:");
        console.log("- AgentRegistry8004:", address(registry));
        console.log("- TrustTierManager:", address(tierManager));
        console.log("- CreditLine:", address(creditLine));
        console.log("- ERC8004Integration:", address(erc8004));
        console.log("\nConfiguration:");
        console.log("- cUSD Token:", cusdAddress);
        console.log("\nNext Steps:");
        console.log("1. Update DEPLOYED.md with contract addresses");
        console.log("2. Register agents and set up reputation");
        console.log("3. Initialize credit lines between agents");
        console.log("4. Enable ERC-8004 identity registrations");
    }
}
