import { createPublicClient, createWalletClient, http, getContract } from "viem";
import { celoSepolia } from "viem/chains";
import { CELO_SEPOLIA_RPC, CONTRACT_ADDRESSES, agentAccount } from "./config.js";

// ─── Chain & Clients ─────────────────────────────────────────────────────────

export const publicClient = createPublicClient({
  chain: celoSepolia,
  transport: http(CELO_SEPOLIA_RPC),
});

export { agentAccount } from "./config.js";

export const walletClient = agentAccount
  ? createWalletClient({
      account: agentAccount,
      chain: celoSepolia,
      transport: http(CELO_SEPOLIA_RPC),
    })
  : null;

// ─── ABIs (inlined from Foundry out/) ────────────────────────────────────────

export const intentRegistryAbi = [
  { type: "constructor", inputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "submitIntent", inputs: [{ name: "intentType", type: "uint8" }, { name: "params", type: "bytes" }, { name: "expiresAt", type: "uint256" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "nonpayable" },
  { type: "function", name: "fulfillIntent", inputs: [{ name: "intentId", type: "uint256" }, { name: "solution", type: "bytes" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "batchFulfill", inputs: [{ name: "intentIds", type: "uint256[]" }, { name: "compositeSolution", type: "bytes" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "cancelIntent", inputs: [{ name: "intentId", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "getIntent", inputs: [{ name: "intentId", type: "uint256" }], outputs: [{ name: "", type: "tuple", components: [{ name: "id", type: "uint256" }, { name: "intentType", type: "uint8" }, { name: "creator", type: "address" }, { name: "paramsHash", type: "bytes32" }, { name: "createdAt", type: "uint256" }, { name: "expiresAt", type: "uint256" }, { name: "fulfilled", type: "bool" }, { name: "cancelled", type: "bool" }] }], stateMutability: "view" },
  { type: "function", name: "getOpenIntents", inputs: [{ name: "intentType", type: "uint8" }], outputs: [{ name: "", type: "tuple[]", components: [{ name: "id", type: "uint256" }, { name: "intentType", type: "uint8" }, { name: "creator", type: "address" }, { name: "paramsHash", type: "bytes32" }, { name: "createdAt", type: "uint256" }, { name: "expiresAt", type: "uint256" }, { name: "fulfilled", type: "bool" }, { name: "cancelled", type: "bool" }] }], stateMutability: "view" },
  { type: "function", name: "getIntentCount", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "registerAgent", inputs: [{ name: "agent", type: "address" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "deregisterAgent", inputs: [{ name: "agent", type: "address" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "registeredAgents", inputs: [{ name: "", type: "address" }], outputs: [{ name: "", type: "bool" }], stateMutability: "view" },
  { type: "function", name: "owner", inputs: [], outputs: [{ name: "", type: "address" }], stateMutability: "view" },
  { type: "event", name: "IntentSubmitted", inputs: [{ name: "intentId", type: "uint256", indexed: true }, { name: "intentType", type: "uint8", indexed: true }, { name: "creator", type: "address", indexed: true }, { name: "expiresAt", type: "uint256", indexed: false }], anonymous: false },
  { type: "event", name: "IntentFulfilled", inputs: [{ name: "intentId", type: "uint256", indexed: true }, { name: "agent", type: "address", indexed: true }], anonymous: false },
  { type: "event", name: "IntentBatchFulfilled", inputs: [{ name: "intentIds", type: "uint256[]", indexed: false }, { name: "agent", type: "address", indexed: true }, { name: "compositeSolution", type: "bytes", indexed: false }], anonymous: false },
] as const;

export const circleFactoryAbi = [
  { type: "constructor", inputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "createCircle", inputs: [{ name: "agent", type: "address" }, { name: "trustContract", type: "address" }, { name: "yieldVault", type: "address" }, { name: "minTrustScore", type: "uint256" }, { name: "roundDuration", type: "uint256" }], outputs: [{ name: "circleAddress", type: "address" }], stateMutability: "nonpayable" },
  { type: "function", name: "getAllCircles", inputs: [], outputs: [{ name: "", type: "address[]" }], stateMutability: "view" },
  { type: "function", name: "getCircle", inputs: [{ name: "circleId", type: "uint256" }], outputs: [{ name: "", type: "address" }], stateMutability: "view" },
  { type: "function", name: "getCircleCount", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "owner", inputs: [], outputs: [{ name: "", type: "address" }], stateMutability: "view" },
  { type: "event", name: "CircleCreated", inputs: [{ name: "circleId", type: "uint256", indexed: true }, { name: "circleAddress", type: "address", indexed: true }, { name: "agent", type: "address", indexed: true }, { name: "trustContract", type: "address", indexed: false }, { name: "yieldVault", type: "address", indexed: false }, { name: "minTrustScore", type: "uint256", indexed: false }, { name: "roundDuration", type: "uint256", indexed: false }], anonymous: false },
] as const;

export const saveCircleAbi = [
  { type: "function", name: "join", inputs: [{ name: "intentId", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "initialize", inputs: [{ name: "_tokenAddress", type: "address" }, { name: "_contributionAmount", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "startCircle", inputs: [], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "contribute", inputs: [], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "claimRotation", inputs: [], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "penalize", inputs: [{ name: "member", type: "address" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "sweepToYield", inputs: [{ name: "amount", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "harvestYield", inputs: [], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "dissolve", inputs: [], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "getMembers", inputs: [], outputs: [{ name: "", type: "address[]" }], stateMutability: "view" },
  { type: "function", name: "getMemberCount", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "getState", inputs: [], outputs: [{ name: "", type: "uint8" }], stateMutability: "view" },
  { type: "function", name: "isMember", inputs: [{ name: "", type: "address" }], outputs: [{ name: "", type: "bool" }], stateMutability: "view" },
  { type: "function", name: "currentRound", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "roundDuration", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "roundStartTime", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "rotationIndex", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "contributionAmount", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "totalYieldGenerated", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "totalContributed", inputs: [{ name: "", type: "address" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "hasClaimedThisRound", inputs: [{ name: "", type: "address" }], outputs: [{ name: "", type: "bool" }], stateMutability: "view" },
  { type: "function", name: "penaltyCount", inputs: [{ name: "", type: "address" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "tokenAddress", inputs: [], outputs: [{ name: "", type: "address" }], stateMutability: "view" },
  { type: "function", name: "minTrustScore", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "agent", inputs: [], outputs: [{ name: "", type: "address" }], stateMutability: "view" },
  { type: "function", name: "circleId", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "yieldVault", inputs: [], outputs: [{ name: "", type: "address" }], stateMutability: "view" },
  { type: "event", name: "MemberJoined", inputs: [{ name: "member", type: "address", indexed: true }], anonymous: false },
  { type: "event", name: "ContributionMade", inputs: [{ name: "member", type: "address", indexed: true }, { name: "amount", type: "uint256", indexed: false }], anonymous: false },
  { type: "event", name: "RotationClaimed", inputs: [{ name: "member", type: "address", indexed: true }, { name: "amount", type: "uint256", indexed: false }], anonymous: false },
  { type: "event", name: "MemberPenalized", inputs: [{ name: "member", type: "address", indexed: true }, { name: "penalty", type: "uint256", indexed: false }], anonymous: false },
  { type: "event", name: "YieldSwept", inputs: [{ name: "amount", type: "uint256", indexed: false }], anonymous: false },
  { type: "event", name: "YieldHarvested", inputs: [{ name: "amount", type: "uint256", indexed: false }], anonymous: false },
  { type: "event", name: "CircleFormed", inputs: [{ name: "circleId", type: "uint256", indexed: true }], anonymous: false },
  { type: "event", name: "CircleCompleted", inputs: [], anonymous: false },
  { type: "event", name: "CircleDissolved", inputs: [], anonymous: false },
  { type: "error", name: "ReentrancyGuardReentrantCall", inputs: [] },
] as const;

export const circleTrustAbi = [
  { type: "function", name: "trust", inputs: [{ name: "trustee", type: "address" }, { name: "expiresAt", type: "uint96" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "revokeTrust", inputs: [{ name: "trustee", type: "address" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "isTrusted", inputs: [{ name: "truster", type: "address" }, { name: "trustee", type: "address" }], outputs: [{ name: "", type: "bool" }], stateMutability: "view" },
  { type: "function", name: "trustScore", inputs: [{ name: "user", type: "address" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "meetsMinTrust", inputs: [{ name: "user", type: "address" }, { name: "minScore", type: "uint256" }], outputs: [{ name: "", type: "bool" }], stateMutability: "view" },
  { type: "function", name: "getTrustEdges", inputs: [{ name: "user", type: "address" }], outputs: [{ name: "", type: "tuple[]", components: [{ name: "trustee", type: "address" }, { name: "expiresAt", type: "uint96" }] }], stateMutability: "view" },
  { type: "event", name: "TrustAdded", inputs: [{ name: "truster", type: "address", indexed: true }, { name: "trustee", type: "address", indexed: true }, { name: "expiresAt", type: "uint96", indexed: false }], anonymous: false },
  { type: "event", name: "TrustRevoked", inputs: [{ name: "truster", type: "address", indexed: true }, { name: "trustee", type: "address", indexed: true }], anonymous: false },
] as const;

export const erc20Abi = [
  { type: "function", name: "balanceOf", inputs: [{ name: "account", type: "address" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "allowance", inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "approve", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ name: "", type: "bool" }], stateMutability: "nonpayable" },
  { type: "function", name: "decimals", inputs: [], outputs: [{ name: "", type: "uint8" }], stateMutability: "view" },
  { type: "function", name: "symbol", inputs: [], outputs: [{ name: "", type: "string" }], stateMutability: "view" },
] as const;

// ─── Contract Instances ───────────────────────────────────────────────────────

export function getIntentRegistry() {
  return getContract({
    address: CONTRACT_ADDRESSES.intentRegistry,
    abi: intentRegistryAbi,
    client: publicClient,
  });
}

export function getCircleFactory() {
  return getContract({
    address: CONTRACT_ADDRESSES.circleFactory,
    abi: circleFactoryAbi,
    client: publicClient,
  });
}

export function getSaveCircle(address: `0x${string}`) {
  return getContract({
    address,
    abi: saveCircleAbi,
    client: publicClient,
  });
}

export function getCircleTrust() {
  return getContract({
    address: CONTRACT_ADDRESSES.circleTrust,
    abi: circleTrustAbi,
    client: publicClient,
  });
}

// ─── Types derived from on-chain structs ─────────────────────────────────────

export type OnChainIntent = {
  id: bigint;
  intentType: number;
  creator: `0x${string}`;
  paramsHash: `0x${string}`;
  createdAt: bigint;
  expiresAt: bigint;
  fulfilled: boolean;
  cancelled: boolean;
};

// IntentType enum (matches Solidity)
export enum IntentType {
  JOIN_CIRCLE = 0,
  LEAVE_CIRCLE = 1,
  ADJUST_CONTRIBUTION = 2,
}

// CircleState enum (matches Solidity)
export enum CircleState {
  FORMING  = 0,
  ACTIVE   = 1,
  PAUSED   = 2,
  COMPLETE = 3,
  DISSOLVED = 4,
}
