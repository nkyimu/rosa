import { useState, useEffect, useRef, CSSProperties } from "react";

interface Activity {
  id: string;
  timestamp: string;
  action: string;
  detail: string;
  reasoning: string;
  confidence?: number;
}

const ACTION_ICONS: Record<string, string> = {
  AGENT_STARTED: "🚀",
  CIRCLE_SCAN: "🔍",
  CIRCLE_MATCH: "🎯",
  CIRCLE_HEALTH: "💚",
  INTENT_PARSED: "📝",
  CONTRIBUTION: "💰",
  PRIVACY_CHECK: "🔒",
  EXECUTE: "⚡",
  ERROR: "❌",
};

function formatTimeAgo(isoString: string): string {
  const now = new Date();
  const then = new Date(isoString);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (seconds < 60) return "now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function ActivityFeed() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isOpen, setIsOpen] = useState(true);
  const [isConnected, setIsConnected] = useState(true);
  const feedEndRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<number | null>(null);

  // Poll for activities every 5 seconds
  useEffect(() => {
    const pollActivities = async () => {
      try {
        const response = await fetch("/api/activity");
        if (!response.ok) {
          setIsConnected(false);
          return;
        }

        setIsConnected(true);
        const data = await response.json();

        if (data.activities) {
          setActivities(data.activities);
        }
      } catch (error) {
        console.error("Activity feed error:", error);
        setIsConnected(false);
      }
    };

    // Poll immediately and then every 5 seconds
    pollActivities();
    pollIntervalRef.current = window.setInterval(pollActivities, 5000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Auto-scroll to latest
  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activities]);

  // Add global styles for fade-in animation
  const styleSheet = document.createElement("style");
  if (!document.querySelector("style[data-agent-chat]")) {
    styleSheet.setAttribute("data-agent-chat", "true");
    styleSheet.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(4px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `;
    document.head.appendChild(styleSheet);
  }

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
      {/* Header */}
      <div
        style={{
          padding: "var(--dt-space-3) var(--dt-space-4)",
          borderBottom: "1px solid var(--dt-border-default)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "var(--dt-surface-raised)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--dt-space-2)" }}>
          <span style={{ fontSize: 18 }}>⚡</span>
          <h3
            style={{
              fontSize: "var(--dt-text-sm)",
              fontWeight: 600,
              color: "var(--dt-text-primary)",
              margin: 0,
              letterSpacing: "var(--dt-tracking-wide)",
              textTransform: "uppercase",
            }}
          >
            Activity
          </h3>

          {/* Status indicator */}
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: isConnected ? "#10B981" : "#EF4444",
              marginLeft: "var(--dt-space-2)",
            }}
          />
        </div>

        {/* Toggle button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{
            background: "none",
            border: "none",
            color: "var(--dt-text-secondary)",
            cursor: "pointer",
            fontSize: 18,
            padding: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {isOpen ? "−" : "+"}
        </button>
      </div>

      {/* Feed content */}
      {isOpen && (
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "var(--dt-space-2)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--dt-space-2)",
            minWidth: 0
          }}
        >
          {activities.length === 0 ? (
            <div
              style={{
                padding: "var(--dt-space-4)",
                textAlign: "center",
                color: "var(--dt-text-muted)",
                fontSize: "var(--dt-text-xs)",
              }}
            >
              <div style={{ fontSize: 32, marginBottom: "var(--dt-space-2)" }}>⏳</div>
              Waiting for activity...
            </div>
          ) : (
            activities.map((activity, index) => (
              <div
                key={activity.id}
                style={{
                  padding: "var(--dt-space-2)",
                  background: "rgba(212, 175, 55, 0.04)",
                  border: "1px solid rgba(212, 175, 55, 0.15)",
                  borderRadius: "var(--dt-radius-md)",
                  animation: `fadeIn 0.3s ease ${index * 0.05}s both`,
                  minWidth: 0,
                  overflow: "hidden"
                } as CSSProperties}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--dt-space-2)", minWidth: 0 }}>
                  <span style={{ fontSize: 14, flexShrink: 0, marginTop: 2 }}>
                    {ACTION_ICONS[activity.action] || "🔄"}
                  </span>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Timestamp */}
                    <div
                      style={{
                        fontSize: "var(--dt-text-xs)",
                        color: "var(--dt-text-muted)",
                        marginBottom: 2,
                      }}
                    >
                      {formatTimeAgo(activity.timestamp)}
                    </div>

                    {/* Detail — truncate on mobile */}
                    <div
                      style={{
                        fontSize: "var(--dt-text-sm)",
                        color: "var(--dt-text-primary)",
                        fontWeight: 500,
                        marginBottom: 2,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                      }}
                    >
                      {activity.detail}
                    </div>

                    {/* Reasoning (collapsible) */}
                    <details
                      style={{
                        cursor: "pointer",
                        fontSize: "var(--dt-text-xs)",
                      }}
                    >
                      <summary
                        style={{
                          color: "var(--dt-accent)",
                          marginTop: 4,
                          userSelect: "none",
                          fontSize: "var(--dt-text-xs)",
                          fontWeight: 500
                        }}
                      >
                        Why?
                      </summary>
                      <div
                        style={{
                          paddingLeft: "var(--dt-space-2)",
                          paddingTop: "var(--dt-space-1)",
                          borderLeft: "2px solid var(--dt-accent)",
                          color: "var(--dt-text-secondary)",
                          fontSize: "var(--dt-text-xs)",
                          fontFamily: "var(--dt-font-mono)",
                          lineHeight: "var(--dt-leading-relaxed)",
                          wordBreak: "break-word"
                        }}
                      >
                        {activity.reasoning}
                      </div>
                    </details>

                    {/* Confidence */}
                    {activity.confidence !== undefined && (
                      <div
                        style={{
                          marginTop: 4,
                          fontSize: "var(--dt-text-xs)",
                          color: "var(--dt-text-muted)",
                        }}
                      >
                        {(activity.confidence * 100).toFixed(0)}% confidence
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}

          <div ref={feedEndRef} />
        </div>
      )}
    </div>
  );
}
