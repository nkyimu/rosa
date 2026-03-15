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
/**
 * Parse natural language message into structured intent
 * @param message User's natural language message
 * @returns Parsed intent with reasoning
 */
export function parseMessage(message) {
    const lower = message.toLowerCase().trim();
    const reasoning = [];
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
    // Pattern 5: "What's my trust score" / "Check my reputation"
    if (/(?:what'?s|check|show|view)\s+(?:my\s+)?trust|reputation|tier|score/i.test(lower)) {
        return {
            type: "TRUST_SCORE",
            confidence: 0.9,
        };
    }
    // Pattern 6: "Issue X cUSD credit to 0x..." or "Issue credit"
    const creditPattern = /issue\s+(\d+(?:\.\d+)?)\s*cUSD\s+credit\s+to\s+(0x[a-fA-F0-9]{40})/i;
    const creditMatch = lower.match(creditPattern);
    if (creditMatch && creditMatch[1] && creditMatch[2]) {
        return {
            type: "ISSUE_CREDIT",
            amount: parseUnits(creditMatch[1], 18).toString(),
            recipientAddress: creditMatch[2],
            duration: 8, // default 8 weeks
            confidence: 0.9,
        };
    }
    // Pattern 7: "Can I issue credit?" / "Show my credits"
    if (/(?:can i|can i|show|list)\s+(?:issue\s+)?credit|my\s+credit/i.test(lower)) {
        return {
            type: lower.includes("show") || lower.includes("list") ? "SHOW_CREDITS" : "ISSUE_CREDIT",
            confidence: 0.85,
        };
    }
    // Pattern 8: "I want to offer X for Y" / "I can provide X, seeking Y"
    const barterPattern = /(?:offer|provide|can)\s+(.+?)\s+(?:for|seeking|need)\s+(.+?)(?:\.|$)/i;
    const barterMatch = lower.match(barterPattern);
    if (barterMatch && (lower.includes("offer") || lower.includes("provide") || lower.includes("seeking"))) {
        return {
            type: "BARTER_OFFER",
            offering: barterMatch[1].trim(),
            seeking: barterMatch[2].trim(),
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
export function generateResponse(parsed, originalMessage) {
    const reasoning = [];
    let reply = "";
    let suggestedAction;
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
        case "TRUST_SCORE": {
            reasoning.push(`Parsed trust score request`);
            reasoning.push(`User wants to see their reputation tier and score`);
            reply = `I'll fetch your trust score and tier. This shows your reputation from completed circles and peer ratings.`;
            suggestedAction = "viewStatus";
            break;
        }
        case "ISSUE_CREDIT": {
            if (parsed.recipientAddress) {
                const amountCUSD = parsed.amount ? (Number(parsed.amount) / 1e18).toFixed(2) : "?";
                reasoning.push(`Parsed credit issuance: ${amountCUSD} cUSD to ${parsed.recipientAddress}`);
                reasoning.push(`Must verify issuer is CREDITOR tier (80+ reputation)`);
                reasoning.push(`Must verify recipient is MEMBER tier (50+ reputation)`);
                reply = `I'll issue **${amountCUSD} cUSD** credit to ${parsed.recipientAddress}.\n\nPlease note: You must be CREDITOR tier (80+ reputation) to issue credit.`;
            }
            else {
                reasoning.push(`Parsed credit inquiry`);
                reasoning.push(`User asking if they can issue credit`);
                reply = `To issue micro-credit, you need to be at **CREDITOR tier** (80+ reputation).\n\nHave you completed 6+ circles? Check your trust score to see if you qualify!`;
            }
            suggestedAction = "viewStatus";
            break;
        }
        case "SHOW_CREDITS": {
            reasoning.push(`Parsed credit list request`);
            reasoning.push(`User wants to see their issued and received credits`);
            reply = `Let me show you all your active credit lines — both credits you've issued and credits you've received.`;
            suggestedAction = "viewStatus";
            break;
        }
        case "BARTER_OFFER": {
            if (parsed.offering && parsed.seeking) {
                reasoning.push(`Parsed barter intent: offering "${parsed.offering}", seeking "${parsed.seeking}"`);
                reasoning.push(`Must verify agent is ELDER tier (95+ reputation) for barter matching`);
                reasoning.push(`Will submit intent for automated matching with compatible agents`);
                reply = `Great! I'll submit your barter intent:\n\n**Offering:** ${parsed.offering}\n**Seeking:** ${parsed.seeking}\n\nNote: You need ELDER tier (95+ reputation) to settle barter intents. Your reputation score will help find compatible matches!`;
            }
            else {
                reasoning.push(`Parsed barter inquiry`);
                reply = `To participate in barter exchanges (no currency needed!), you need to reach **ELDER tier** (95+ reputation).\n\nOnce you're there, you can offer services and seek services from other high-trust agents!`;
            }
            break;
        }
        case "UNKNOWN":
        default: {
            reasoning.push(`Message did not match known patterns`);
            reasoning.push(`Falling back to helpful guidance`);
            reply = `I'm here to help with your savings circle and trust network! You can:\n\n💰 **Save:** "I want to save 50 cUSD/month for 6 months"\n📤 **Contribute:** "Contribute 50 cUSD"\n✅ **Trust:** "What's my trust score?"\n💳 **Credit:** "Can I issue credit?" or "Show my credits"\n🔄 **Barter:** "I can offer [service] for [service]"\n👁️ **Status:** "Check my circle"`;
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
export function handleChat(message) {
    const parsed = parseMessage(message);
    return generateResponse(parsed, message);
}
