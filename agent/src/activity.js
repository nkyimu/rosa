/**
 * @file activity.ts
 * @description Agent activity feed — logs all agent actions for live UI updates
 *
 * Stores activities in memory with a fixed size limit (last 20).
 * Exported functions allow matcher and keeper loops to push activity entries.
 */
// In-memory activity buffer (last 20)
const MAX_ACTIVITIES = 20;
let activityBuffer = [];
let nextId = 1;
/**
 * Add an activity entry to the buffer
 * @param action The activity type
 * @param detail Short description
 * @param reasoning Longer explanation
 * @param confidence Optional confidence score
 */
export function addActivity(action, detail, reasoning, confidence) {
    const activity = {
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
export function getActivities() {
    return [...activityBuffer];
}
/**
 * Clear all activities (for testing)
 */
export function clearActivities() {
    activityBuffer = [];
    nextId = 1;
}
/**
 * Get activity count
 */
export function getActivityCount() {
    return activityBuffer.length;
}
