/**
 * Nightfall Privacy Layer Integration
 *
 * Manages private transactions via Celo's Nightfall ZK privacy layer.
 * The agent runs the Nightfall client (Docker) and orchestrates:
 * - Deposits: public cUSD → private Nightfall commitment
 * - Transfers: private peer-to-peer within Nightfall
 * - Withdrawals: private commitment → public cUSD
 */
import { type Address } from 'viem';
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
/**
 * Derive ZKP keys from a mnemonic phrase.
 * Must be called once before any Nightfall operations.
 */
export declare function deriveKeys(mnemonic: string, childPath?: string): Promise<NightfallKeys>;
/**
 * Deposit cUSD into Nightfall (public → private).
 * Locks tokens in Nightfall escrow contract.
 */
export declare function deposit(ercAddress: string, amountWei: bigint): Promise<DepositResult>;
/**
 * Transfer tokens privately within Nightfall.
 * Sender and receiver amounts are hidden.
 */
export declare function transfer(ercAddress: string, amountWei: bigint, recipientZkpPublicKey: string): Promise<TransferResult>;
/**
 * Withdraw from Nightfall back to public (private → public).
 * Converts private commitment back to on-chain cUSD.
 */
export declare function withdraw(ercAddress: string, amountWei: bigint, recipientAddress: string): Promise<WithdrawResult>;
/**
 * Check the status of a Nightfall request.
 */
export declare function checkRequestStatus(requestId: string): Promise<RequestStatus>;
/**
 * Check if the Nightfall client is healthy and running.
 */
export declare function isHealthy(): Promise<boolean>;
/**
 * Process a contribution through Nightfall.
 *
 * Flow:
 * 1. User submits commitment hash on-chain (commitContribution)
 * 2. User deposits cUSD to Nightfall
 * 3. Agent verifies deposit matches commitment
 * 4. Agent records contribution on SaveCircle (recordNightfallContribution)
 */
export declare function processContribution(memberAddress: Address, circleAddress: Address, amount: bigint, salt: `0x${string}`): Promise<{
    success: boolean;
    requestId?: string;
    error?: string;
}>;
/**
 * Process a payout through Nightfall.
 *
 * Flow:
 * 1. Agent initiates Nightfall withdrawal for the recipient
 * 2. Nightfall creates ZK proof and sends to L1
 * 3. Agent records payout on SaveCircle (recordNightfallPayout)
 */
export declare function processPayout(recipientAddress: Address, amount: bigint): Promise<{
    success: boolean;
    requestId?: string;
    error?: string;
}>;
/**
 * Generate a commitment hash for a contribution.
 * Used by frontend to create the on-chain commitment.
 */
export declare function generateCommitment(amount: bigint, salt: `0x${string}`): `0x${string}`;
/**
 * Verify a commitment matches the expected values.
 */
export declare function verifyCommitment(commitment: `0x${string}`, amount: bigint, salt: `0x${string}`): boolean;
export interface NightfallStatus {
    healthy: boolean;
    clientUrl: string;
    mode: 'active' | 'degraded' | 'offline';
}
export declare function getStatus(): Promise<NightfallStatus>;
