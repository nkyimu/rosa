/**
 * Venice Privacy Layer for ROSA Intent Matching
 * 
 * Routes ROSA's matching decisions through Venice AI's private inference API.
 * Venice does NOT store or log any prompts or responses — zero data retention.
 * 
 * Architecture:
 * 1. Collect open intents from chain (already done in matcher.ts)
 * 2. Send sanitized intent data to Venice for private scoring
 * 3. Venice reasons about compatibility WITHOUT storing member data
 * 4. Use Venice's scoring to form optimal groups
 * 5. Log privacy attestation (what data was sent, that it wasn't stored)
 * 
 * This is the "Private Agents, Trusted Actions" angle:
 * "Ethereum provides public coordination; Venice provides private cognition"
 */

import type { Intent, IntentGroup } from "./matcher.js";
import { recordPrivacyEvent } from "./privacy-attestation.js";

// ─── Venice API Configuration ──────────────────────────────────────────────────

const VENICE_API_BASE = "https://api.venice.ai/api/v1";
const VENICE_API_KEY = process.env.VENICE_API_KEY || "";
const VENICE_MODEL = process.env.VENICE_MODEL || "e2ee-glm-4-7-flash-p";

// When Venice is unavailable, fall back to local matching
export type VeniceMode = "disabled" | "enabled";
let veniceMode: VeniceMode = VENICE_API_KEY ? "enabled" : "disabled";

// ─── Privacy-Safe Intent Sanitizer ────────────────────────────────────────────

/**
 * Sanitize intents for Venice: remove addresses, keep only amounts and cycles
 * This prevents Venice from learning member identities while still enabling scoring
 */
function sanitizeIntentsForVenice(intents: Intent[]): SanitizedIntent[] {
  return intents.map((intent, idx) => ({
    id: idx, // Use index instead of intent.id
    contributionAmount: intent.params.contributionAmount.toString(),
    cycleDuration: intent.params.cycleDuration.toString(),
    preferredSize: intent.params.preferredSize,
    timestamp: Math.floor(Date.now() / 1000),
  }));
}

export type SanitizedIntent = {
  id: number;
  contributionAmount: string;
  cycleDuration: string;
  preferredSize: number;
  timestamp: number;
};

export type VeniceCompatibilityScore = {
  intentIndex: number;
  riskScore: number; // 0–100, lower is better
  recommendedGroupSize: number;
  compatibilityNotes: string;
};

export type VeniceGroupRecommendation = {
  group: number[];
  confidence: number; // 0–1
  estimatedROI: number; // Projected savings rate
  riskAssessment: string;
};

// ─── Venice API Call (OpenAI-compatible) ────────────────────────────────────

async function callVenicePrivateInference(
  systemPrompt: string,
  userPrompt: string
): Promise<string | null> {
  if (veniceMode !== "enabled") {
    console.log("[venice] Venice mode disabled — falling back to local matching");
    return null;
  }

  if (!VENICE_API_KEY) {
    console.warn("[venice] VENICE_API_KEY not set — falling back to local matching");
    veniceMode = "disabled";
    return null;
  }

  try {
    const response = await fetch(`${VENICE_API_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${VENICE_API_KEY}`,
      },
      body: JSON.stringify({
        model: VENICE_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2, // Low temperature for deterministic scoring
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`[venice] API error ${response.status}: ${error}`);
      recordPrivacyEvent({
        type: "venice_error",
        status: response.status,
        model: VENICE_MODEL,
        timestamp: Date.now(),
      });
      return null;
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;

    if (content) {
      recordPrivacyEvent({
        type: "venice_call_success",
        model: VENICE_MODEL,
        isTEE: VENICE_MODEL.startsWith("e2ee-"),
        zeroRetention: true,
        timestamp: Date.now(),
      });
    }

    return content || null;
  } catch (err) {
    console.error("[venice] Network error:", err instanceof Error ? err.message : String(err));
    recordPrivacyEvent({
      type: "venice_network_error",
      error: err instanceof Error ? err.message : String(err),
      timestamp: Date.now(),
    });
    return null;
  }
}

// ─── Venice Scoring (Risk Assessment) ──────────────────────────────────────

/**
 * Use Venice to score each intent's risk and suitability
 * Returns compatibility scores that feed into grouping
 */
export async function scoreIntentsWithVenice(
  intents: Intent[]
): Promise<VeniceCompatibilityScore[]> {
  if (intents.length === 0) return [];

  const sanitized = sanitizeIntentsForVenice(intents);

  const systemPrompt = `You are a financial risk analyzer for autonomous savings circles (ROSCAs).
Your task: assess the risk profile of each participant in a savings group based on:
- Contribution amounts (larger = higher risk due to greater liability)
- Cycle duration (longer cycles = higher default risk)
- Preferred group size (larger groups = lower individual trust)

Respond in JSON format with risk scores (0–100, lower is better) and group size recommendations.
IMPORTANT: You do NOT store or retain any of this data. This is a private inference — your response is ephemeral.`;

  const userPrompt = `Analyze these ${intents.length} intents for ROSCA compatibility and risk:

${JSON.stringify(sanitized, null, 2)}

Return a JSON array with one object per intent (matching order):
[
  {
    "intentIndex": 0,
    "riskScore": <0-100>,
    "recommendedGroupSize": <3-20>,
    "compatibilityNotes": "<brief analysis>"
  },
  ...
]`;

  const response = await callVenicePrivateInference(systemPrompt, userPrompt);
  if (!response) {
    console.log("[venice] Falling back to local matching (no Venice response)");
    return intents.map((_, idx) => ({
      intentIndex: idx,
      riskScore: 50, // neutral default
      recommendedGroupSize: 5,
      compatibilityNotes: "Venice unavailable — using local defaults",
    }));
  }

  try {
    // Extract JSON from response (Venice may wrap it in markdown)
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn("[venice] Could not extract JSON from response");
      return intents.map((_, idx) => ({
        intentIndex: idx,
        riskScore: 50,
        recommendedGroupSize: 5,
        compatibilityNotes: "Venice response parse failed",
      }));
    }

    const scores = JSON.parse(jsonMatch[0]) as VeniceCompatibilityScore[];
    console.log(`[venice] Scored ${scores.length} intents for risk and compatibility`);
    return scores;
  } catch (err) {
    console.error("[venice] Failed to parse risk scores:", err);
    return intents.map((_, idx) => ({
      intentIndex: idx,
      riskScore: 50,
      recommendedGroupSize: 5,
      compatibilityNotes: "Venice parse error",
    }));
  }
}

// ─── Venice Grouping Recommendations ──────────────────────────────────────

/**
 * Use Venice to recommend optimal group formations based on risk, amounts, and trust
 */
export async function getGroupRecommendationsFromVenice(
  intents: Intent[],
  riskScores: VeniceCompatibilityScore[]
): Promise<VeniceGroupRecommendation[]> {
  if (intents.length === 0) return [];

  const sanitized = sanitizeIntentsForVenice(intents);

  const systemPrompt = `You are a group formation algorithm for autonomous savings circles.
Your goal: form optimal groups that balance risk, financial fit, and group dynamics.
Constraints:
- Each group has 3–20 members
- Members in a group must have matching cycle durations
- Contribution amounts can vary ±10% (price discovery by Venice)
- Lower-risk members stabilize higher-risk members

Respond ONLY with valid JSON. No explanation, no markdown.`;

  const userPrompt = `Form optimal groups from these intents and risk scores:

Intents: ${JSON.stringify(sanitized, null, 2)}

Risk Scores: ${JSON.stringify(riskScores, null, 2)}

Return ONLY a JSON array:
[
  {
    "group": [<intent indices>],
    "confidence": <0-1>,
    "estimatedROI": <savings rate as decimal, e.g., 0.15>,
    "riskAssessment": "<brief summary>"
  },
  ...
]`;

  const response = await callVenicePrivateInference(systemPrompt, userPrompt);
  if (!response) {
    console.log("[venice] No group recommendations from Venice — returning empty");
    return [];
  }

  try {
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn("[venice] Could not extract JSON from group recommendations");
      return [];
    }

    const recommendations = JSON.parse(jsonMatch[0]) as VeniceGroupRecommendation[];
    console.log(
      `[venice] Generated ${recommendations.length} group recommendation(s) from Venice`
    );
    return recommendations;
  } catch (err) {
    console.error("[venice] Failed to parse group recommendations:", err);
    return [];
  }
}

// ─── Venice-Enhanced Grouping ──────────────────────────────────────────

/**
 * Enhanced grouping that uses Venice's risk assessment and recommendations
 * Falls back to local matching if Venice is unavailable
 */
export async function groupWithVeniceScoring(
  intents: Intent[]
): Promise<VeniceGroupRecommendation[]> {
  if (intents.length === 0) return [];

  console.log(`[venice] Starting Venice-enhanced grouping for ${intents.length} intents`);

  // Step 1: Get risk scores from Venice
  const riskScores = await scoreIntentsWithVenice(intents);

  // Step 2: Get group recommendations
  const recommendations = await getGroupRecommendationsFromVenice(intents, riskScores);

  // Log the final grouping decision
  recordPrivacyEvent({
    type: "grouping_decision",
    intentsAnalyzed: intents.length,
    groupsRecommended: recommendations.length,
    veniceModel: VENICE_MODEL,
    timestamp: Date.now(),
  });

  return recommendations;
}

// ─── Status ────────────────────────────────────────────────────────────────

export function getVeniceStatus(): {
  mode: VeniceMode;
  model: string;
  isTEE: boolean;
} {
  return {
    mode: veniceMode,
    model: VENICE_MODEL,
    isTEE: VENICE_MODEL.startsWith("e2ee-"),
  };
}

export function setVeniceMode(mode: VeniceMode): void {
  veniceMode = mode;
  console.log(`[venice] Mode set to: ${mode}`);
}
