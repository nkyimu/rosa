/**
 * @file activity.ts
 * @description Agent activity feed — logs all agent actions for live UI updates
 *
 * Stores activities in memory with a fixed size limit (last 20).
 * Exported functions allow matcher and keeper loops to push activity entries.
 */

export type ActivityAction =
  | "AGENT_STARTED"
  | "INTENT_PARSED"
  | "CIRCLE_SCAN"
  | "CIRCLE_MATCH"
  | "CIRCLE_HEALTH"
  | "CONTRIBUTION"
  | "PRIVACY_CHECK"
  | "EXECUTE"
  | "ERROR";

export interface Activity {
  id: string;
  timestamp: string; // ISO 8601
  action: ActivityAction;
  detail: string; // Short description
  reasoning: string; // Longer explanation
  confidence?: number; // Confidence score (0-1)
}

// In-memory activity buffer (last 20)
const MAX_ACTIVITIES = 20;
let activityBuffer: Activity[] = [];
let nextId = 1;

/**
 * Add an activity entry to the buffer
 * @param action The activity type
 * @param detail Short description
 * @param reasoning Longer explanation
 * @param confidence Optional confidence score
 */
export function addActivity(
  action: ActivityAction,
  detail: string,
  reasoning: string,
  confidence?: number
): Activity {
  const activity: Activity = {
    id: String(nextId++),
    timestamp: new Date().toISOString(),
    action,
    detail,
    reasoning,
    ...(confidence !== undefined && { confidence }),
  };

  activityBuffer.push(activity);

  // Keep only last 20
  if (activityBuffer.length > MAX_ACTIVITIES) {
    activityBuffer = activityBuffer.slice(-MAX_ACTIVITIES);
  }

  // Log to console for debugging
  console.log(`[activity] ${action} — ${detail}`);

  return activity;
}

/**
 * Get all activities (for API endpoint)
 * @returns Last 20 activities
 */
export function getActivities(): Activity[] {
  return [...activityBuffer];
}

/**
 * Clear all activities (for testing)
 */
export function clearActivities(): void {
  activityBuffer = [];
  nextId = 1;
}

/**
 * Get activity count
 */
export function getActivityCount(): number {
  return activityBuffer.length;
}
