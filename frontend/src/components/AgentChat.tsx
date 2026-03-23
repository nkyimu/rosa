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
  timestamp?: number;
}

const AGENT_API_URL = "";
const WARM_CREAM = "#f5f4ef";
const WARM_BORDER = "#e4e2db";
const RUST = "#c85a3f";
const MUTED_TEXT = "#8c8981";
const USER_BG = "#ffffff";

export function AgentChat() {
  const { address, isConnected } = useAccount();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  // Reasoning UI removed — debug info shouldn't show to users
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

  const handleSendMessage = async (directText?: string) => {
    const text = directText || input;
    if (!text.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: String(Date.now()),
      role: "user",
      content: text,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch(`${AGENT_API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
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
        timestamp: Date.now(),
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
          timestamp: Date.now(),
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

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: WARM_CREAM,
        overflow: "hidden",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital@0;1&family=Inter:wght@400;500;600&display=swap');
      `}</style>

      {/* Messages Container */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "calc(env(safe-area-inset-top, 0px) + 16px) 24px 24px",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
        }}
      >
        {/* Empty state — onboarding */}
        {messages.length === 0 && (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '24px',
            padding: '0 8px',
          }}>
            {/* Title */}
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: '36px',
                fontWeight: 400,
                color: '#22211f',
                marginBottom: '8px',
              }}>
                ROSA
              </div>
              <div style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '13px',
                color: MUTED_TEXT,
                lineHeight: '1.5',
                whiteSpace: 'nowrap',
              }}>
                Private savings circles, managed by AI
              </div>
            </div>

            {/* Suggestion pills */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              width: '100%',
              maxWidth: '320px',
            }}>
              {[
                { text: "Save $50 weekly with 5 friends", icon: "💰" },
                { text: "How do savings circles work?", icon: "✦" },
                { text: "Start a circle for my team", icon: "👥" },
                { text: "Show me an example", icon: "→" },
              ].map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(suggestion.text)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    background: '#ffffff',
                    border: `1px solid ${WARM_BORDER}`,
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '14px',
                    color: '#22211f',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                    lineHeight: '1.4',
                  }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLButtonElement).style.borderColor = RUST;
                    (e.target as HTMLButtonElement).style.background = '#faf8f5';
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLButtonElement).style.borderColor = WARM_BORDER;
                    (e.target as HTMLButtonElement).style.background = '#ffffff';
                  }}
                >
                  <span style={{ fontSize: '16px', flexShrink: 0, opacity: 0.7 }}>{suggestion.icon}</span>
                  <span>{suggestion.text}</span>
                </button>
              ))}
            </div>

            {!isConnected && (
              <div style={{
                fontSize: '12px',
                color: MUTED_TEXT,
                fontFamily: "'Inter', sans-serif",
                padding: '6px 14px',
                background: '#ffffff',
                borderRadius: '16px',
                border: `1px solid ${WARM_BORDER}`,
              }}>
                Sign in to start saving
              </div>
            )}
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: "flex",
              justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
              alignItems: "flex-start",
              gap: "12px",
            }}
          >
            {/* Agent indicator (small rust square) */}
            {msg.role === "agent" && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: "4px",
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    background: RUST,
                    borderRadius: "1px",
                    flexShrink: 0,
                    marginTop: "4px",
                  }}
                />
              </div>
            )}

            <div
              style={{
                maxWidth: msg.role === "user" ? "75%" : "80%",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                alignItems: msg.role === "user" ? "flex-end" : "flex-start",
              }}
            >
              {/* Agent label */}
              {msg.role === "agent" && (
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: MUTED_TEXT,
                    fontFamily: "'Inter', sans-serif",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    marginBottom: "4px",
                  }}
                >
                  ROSA
                </div>
              )}

              {/* Message content */}
              {msg.role === "agent" ? (
                <div
                  style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: "16px",
                    fontStyle: "italic",
                    color: "#2c2c2c",
                    lineHeight: "1.6",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    overflowWrap: "break-word",
                    paddingBottom: "12px",
                    borderBottom: `1px solid ${WARM_BORDER}`,
                  }}
                >
                  {msg.content}
                </div>
              ) : (
                <div
                  style={{
                    padding: "12px 16px",
                    background: USER_BG,
                    border: `1px solid ${WARM_BORDER}`,
                    borderRadius: "8px",
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "14px",
                    color: "#2c2c2c",
                    lineHeight: "1.5",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    overflowWrap: "break-word",
                  }}
                >
                  {msg.content}
                </div>
              )}

              {/* Timestamp */}
              {msg.timestamp && (
                <div
                  style={{
                    fontSize: "11px",
                    color: MUTED_TEXT,
                    fontFamily: "'Inter', sans-serif",
                    marginTop: "2px",
                  }}
                >
                  {formatTime(msg.timestamp)}
                </div>
              )}

              {/* Agent message extras */}
              {msg.role === "agent" && (
                <>
                  {/* Submit Intent Button */}
                  {msg.suggestedAction === "submitIntent" && (
                    <button
                      onClick={() => handleSubmitIntent(msg)}
                      disabled={!isConnected}
                      style={{
                        marginTop: "8px",
                        padding: "10px 16px",
                        background: isConnected ? RUST : WARM_BORDER,
                        color: isConnected ? "#ffffff" : MUTED_TEXT,
                        border: "none",
                        borderRadius: "4px",
                        cursor: isConnected ? "pointer" : "not-allowed",
                        fontSize: "13px",
                        fontWeight: 500,
                        fontFamily: "'Inter', sans-serif",
                        transition: "all 0.2s ease",
                        opacity: isConnected ? 1 : 0.6,
                      }}
                      onMouseEnter={(e) => {
                        if (isConnected) {
                          (e.target as HTMLButtonElement).style.background =
                            "#a84a32";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (isConnected) {
                          (e.target as HTMLButtonElement).style.background = RUST;
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
              alignItems: "flex-start",
              gap: "12px",
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                background: RUST,
                borderRadius: "1px",
                flexShrink: 0,
                marginTop: "4px",
              }}
            />
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: MUTED_TEXT,
                  fontFamily: "'Inter', sans-serif",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                ROSA
              </div>
              <div
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: "16px",
                  fontStyle: "italic",
                  color: "#2c2c2c",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  paddingBottom: "12px",
                  borderBottom: `1px solid ${WARM_BORDER}`,
                }}
              >
                <span style={{ animation: "pulse 1.5s infinite" }}>●</span>
                <style>{`@keyframes pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }`}</style>
                Thinking...
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div
        style={{
          borderTop: `1px solid ${WARM_BORDER}`,
          padding: "16px 24px 24px",
          background: "#ffffff",
          boxSizing: "border-box",
          position: "relative",
        }}
      >
        {/* Sign in pill removed — now in empty state */}

        <div
          style={{
            display: "flex",
            gap: "8px",
            alignItems: "center",
          }}
        >
          {/* Left icon buttons */}
          <button
            style={{
              width: 36,
              height: 36,
              borderRadius: "4px",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: MUTED_TEXT,
              fontSize: "18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background 0.2s ease",
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.background = WARM_CREAM;
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.background = "transparent";
            }}
            title="Add attachment"
          >
            +
          </button>

          <button
            style={{
              width: 36,
              height: 36,
              borderRadius: "4px",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: MUTED_TEXT,
              fontSize: "18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background 0.2s ease",
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.background = WARM_CREAM;
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.background = "transparent";
            }}
            title="Mention"
          >
            @
          </button>

          {/* Text input */}
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What would you like to save?"
            style={{
              flex: 1,
              padding: "10px 12px",
              border: "none",
              background: "transparent",
              fontSize: "15px",
              fontFamily: "'Cormorant Garamond', serif",
              fontStyle: "italic",
              color: "#2c2c2c",
              outline: "none",
              minHeight: 20,
              boxSizing: "border-box",
            }}
          />

          {/* Send button */}
          <button
            onClick={() => handleSendMessage()}
            disabled={!input.trim() || isLoading}
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              border: "none",
              background: input.trim() && !isLoading ? RUST : WARM_BORDER,
              color: input.trim() && !isLoading ? "#ffffff" : MUTED_TEXT,
              cursor: input.trim() && !isLoading ? "pointer" : "not-allowed",
              fontSize: "18px",
              fontWeight: 600,
              transition: "all 0.2s ease",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              if (input.trim() && !isLoading) {
                (e.target as HTMLButtonElement).style.background = "#a84a32";
              }
            }}
            onMouseLeave={(e) => {
              if (input.trim() && !isLoading) {
                (e.target as HTMLButtonElement).style.background = RUST;
              }
            }}
            title="Send message"
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}
