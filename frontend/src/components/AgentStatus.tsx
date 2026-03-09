import { useState } from "react";
import { useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { CONTRACT_ADDRESSES } from "../config/wagmi";
import { AgentRegistry8004ABI } from "../abis/AgentRegistry8004";

const AgentPaymentABI = [
  {
    type: "function",
    name: "serviceFee",
    inputs: [{ name: "agent", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

/**
 * Agent Status Component — displays registered agent info, reputation, and service fee
 * Placed in a collapsible section at the bottom of the Circles tab
 */
export function AgentStatus() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOnline] = useState(true); // Hardcoded for hackathon; in production, check service endpoint

  // Read agent info from AgentRegistry8004
  const { data: agentInfo, isLoading: isLoadingAgent } = useReadContract({
    address: CONTRACT_ADDRESSES.agentRegistry8004,
    abi: AgentRegistry8004ABI,
    functionName: "agentInfo",
    args: [CONTRACT_ADDRESSES.demoCircle], // Using demo circle as agent reference (adjust if needed)
  });

  // Read service fee
  const { data: serviceFee } = useReadContract({
    address: CONTRACT_ADDRESSES.agentPayment,
    abi: AgentPaymentABI,
    functionName: "serviceFee",
    args: [CONTRACT_ADDRESSES.demoCircle],
  });

  if (isLoadingAgent) {
    // Skeleton loading state
    return (
      <div style={{
        borderTop: "1px solid var(--dt-border-subtle)",
        paddingTop: "var(--dt-space-4)",
        marginTop: "var(--dt-space-6)",
      }}>
        <div style={{
          height: 32,
          background: "var(--dt-surface-overlay)",
          borderRadius: "var(--dt-radius-md)",
          opacity: 0.6,
          animation: "dt-pulse 2s ease-in-out infinite",
        }} />
      </div>
    );
  }

  if (!agentInfo || !agentInfo.isRegistered) {
    return null; // Don't show if agent not registered
  }

  const successCount = Number(agentInfo.successCount ?? 0n);
  const failureCount = Number(agentInfo.failureCount ?? 0n);
  const totalOps = successCount + failureCount || 1;
  const successRate = Math.round((successCount / totalOps) * 100);
  const feeAmount = serviceFee ? Number(formatUnits(serviceFee, 18)) : 0;

  return (
    <div
      style={{
        borderTop: "1px solid var(--dt-border-subtle)",
        paddingTop: "var(--dt-space-4)",
        marginTop: "var(--dt-space-6)",
      }}
    >
      {/* Header — collapsible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "var(--dt-space-3) 0",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--dt-text-secondary)",
          fontSize: "var(--dt-text-sm)",
          fontWeight: 500,
          transition: "color 0.2s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "var(--dt-text-primary)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "var(--dt-text-secondary)";
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "var(--dt-space-2)" }}>
          <span>🤖</span>
          <span>Agent Status</span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "var(--dt-space-1)",
              fontSize: "var(--dt-text-xs)",
              color: isOnline ? "var(--dt-trust-community)" : "var(--dt-state-error)",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: isOnline ? "var(--dt-trust-community)" : "var(--dt-state-error)",
              }}
            />
            {isOnline ? "Online" : "Offline"}
          </span>
        </span>
        <span
          style={{
            fontSize: "var(--dt-text-lg)",
            transition: "transform 0.2s ease",
            transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          ▼
        </span>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div style={{
          marginTop: "var(--dt-space-4)",
          paddingTop: "var(--dt-space-4)",
          borderTop: "1px solid var(--dt-border-subtle)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--dt-space-3)",
          animation: "dt-fade-in 0.2s ease-out",
        }}>
          {/* Agent Name */}
          <div>
            <p
              style={{
                fontSize: "var(--dt-text-xs)",
                fontWeight: 600,
                color: "var(--dt-text-muted)",
                letterSpacing: "var(--dt-tracking-wide)",
                textTransform: "uppercase",
                marginBottom: "var(--dt-space-1)",
                margin: 0,
              }}
            >
              Agent
            </p>
            <p
              style={{
                fontSize: "var(--dt-text-sm)",
                color: "var(--dt-text-primary)",
                margin: 0,
                fontFamily: "var(--dt-font-display)",
              }}
            >
              {agentInfo.name || "IntentCircles Agent"}
            </p>
          </div>

          {/* Reputation Score */}
          <div>
            <p
              style={{
                fontSize: "var(--dt-text-xs)",
                fontWeight: 600,
                color: "var(--dt-text-muted)",
                letterSpacing: "var(--dt-tracking-wide)",
                textTransform: "uppercase",
                marginBottom: "var(--dt-space-1)",
                margin: 0,
              }}
            >
              Reputation
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--dt-space-2)" }}>
              <span
                style={{
                  fontSize: "var(--dt-text-lg)",
                  fontFamily: "var(--dt-font-display)",
                  color: successRate >= 90 ? "var(--dt-trust-community)" : "var(--dt-accent)",
                  fontWeight: 600,
                }}
              >
                {successRate}%
              </span>
              <span
                style={{
                  fontSize: "var(--dt-text-xs)",
                  color: "var(--dt-text-muted)",
                  fontFamily: "var(--dt-font-mono)",
                }}
              >
                {successCount}✓ {failureCount}✗
              </span>
            </div>
            <div
              style={{
                width: "100%",
                height: 4,
                borderRadius: "var(--dt-radius-full)",
                background: "var(--dt-surface-overlay)",
                marginTop: "var(--dt-space-2)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${successRate}%`,
                  height: "100%",
                  borderRadius: "inherit",
                  background: successRate >= 90 ? "var(--dt-trust-community)" : "var(--dt-accent)",
                  transition: "width 0.6s ease-out",
                }}
              />
            </div>
          </div>

          {/* Service Fee */}
          <div>
            <p
              style={{
                fontSize: "var(--dt-text-xs)",
                fontWeight: 600,
                color: "var(--dt-text-muted)",
                letterSpacing: "var(--dt-tracking-wide)",
                textTransform: "uppercase",
                marginBottom: "var(--dt-space-1)",
                margin: 0,
              }}
            >
              Service Fee
            </p>
            <p
              style={{
                fontSize: "var(--dt-text-sm)",
                color: "var(--dt-text-primary)",
                margin: 0,
                fontFamily: "var(--dt-font-mono)",
              }}
            >
              {feeAmount.toFixed(4)} cUSD
            </p>
          </div>

          {/* Nightfall Status */}
          <div>
            <p
              style={{
                fontSize: "var(--dt-text-xs)",
                fontWeight: 600,
                color: "var(--dt-text-muted)",
                letterSpacing: "var(--dt-tracking-wide)",
                textTransform: "uppercase",
                marginBottom: "var(--dt-space-1)",
                margin: 0,
              }}
            >
              Privacy Layer
            </p>
            <p
              style={{
                fontSize: "var(--dt-text-sm)",
                color: isOnline ? "var(--dt-trust-community)" : "var(--dt-state-error)",
                margin: 0,
              }}
            >
              {isOnline ? "✓ Nightfall Connected" : "✗ Disconnected"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Pulse animation (add to CSS if needed)
const pulseStyle = `
  @keyframes dt-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`;

// Inject keyframes if not already present
if (typeof document !== "undefined" && !document.getElementById("pulse-animation")) {
  const style = document.createElement("style");
  style.id = "pulse-animation";
  style.textContent = pulseStyle;
  document.head.appendChild(style);
}
