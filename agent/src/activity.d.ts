/**
 * @file activity.ts
 * @description Agent activity feed — logs all agent actions for live UI updates
 *
 * Stores activities in memory with a fixed size limit (last 20).
 * Exported functions allow matcher and keeper loops to push activity entries.
 */
export type ActivityAction = "AGENT_STARTED" | "INTENT_PARSED" | "CIRCLE_SCAN" | "CIRCLE_MATCH" | "CIRCLE_HEALTH" | "CONTRIBUTION" | "PRIVACY_CHECK" | "EXECUTE" | "ERROR" | "CREDIT_ISSUED" | "CREDIT_ACTIVATED" | "CREDIT_DRAWN" | "CREDIT_REPAID" | "CREDIT_DEFAULTED" | "TRUST_TIER_CHANGED" | "BARTER_SUBMITTED" | "BARTER_MATCHED" | "BARTER_SETTLED";
export interface Activity {
    id: string;
    timestamp: string;
    action: ActivityAction;
    detail: string;
    reasoning: string;
    confidence?: number;
}
/**
 * Add an activity entry to the buffer
 * @param action The activity type
 * @param detail Short description
 * @param reasoning Longer explanation
 * @param confidence Optional confidence score
 */
export declare function addActivity(action: ActivityAction, detail: string, reasoning: string, confidence?: number): Activity;
/**
 * Get all activities (for API endpoint)
 * @returns Last 20 activities
 */
export declare function getActivities(): Activity[];
/**
 * Clear all activities (for testing)
 */
export declare function clearActivities(): void;
/**
 * Get activity count
 */
export declare function getActivityCount(): number;
