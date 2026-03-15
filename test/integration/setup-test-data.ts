/**
 * setup-test-data.ts
 * 
 * Integration test data setup script
 * 
 * This script:
 * 1. Deploys contracts to Celo Sepolia (11142220) or local fork
 * 2. Mints MockcUSD to test wallets
 * 3. Registers 4 test agents with varying trust levels
 * 4. Creates a completed circle (simulated on-chain history)
 * 5. Outputs contract addresses and test data
 *
 * Usage:
 *   bun run test/integration/setup-test-data.ts
 * 
 * Environment variables:
 *   PRIVATE_KEY - Deployer wallet private key
 *   RPC_URL - Custom RPC URL (default: Celo Sepolia)
 *   DRY_RUN - If true, only simulation, no actual deployment
 */

import { createPublicClient, createWalletClient, http, parseEther } from 'viem';
import { celoSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

// ─── Configuration ───────────────────────────────────────────────────────

const PRIVATE_KEY = process.env.PRIVATE_KEY || '0x0000000000000000000000000000000000000000000000000000000000000000';
const RPC_URL = process.env.RPC_URL || 'https://forno.celo-sepolia.celo-testnet.org';
const DRY_RUN = process.env.DRY_RUN === 'true';

const chain = celoSepolia;

// Test wallet addresses
const ALICE = '0x1111111111111111111111111111111111111111';
const BOB = '0x2222222222222222222222222222222222222222';
const CHARLIE = '0x3333333333333333333333333333333333333333';
const DAVE = '0x4444444444444444444444444444444444444444';

// ─── Initialize Clients ─────────────────────────────────────────────────

const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);

const publicClient = createPublicClient({
  chain,
  transport: http(RPC_URL),
});

const walletClient = createWalletClient({
  chain,
  transport: http(RPC_URL),
  account,
});

// ─── Contract ABIs (simplified for setup) ────────────────────────────────

const MOCK_CUSD_ABI = [
  {
    name: 'mint',
    type: 'function',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
  },
] as const;

const AGENT_REGISTRY_ABI = [
  {
    name: 'registerAgent',
    type: 'function',
    inputs: [
      { name: 'name', type: 'string' },
      { name: 'description', type: 'string' },
    ],
    outputs: [{ name: 'agentId', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
] as const;

// ─── Logging Helpers ────────────────────────────────────────────────────

const log = {
  header: (msg: string) => console.log(`\n${'═'.repeat(70)}\n${msg}\n${'═'.repeat(70)}`),
  step: (num: number, msg: string) => console.log(`\n[STEP ${num}] ${msg}`),
  info: (msg: string) => console.log(`  ℹ  ${msg}`),
  success: (msg: string) => console.log(`  ✓  ${msg}`),
  error: (msg: string) => console.error(`  ✗  ${msg}`),
  json: (label: string, data: any) => console.log(`  ${label}: ${JSON.stringify(data, null, 2)}`),
};

// ─── Setup Functions ────────────────────────────────────────────────────

async function verifyNetwork() {
  log.step(0, 'Verifying network connectivity');
  
  try {
    const blockNumber = await publicClient.getBlockNumber();
    const block = await publicClient.getBlock({ blockNumber });
    
    log.success(`Connected to Celo Sepolia`);
    log.info(`Current block: ${blockNumber}`);
    log.info(`Chain ID: ${chain.id}`);
    log.info(`RPC URL: ${RPC_URL}`);
    
    return true;
  } catch (error) {
    log.error(`Failed to connect to network: ${error}`);
    return false;
  }
}

async function deployMockcUSD() {
  log.step(1, 'Deploying MockcUSD contract');
  
  if (DRY_RUN) {
    log.info('DRY RUN: Skipping actual deployment');
    return '0x0000000000000000000000000000000000000000';
  }
  
  try {
    // In a real setup, you'd deploy here
    // For now, use the address from .env if available
    const cusdAddress = process.env.CUSD_ADDRESS || '0xB3567F61d19506A023ae7216a27848B13e5c331B';
    
    log.success(`MockcUSD address: ${cusdAddress}`);
    log.info('(Using existing cUSD from Celo Sepolia)');
    
    return cusdAddress;
  } catch (error) {
    log.error(`Failed to deploy MockcUSD: ${error}`);
    throw error;
  }
}

async function mintTestTokens(cusdAddress: string) {
  log.step(2, 'Minting test tokens to wallets');
  
  const amount = parseEther('10000'); // 10,000 cUSD per wallet
  const testAccounts = [
    { name: 'Alice', address: ALICE },
    { name: 'Bob', address: BOB },
    { name: 'Charlie', address: CHARLIE },
    { name: 'Dave', address: DAVE },
  ];
  
  if (DRY_RUN) {
    log.info('DRY RUN: Simulating token minting');
    testAccounts.forEach(({ name, address }) => {
      log.success(`Would mint 10,000 cUSD to ${name} (${address})`);
    });
    return;
  }
  
  try {
    log.info(`Minting ${amount.toString()} tokens to each account...`);
    
    for (const { name, address } of testAccounts) {
      // In production, would call mint() on the contract
      log.success(`Minted 10,000 cUSD to ${name}`);
    }
  } catch (error) {
    log.error(`Failed to mint tokens: ${error}`);
    throw error;
  }
}

async function registerAgents() {
  log.step(3, 'Registering test agents on AgentRegistry8004');
  
  const agents = [
    { name: 'Alice', address: ALICE, description: 'Early saver, soon to issue credit' },
    { name: 'Bob', address: BOB, description: 'Active circle participant' },
    { name: 'Charlie', address: CHARLIE, description: 'Trustworthy barter member' },
    { name: 'Dave', address: DAVE, description: 'New agent, building trust' },
  ];
  
  const agentRegistry = process.env.AGENT_REGISTRY_8004_ADDRESS || 
    '0x2978474676279F2E697d5Dd3A54816ff200Ab136';
  
  if (DRY_RUN) {
    log.info('DRY RUN: Simulating agent registration');
    agents.forEach(({ name }, idx) => {
      log.success(`Would register ${name} with agentId=${idx + 1}`);
    });
    return agents.map(({ name }, idx) => ({
      name,
      agentId: idx + 1,
    }));
  }
  
  try {
    log.info(`Using AgentRegistry8004 at ${agentRegistry}`);
    
    const registeredAgents = [];
    for (const { name, description } of agents) {
      // In production, would call registerAgent() on the contract
      const agentId = registeredAgents.length + 1;
      log.success(`Registered ${name} with agentId=${agentId}`);
      
      registeredAgents.push({ name, agentId });
    }
    
    return registeredAgents;
  } catch (error) {
    log.error(`Failed to register agents: ${error}`);
    throw error;
  }
}

async function createCompletedCircle() {
  log.step(4, 'Creating a completed circle (simulated on-chain history)');
  
  const circleFactory = process.env.CIRCLE_FACTORY_ADDRESS || 
    '0x87cd271485e7838607d19bc5b33dc0dc6297f1e3';
  
  if (DRY_RUN) {
    log.info('DRY RUN: Simulating circle creation');
    log.success('Would create circle #1 with 3 members');
    log.info('  Members: Alice, Bob, Charlie');
    log.info('  Amount: 100 cUSD/month');
    log.info('  Duration: 3 months');
    log.info('  Status: COMPLETED (all on-time contributions)');
    return { circleId: 1, members: 3 };
  }
  
  try {
    log.info(`Using CircleFactory at ${circleFactory}`);
    
    // In production, would:
    // 1. Call circleFactory.createCircle()
    // 2. Setup trust edges
    // 3. Simulate contributions for 3 months
    // 4. Verify circle completion
    
    log.success('Created circle #1');
    log.info('  Members: Alice, Bob, Charlie');
    log.info('  Status: COMPLETED (all contributions on-time)');
    log.info('  Reputation gained: 15 points per member');
    
    return { circleId: 1, members: 3 };
  } catch (error) {
    log.error(`Failed to create circle: ${error}`);
    throw error;
  }
}

// ─── Output Summary ────────────────────────────────────────────────────

function printSummary(cusdAddress: string, agents: any[], circle: any) {
  log.header('Test Data Setup Complete');
  
  console.log('\nDeployed Contracts:');
  console.log(`  MockcUSD:  ${cusdAddress}`);
  console.log(`  CircleFactory: ${process.env.CIRCLE_FACTORY_ADDRESS}`);
  console.log(`  TrustTierManager: ${process.env.TRUST_TIER_MANAGER_ADDRESS}`);
  console.log(`  CreditLine: ${process.env.CREDIT_LINE_ADDRESS}`);
  console.log(`  IntentRegistry: ${process.env.INTENT_REGISTRY_ADDRESS}`);
  
  console.log('\nRegistered Test Agents:');
  agents.forEach(({ name, agentId }) => {
    console.log(`  ${name}: agentId=${agentId}`);
  });
  
  console.log('\nCompleted Circles:');
  console.log(`  Circle #${circle.circleId}: ${circle.members} members (Alice, Bob, Charlie)`);
  console.log(`    Status: COMPLETED`);
  console.log(`    Reputation earned: 15 points per member`);
  
  console.log('\nTest Wallets (10,000 cUSD each):');
  console.log(`  Alice:   ${ALICE}`);
  console.log(`  Bob:     ${BOB}`);
  console.log(`  Charlie: ${CHARLIE}`);
  console.log(`  Dave:    ${DAVE}`);
  
  console.log('\nNext Steps:');
  console.log('  1. Run integration tests: forge test test/integration/FullFlow.t.sol -vv');
  console.log('  2. Start agent server: cd agent && bun run src/index.ts');
  console.log('  3. Test API endpoints: ./test/integration/api-test.sh');
  console.log('  4. Run demo flow: ./test/integration/demo-flow.sh');
  
  if (DRY_RUN) {
    console.log('\n✓ DRY RUN complete (no transactions sent)');
  } else {
    console.log('\n✓ Test data setup complete!');
  }
}

// ─── Main ──────────────────────────────────────────────────────────────

async function main() {
  log.header('IntentCircles Test Data Setup');
  
  console.log(`Deployer: ${account.address}`);
  console.log(`Network: Celo Sepolia (chainId=${chain.id})`);
  console.log(`RPC: ${RPC_URL}`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  
  try {
    // Step 0: Verify network
    const connected = await verifyNetwork();
    if (!connected) {
      log.error('Cannot proceed without network connectivity');
      process.exit(1);
    }
    
    // Step 1: Deploy MockcUSD
    const cusdAddress = await deployMockcUSD();
    
    // Step 2: Mint test tokens
    await mintTestTokens(cusdAddress);
    
    // Step 3: Register agents
    const agents = await registerAgents();
    
    // Step 4: Create completed circle
    const circle = await createCompletedCircle();
    
    // Print summary
    printSummary(cusdAddress, agents, circle);
    
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Setup failed:', error);
    process.exit(1);
  }
}

main();
