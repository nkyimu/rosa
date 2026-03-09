/**
 * Nightfall Privacy Layer Integration
 * 
 * Manages private transactions via Celo's Nightfall ZK privacy layer.
 * The agent runs the Nightfall client (Docker) and orchestrates:
 * - Deposits: public cUSD → private Nightfall commitment
 * - Transfers: private peer-to-peer within Nightfall
 * - Withdrawals: private commitment → public cUSD
 */

import { createPublicClient, createWalletClient, http, keccak256, encodePacked, parseEther, type Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { CONTRACT_ADDRESSES } from './config.js';

// Nightfall client REST API
const NIGHTFALL_CLIENT = process.env.NIGHTFALL_CLIENT_URL || 'http://localhost:3001';
const NIGHTFALL_WEBHOOK = process.env.NIGHTFALL_WEBHOOK_URL || 'http://localhost:8081/webhook';

// Types
export interface NightfallKeys {
  rootKey: string;
  nullifierKey: string;
  zkpPrivateKey: string;
  zkpPublicKey: string;
}

export interface DepositResult {
  requestId: string;
  status: 'pending' | 'success' | 'failed';
}

export interface TransferResult {
  requestId: string;
  status: 'pending' | 'success' | 'failed';
}

export interface WithdrawResult {
  requestId: string;
  status: 'pending' | 'success' | 'failed';
}

export type RequestStatus = 'pending' | 'deposited' | 'transferred' | 'withdrawn' | 'failed';

// ========== Key Management ==========

/**
 * Derive ZKP keys from a mnemonic phrase.
 * Must be called once before any Nightfall operations.
 */
export async function deriveKeys(mnemonic: string, childPath = "m/44'/60'/0'/0/0"): Promise<NightfallKeys> {
  const res = await fetch(`${NIGHTFALL_CLIENT}/v1/deriveKey`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mnemonic, child_path: childPath })
  });
  if (!res.ok) throw new Error(`deriveKey failed: ${res.status} ${await res.text()}`);
  return res.json();
}

// ========== Core Operations ==========

/**
 * Deposit cUSD into Nightfall (public → private).
 * Locks tokens in Nightfall escrow contract.
 */
export async function deposit(
  ercAddress: string,
  amountWei: bigint
): Promise<DepositResult> {
  const requestId = crypto.randomUUID();
  const valueHex = amountWei.toString(16).padStart(64, '0');
  
  const res = await fetch(`${NIGHTFALL_CLIENT}/v1/deposit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Request-ID': requestId
    },
    body: JSON.stringify({
      ercAddress,
      tokenId: '0'.repeat(64),
      tokenType: '0',
      value: valueHex,
      fee: '0'.repeat(64),
      deposit_fee: '0'.repeat(64)
    })
  });
  
  if (!res.ok) {
    const err = await res.text();
    console.error(`Nightfall deposit failed: ${err}`);
    return { requestId, status: 'failed' };
  }
  
  return { requestId, status: 'pending' };
}

/**
 * Transfer tokens privately within Nightfall.
 * Sender and receiver amounts are hidden.
 */
export async function transfer(
  ercAddress: string,
  amountWei: bigint,
  recipientZkpPublicKey: string
): Promise<TransferResult> {
  const requestId = crypto.randomUUID();
  const valueHex = amountWei.toString(16).padStart(64, '0');
  
  const res = await fetch(`${NIGHTFALL_CLIENT}/v1/transfer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Request-ID': requestId
    },
    body: JSON.stringify({
      ercAddress,
      tokenId: '0'.repeat(64),
      tokenType: '0',
      value: valueHex,
      fee: '0'.repeat(64),
      recipientData: {
        recipientCompressedZkpPublicKeys: [recipientZkpPublicKey],
        values: [valueHex]
      }
    })
  });
  
  if (!res.ok) {
    const err = await res.text();
    console.error(`Nightfall transfer failed: ${err}`);
    return { requestId, status: 'failed' };
  }
  
  return { requestId, status: 'pending' };
}

/**
 * Withdraw from Nightfall back to public (private → public).
 * Converts private commitment back to on-chain cUSD.
 */
export async function withdraw(
  ercAddress: string,
  amountWei: bigint,
  recipientAddress: string
): Promise<WithdrawResult> {
  const requestId = crypto.randomUUID();
  const valueHex = amountWei.toString(16).padStart(64, '0');
  
  const res = await fetch(`${NIGHTFALL_CLIENT}/v1/withdraw`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Request-ID': requestId
    },
    body: JSON.stringify({
      ercAddress,
      tokenId: '0'.repeat(64),
      tokenType: '0',
      value: valueHex,
      fee: '0'.repeat(64),
      recipientAddress
    })
  });
  
  if (!res.ok) {
    const err = await res.text();
    console.error(`Nightfall withdraw failed: ${err}`);
    return { requestId, status: 'failed' };
  }
  
  return { requestId, status: 'pending' };
}

/**
 * Check the status of a Nightfall request.
 */
export async function checkRequestStatus(requestId: string): Promise<RequestStatus> {
  const res = await fetch(`${NIGHTFALL_CLIENT}/v1/request/${requestId}`);
  if (!res.ok) return 'failed';
  const data = await res.json();
  return data.status || 'pending';
}

/**
 * Check if the Nightfall client is healthy and running.
 */
export async function isHealthy(): Promise<boolean> {
  try {
    const res = await fetch(`${NIGHTFALL_CLIENT}/v1/health`, {
      signal: AbortSignal.timeout(5000)
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ========== Circle Integration ==========

/**
 * Process a contribution through Nightfall.
 * 
 * Flow:
 * 1. User submits commitment hash on-chain (commitContribution)
 * 2. User deposits cUSD to Nightfall
 * 3. Agent verifies deposit matches commitment
 * 4. Agent records contribution on SaveCircle (recordNightfallContribution)
 */
export async function processContribution(
  memberAddress: Address,
  circleAddress: Address,
  amount: bigint,
  salt: `0x${string}`
): Promise<{ success: boolean; requestId?: string; error?: string }> {
  const cUSD = CONTRACT_ADDRESSES.cUSD as string;
  
  // Step 1: Deposit member's cUSD to Nightfall
  const depositResult = await deposit(cUSD, amount);
  if (depositResult.status === 'failed') {
    return { success: false, error: 'Nightfall deposit failed' };
  }
  
  // Step 2: Wait for deposit confirmation
  let attempts = 0;
  let status: RequestStatus = 'pending';
  while (status === 'pending' && attempts < 60) {
    await new Promise(r => setTimeout(r, 5000)); // 5s poll
    status = await checkRequestStatus(depositResult.requestId);
    attempts++;
  }
  
  if (status !== 'deposited') {
    return { success: false, error: `Deposit stuck in status: ${status}` };
  }
  
  // Step 3: Agent calls recordNightfallContribution on-chain
  // (This is done by the keeper module, not here)
  
  return { success: true, requestId: depositResult.requestId };
}

/**
 * Process a payout through Nightfall.
 * 
 * Flow:
 * 1. Agent initiates Nightfall withdrawal for the recipient
 * 2. Nightfall creates ZK proof and sends to L1
 * 3. Agent records payout on SaveCircle (recordNightfallPayout)
 */
export async function processPayout(
  recipientAddress: Address,
  amount: bigint
): Promise<{ success: boolean; requestId?: string; error?: string }> {
  const cUSD = CONTRACT_ADDRESSES.cUSD as string;
  
  const withdrawResult = await withdraw(cUSD, amount, recipientAddress);
  if (withdrawResult.status === 'failed') {
    return { success: false, error: 'Nightfall withdrawal failed' };
  }
  
  // Wait for withdrawal confirmation
  let attempts = 0;
  let status: RequestStatus = 'pending';
  while (status === 'pending' && attempts < 60) {
    await new Promise(r => setTimeout(r, 5000));
    status = await checkRequestStatus(withdrawResult.requestId);
    attempts++;
  }
  
  if (status !== 'withdrawn') {
    return { success: false, error: `Withdrawal stuck in status: ${status}` };
  }
  
  return { success: true, requestId: withdrawResult.requestId };
}

/**
 * Generate a commitment hash for a contribution.
 * Used by frontend to create the on-chain commitment.
 */
export function generateCommitment(amount: bigint, salt: `0x${string}`): `0x${string}` {
  return keccak256(encodePacked(['uint256', 'bytes32'], [amount, salt]));
}

/**
 * Verify a commitment matches the expected values.
 */
export function verifyCommitment(
  commitment: `0x${string}`,
  amount: bigint,
  salt: `0x${string}`
): boolean {
  const expected = generateCommitment(amount, salt);
  return commitment === expected;
}

// ========== Status & Monitoring ==========

export interface NightfallStatus {
  healthy: boolean;
  clientUrl: string;
  mode: 'active' | 'degraded' | 'offline';
}

export async function getStatus(): Promise<NightfallStatus> {
  const healthy = await isHealthy();
  return {
    healthy,
    clientUrl: NIGHTFALL_CLIENT,
    mode: healthy ? 'active' : 'offline'
  };
}
