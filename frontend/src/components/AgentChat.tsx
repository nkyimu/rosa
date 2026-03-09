import { useState, useRef, useEffect } from "react";
import { useAccount } from "wagmi";

interface ParsedIntent {
  type: string;
  amount?: string;
  duration?: number;
  currency?: string;
  confidence: number;
}

interface ChatMessage {
  id: string;
  role: "user" | "agent";
  content: string;
  parsed?: ParsedIntent;
  reasoning?: string[];
  confidence?: number;
  suggestedAction?: "submitIntent" | "viewCircles" | "viewStatus";
}

const AGENT_API_URL = "http://localhost:3002";

export function AgentChat() {
  const { address, isConnected } = useAccount();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "0",
      role: "agent",
      content:
        "👋 Hi! I'm your IntentCircles agent. I can help you set up savings circles, track contributions, and check your status.\n\nTry saying: \"I want to save 50 cUSD per month for 6 months\"",
      reasoning: [],
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [expandedReasoningId, setExpandedReasoningId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: String(Date.now()),
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch(`${AGENT_API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      const agentMessage: ChatMessage = {
        id: String(Date.now() + 1),
        role: "agent",
        content: data.reply,
        parsed: data.parsed,
        reasoning: data.reasoning,
        confidence: data.confidence,
        suggestedAction: data.suggestedAction,
      };

      setMessages((prev) => [...prev, agentMessage]);
    } catch (error) {
      console.error("Chat error:", error);

      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          role: "agent",
          content: "Sorry, I couldn't process that. Make sure the agent is running on port 3002.",
          reasoning: [],
        },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmitIntent = async (message: ChatMessage) => {
    if (!isConnected || !address || !message.parsed) return;

    try {
      // This would integrate with IntentRegistry contract
      // For now, just show a success message
      const intentType = message.parsed.type || "UNKNOWN";
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          role: "agent",
          content: `✅ Intent submitted!\n\nYour ${intentType} intent has been recorded. The keeper will work on matching you with compatible circles.`,
          reasoning: [],
        },
      ]);
    } catch (error) {
      console.error("Submit intent error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          role: "agent",
          content: "Failed to submit intent. Please try again.",
          reasoning: [],
        },
      ]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--dt-surface-base)",
        borderRadius: "var(--dt-radius-lg)",
        overflow: "hidden",
        border: "1px solid var(--dt-border-default)",
      }}
    >
      {/* Messages Container */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "var(--dt-space-4)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--dt-space-3)",
        }}
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: "flex",
              justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
              gap: "var(--dt-space-2)",
            }}
          >
            {msg.role === "agent" && (
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "rgba(212, 175, 55, 0.1)",
                  border: "1px solid rgba(212, 175, 55, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  fontSize: 16,
                }}
              >
                🤖
              </div>
            )}

            <div
              style={{
                maxWidth: msg.role === "user" ? "80%" : "85%",
                display: "flex",
                flexDirection: "column",
                gap: "var(--dt-space-2)",
              }}
            >
              {/* Message bubble */}
              <div
                style={{
                  padding: "var(--dt-space-3)",
                  borderRadius: "var(--dt-radius-lg)",
                  background: msg.role === "user" ? "#FFFFFF" : "#F5F2ED",
                  border: `1px solid ${msg.role === "user" ? "rgba(0,0,0,0.08)" : "rgba(212,175,55,0.2)"}`,
                  color: "var(--dt-text-primary)",
                  fontSize: "var(--dt-text-sm)",
                  lineHeight: "var(--dt-leading-relaxed)",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {msg.content}
              </div>

              {/* Agent message extras */}
              {msg.role === "agent" && (
                <>
                  {/* Confidence badge */}
                  {msg.confidence !== undefined && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "var(--dt-space-1)",
                        fontSize: "var(--dt-text-xs)",
                        color: "var(--dt-text-muted)",
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background:
                            msg.confidence > 0.8
                              ? "#10B981"
                              : msg.confidence > 0.5
                                ? "#F59E0B"
                                : "#EF4444",
                        }}
                      />
                      {(msg.confidence * 100).toFixed(0)}% confidence
                    </div>
                  )}

                  {/* Reasoning accordion */}
                  {msg.reasoning && msg.reasoning.length > 0 && (
                    <div
                      style={{
                        marginTop: "var(--dt-space-1)",
                      }}
                    >
                      <button
                        onClick={() =>
                          setExpandedReasoningId(
                            expandedReasoningId === msg.id ? null : msg.id
                          )
                        }
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--dt-accent)",
                          cursor: "pointer",
                          fontSize: "var(--dt-text-xs)",
                          padding: 0,
                          fontWeight: 500,
                          textDecoration: "underline",
                        }}
                      >
                        {expandedReasoningId === msg.id ? "Hide" : "Show"} reasoning (
                        {msg.reasoning.length})
                      </button>

                      {expandedReasoningId === msg.id && (
                        <div
                          style={{
                            marginTop: "var(--dt-space-2)",
                            padding: "var(--dt-space-2)",
                            background: "rgba(0,0,0,0.02)",
                            borderRadius: "var(--dt-radius-md)",
                            borderLeft: "2px solid var(--dt-accent)",
                            fontFamily: "var(--dt-font-mono)",
                            fontSize: "var(--dt-text-xs)",
                            color: "var(--dt-text-secondary)",
                            lineHeight: "var(--dt-leading-relaxed)",
                          }}
                        >
                          {msg.reasoning.map((r, i) => (
                            <div key={i} style={{ marginBottom: "var(--dt-space-1)" }}>
                              <span style={{ color: "var(--dt-accent)" }}>→</span> {r}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Submit Intent Button */}
                  {msg.suggestedAction === "submitIntent" && (
                    <button
                      onClick={() => handleSubmitIntent(msg)}
                      disabled={!isConnected}
                      style={{
                        padding: "var(--dt-space-2) var(--dt-space-3)",
                        background: isConnected ? "var(--dt-accent)" : "var(--dt-border-default)",
                        color: isConnected ? "#0A0A0A" : "var(--dt-text-muted)",
                        border: "none",
                        borderRadius: "var(--dt-radius-md)",
                        cursor: isConnected ? "pointer" : "not-allowed",
                        fontSize: "var(--dt-text-sm)",
                        fontWeight: 600,
                        minHeight: 44,
                        transition: "all 0.2s ease",
                        opacity: isConnected ? 1 : 0.6,
                      }}
                      onMouseEnter={(e) => {
                        if (isConnected) {
                          (e.target as HTMLButtonElement).style.background =
                            "var(--dt-accent-hover)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (isConnected) {
                          (e.target as HTMLButtonElement).style.background =
                            "var(--dt-accent)";
                        }
                      }}
                    >
                      ✓ Submit Intent
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-start",
              gap: "var(--dt-space-2)",
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "rgba(212, 175, 55, 0.1)",
                border: "1px solid rgba(212, 175, 55, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                fontSize: 16,
              }}
            >
              🤖
            </div>
            <div
              style={{
                padding: "var(--dt-space-3)",
                borderRadius: "var(--dt-radius-lg)",
                background: "#F5F2ED",
                border: "1px solid rgba(212,175,55,0.2)",
                display: "flex",
                alignItems: "center",
                gap: "var(--dt-space-2)",
              }}
            >
              <span style={{ animation: "pulse 1.5s infinite" }}>●</span>
              <style>{`@keyframes pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }`}</style>
              Thinking...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div
        style={{
          borderTop: "1px solid var(--dt-border-default)",
          padding: "var(--dt-space-4)",
          background: "var(--dt-surface-base)",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "var(--dt-space-2)",
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Say anything... e.g., 'Save 50 cUSD/month for 6 months'"
            style={{
              flex: 1,
              padding: "var(--dt-space-2) var(--dt-space-3)",
              border: "1px solid var(--dt-border-default)",
              borderRadius: "var(--dt-radius-md)",
              fontSize: "var(--dt-text-sm)",
              fontFamily: "var(--dt-font-body)",
              color: "var(--dt-text-primary)",
              background: "var(--dt-surface-overlay)",
              minHeight: 44,
            }}
          />
          <button
            onClick={handleSendMessage}
            disabled={!input.trim() || isLoading}
            style={{
              padding: "var(--dt-space-2) var(--dt-space-3)",
              background:
                input.trim() ? "var(--dt-accent)" : "var(--dt-border-default)",
              color: input.trim() ? "#0A0A0A" : "var(--dt-text-muted)",
              border: "none",
              borderRadius: "var(--dt-radius-md)",
              cursor: input.trim() && !isLoading ? "pointer" : "not-allowed",
              fontSize: "var(--dt-text-sm)",
              fontWeight: 600,
              minHeight: 44,
              minWidth: 44,
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              if (input.trim()) {
                (e.target as HTMLButtonElement).style.background =
                  "var(--dt-accent-hover)";
              }
            }}
            onMouseLeave={(e) => {
              if (input.trim()) {
                (e.target as HTMLButtonElement).style.background =
                  "var(--dt-accent)";
              }
            }}
          >
            →
          </button>
        </div>

        {!isConnected && (
          <div
            style={{
              marginTop: "var(--dt-space-2)",
              fontSize: "var(--dt-text-xs)",
              color: "var(--dt-text-muted)",
            }}
          >
            Connect wallet to submit intents on-chain
          </div>
        )}
      </div>
    </div>
  );
}
