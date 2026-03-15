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
export interface ParsedIntent {
    type: "JOIN_CIRCLE" | "CONTRIBUTE" | "EXIT_CIRCLE" | "STATUS" | "TRUST_SCORE" | "ISSUE_CREDIT" | "SHOW_CREDITS" | "BARTER_OFFER" | "UNKNOWN";
    amount?: string;
    duration?: number;
    currency?: string;
    recipientAddress?: string;
    offering?: string;
    seeking?: string;
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
export declare function parseMessage(message: string): ParsedIntent;
/**
 * Generate human-friendly reply and reasoning for parsed intent
 * @param parsed The parsed intent
 * @param originalMessage The original user message
 * @returns Chat response with reply, reasoning, and suggested action
 */
export declare function generateResponse(parsed: ParsedIntent, originalMessage: string): ChatResponse;
/**
 * Main chat handler — parses message and returns structured response
 * @param message User's natural language message
 * @returns Full chat response
 */
export declare function handleChat(message: string): ChatResponse;
