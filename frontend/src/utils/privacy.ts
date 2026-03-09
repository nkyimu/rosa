import { keccak256, encodeAbiParameters, parseAbiParameters, parseUnits } from "viem";

/**
 * Privacy utilities for commit-reveal contribution flow
 * Used when circle operates in Nightfall privacy mode
 */

export interface CommitmentData {
  amount: string; // cUSD amount as string
  salt: string;   // 32-byte salt hex
  commitment: string; // keccak256(abi.encodePacked(amount, salt))
  proofId?: string; // Optional Nightfall proof ID
}

/**
 * Generate a 32-byte random salt
 */
export function generateSalt(): string {
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  return "0x" + Array.from(randomBytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Compute commitment hash for amount + salt
 * commitment = keccak256(abi.encodePacked(amount, salt))
 */
export function computeCommitment(amount: string, salt: string): string {
  try {
    // Parse amount to wei (18 decimals)
    const amountWei = parseUnits(amount, 18);
    
    // Encode packed: uint256 amount (32 bytes) + bytes32 salt (32 bytes)
    const encoded = encodeAbiParameters(
      parseAbiParameters("uint256 amount, bytes32 salt"),
      [amountWei, salt as `0x${string}`]
    );
    
    // Hash the encoded data
    return keccak256(encoded);
  } catch (error) {
    console.error("Error computing commitment:", error);
    throw new Error("Failed to compute commitment hash");
  }
}

/**
 * Store commitment data in localStorage for later reveal
 * User needs salt to prove the contribution later
 */
export function storeCommitmentData(circleAddress: string, userData: CommitmentData): void {
  const key = `commit_${circleAddress}`;
  localStorage.setItem(key, JSON.stringify(userData));
}

/**
 * Retrieve stored commitment data by circle address
 */
export function getCommitmentData(circleAddress: string): CommitmentData | null {
  const key = `commit_${circleAddress}`;
  const stored = localStorage.getItem(key);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as CommitmentData;
  } catch {
    return null;
  }
}

/**
 * Clear commitment data after successful reveal/confirmation
 */
export function clearCommitmentData(circleAddress: string): void {
  const key = `commit_${circleAddress}`;
  localStorage.removeItem(key);
}

/**
 * Check if circle should use privacy mode
 * For hackathon: use localStorage flag per circle
 * In production: read from SaveCircle.useNightfallMode()
 */
export function getPrivacyMode(circleAddress: string): boolean {
  const key = `privacy_mode_${circleAddress}`;
  const stored = localStorage.getItem(key);
  return stored === "true"; // Default false
}

/**
 * Set privacy mode for a circle (demo purposes)
 */
export function setPrivacyMode(circleAddress: string, enabled: boolean): void {
  const key = `privacy_mode_${circleAddress}`;
  localStorage.setItem(key, enabled ? "true" : "false");
}
