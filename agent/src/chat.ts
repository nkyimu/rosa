/**
 * @file chat.ts
 * @description Conversational natural language parser for IntentCircles
 *
 * Parses user messages into structured intents without LLM.
 * Regex-based keyword matching for hackathon demo.
 *
 * Supported patterns:
 * - "save X cUSD [per month]" → JOIN_CIRCLE
 * - "contribute X" / "pay X" → CONTRIBUTE
 * - "leave" / "exit" / "withdraw" → EXIT_CIRCLE
 * - "check my circle" / "status" → STATUS
 */

import { parseUnits } from "viem";

export interface ParsedIntent {
  type: "JOIN_CIRCLE" | "CONTRIBUTE" | "EXIT_CIRCLE" | "STATUS" | "UNKNOWN";
  amount?: string; // Wei (e.g., "50000000000000000000" for 50 cUSD)
  duration?: number; // months
  currency?: string;
  confidence: number;
}

export interface ChatResponse {
  reply: string;
  parsed: ParsedIntent;
  reasoning: string[];
  confidence: number;
  suggestedAction?: "submitIntent" | "viewCircles" | "viewStatus";
}

/**
 * Parse natural language message into structured intent
 * @param message User's natural language message
 * @returns Parsed intent with reasoning
 */
export function parseMessage(message: string): ParsedIntent {
  const lower = message.toLowerCase().trim();
  const reasoning: string[] = [];

  // Pattern 1: "save X cUSD [per month]"
  const savePattern = /save\s+(\d+(?:\.\d+)?)\s*cUSD\s*(?:per\s+month|\/month)?(?:\s+for\s+(\d+)\s+months?)?/i;
  const saveMatch = lower.match(savePattern);

  if (saveMatch) {
    const amount = parseUnits(saveMatch[1] || "0", 18).toString();
    const duration = saveMatch[2] ? parseInt(saveMatch[2], 10) : 6; // default 6 months

    return {
      type: "JOIN_CIRCLE",
      amount,
      duration,
      currency: "cUSD",
      confidence: 0.95,
    };
  }

  // Pattern 2: "contribute X" or "pay X"
  const contributePattern = /(?:contribute|pay|deposit)\s+(\d+(?:\.\d+)?)\s*cUSD/i;
  const contributeMatch = lower.match(contributePattern);

  if (contributeMatch) {
    const amount = parseUnits(contributeMatch[1] || "0", 18).toString();

    return {
      type: "CONTRIBUTE",
      amount,
      currency: "cUSD",
      confidence: 0.9,
    };
  }

  // Pattern 3: "leave" / "exit" / "withdraw"
  if (/\b(leave|exit|withdraw|quit)\b/.test(lower)) {
    return {
      type: "EXIT_CIRCLE",
      confidence: 0.9,
    };
  }

  // Pattern 4: "check my circle" / "status"
  if (/(?:check|view|show)\s+(?:my\s+)?circle|status|progress/i.test(lower)) {
    return {
      type: "STATUS",
      confidence: 0.85,
    };
  }

  // Fallback: unknown
  return {
    type: "UNKNOWN",
    confidence: 0.3,
  };
}

/**
 * Generate human-friendly reply and reasoning for parsed intent
 * @param parsed The parsed intent
 * @param originalMessage The original user message
 * @returns Chat response with reply, reasoning, and suggested action
 */
export function generateResponse(parsed: ParsedIntent, originalMessage: string): ChatResponse {
  const reasoning: string[] = [];
  let reply = "";
  let suggestedAction: "submitIntent" | "viewCircles" | "viewStatus" | undefined;

  switch (parsed.type) {
    case "JOIN_CIRCLE": {
      const amountCUSD = parsed.amount ? (Number(parsed.amount) / 1e18).toFixed(2) : "?";
      const totalAmount = parsed.duration ? (Number(amountCUSD) * parsed.duration).toFixed(2) : "?";

      reasoning.push(`Parsed savings goal: ${amountCUSD} cUSD/month for ${parsed.duration} months`);
      reasoning.push(`Total payout: ${totalAmount} cUSD over the circle lifetime`);
      reasoning.push(`Searching for compatible circles with similar parameters...`);
      reasoning.push(`Recommended: Submit JOIN_CIRCLE intent to be matched by the keeper`);

      reply = `I'll set up a savings circle for you! Here's what I understood:\n\n📊 Goal: Save **${amountCUSD} cUSD/month** for **${parsed.duration} months**\nTotal commitment: **${totalAmount} cUSD**`;

      suggestedAction = "submitIntent";
      break;
    }

    case "CONTRIBUTE": {
      const amountCUSD = parsed.amount ? (Number(parsed.amount) / 1e18).toFixed(2) : "?";

      reasoning.push(`Parsed contribution: ${amountCUSD} cUSD`);
      reasoning.push(`Looking for active circles to contribute to...`);

      reply = `Got it! You want to contribute **${amountCUSD} cUSD** to a circle.\n\nWhich circle would you like to contribute to? Check your circles first.`;

      suggestedAction = "viewCircles";
      break;
    }

    case "EXIT_CIRCLE": {
      reasoning.push(`Parsed exit request`);
      reasoning.push(`User wants to leave their current circle`);

      reply = `I understand you want to exit your circle. Let me check your circle status first.`;

      suggestedAction = "viewStatus";
      break;
    }

    case "STATUS": {
      reasoning.push(`Parsed status check request`);
      reasoning.push(`User wants to see their circle information`);

      reply = `Let me pull up your circle status for you.`;

      suggestedAction = "viewStatus";
      break;
    }

    case "UNKNOWN":
    default: {
      reasoning.push(`Message did not match known patterns`);
      reasoning.push(`Falling back to helpful guidance`);

      reply = `I'm here to help with your savings circle! You can:\n\n💰 **Save:** "I want to save 50 cUSD/month for 6 months"\n📤 **Contribute:** "Contribute 50 cUSD"\n👁️ **Check status:** "Check my circle"\n👋 **Leave:** "Exit my circle"`;

      break;
    }
  }

  return {
    reply,
    parsed,
    reasoning,
    confidence: parsed.confidence,
    suggestedAction,
  };
}

/**
 * Main chat handler — parses message and returns structured response
 * @param message User's natural language message
 * @returns Full chat response
 */
export function handleChat(message: string): ChatResponse {
  const parsed = parseMessage(message);
  return generateResponse(parsed, message);
}
