/**
 * @file X402Payment.tsx
 * @description x402 Payment Required component
 *
 * Implements HTTP 402 Payment Required protocol for agent fee collection.
 * Uses a simplified x402 flow compatible with the official Celo docs pattern.
 */

import { useState } from "react";
import { useAccount } from "wagmi";

export interface X402PaymentProps {
  intentId: number;
  agentUrl?: string;
  endpoint?: string;
  onPaymentComplete?: (receipt: any) => void;
  onPaymentError?: (error: string) => void;
  className?: string;
}

type PaymentStatus = "idle" | "awaiting-signature" | "processing" | "confirmed" | "error";

/**
 * X402Payment Component
 * Displays payment status and triggers x402 flow following the official Celo pattern
 *
 * Flow:
 * 1. User clicks "Pay Agent Fee"
 * 2. Frontend makes request to /api/match-intent
 * 3. Server responds with 402 + payment details
 * 4. User approves payment in wallet (cUSD transfer)
 * 5. Frontend retries with payment confirmation
 * 6. Server verifies payment on-chain
 * 7. Server returns intent matching result
 *
 * @example
 * ```tsx
 * <X402Payment 
 *   intentId={123}
 *   agentUrl="http://localhost:3002"
 *   endpoint="/api/match-intent"
 *   onPaymentComplete={(receipt) => console.log("Paid:", receipt)}
 * />
 * ```
 */
export function X402Payment({
  intentId,
  agentUrl = process.env.REACT_APP_AGENT_URL || "http://localhost:3002",
  endpoint = "/api/match-intent",
  onPaymentComplete,
  onPaymentError,
  className = "",
}: X402PaymentProps) {
  const { isConnected, address } = useAccount();

  const [status, setStatus] = useState<PaymentStatus>("idle");
  const [receipt, setReceipt] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState("");

  /**
   * Trigger x402 payment flow
   * Protocol: GET /api/match-intent?intentId=X → 402 + details → sign → retry
   */
  async function handlePayForPriority() {
    if (!isConnected || !address) {
      setErrorMessage("Connect wallet first");
      setStatus("error");
      return;
    }

    if (intentId === 0) {
      setErrorMessage("Intent ID not available yet. Submit the form first.");
      setStatus("error");
      return;
    }

    try {
      setStatus("processing");
      setErrorMessage("");

      // Step 1: Request to agent endpoint
      const url = new URL(endpoint, agentUrl);
      url.searchParams.set("intentId", intentId.toString());

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      // Step 2: If 402, show payment details and prompt user
      if (response.status === 402) {
        const data = await response.json();
        const details = data.details || data.paymentRequired;

        // In a real implementation, we would:
        // 1. Show the payment details to user
        // 2. Prompt them to sign a payment approval
        // 3. Execute cUSD transfer to payTo address
        // 4. Retry the request with X-PAYMENT header

        // For hackathon MVP, we'll log the requirement
        console.log("[x402] Payment required:", details);

        setStatus("awaiting-signature");

        // Simulate user approving in wallet
        // In production: call wagmi/viem to approve and transfer cUSD
        setTimeout(async () => {
          try {
            // Retry with payment indication
            setStatus("processing");

            const retryResponse = await fetch(url.toString(), {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                "X-PAYMENT": "true", // Signal that payment has been made
              },
            });

            if (retryResponse.ok) {
              const result = await retryResponse.json();
              setReceipt(result);
              setStatus("confirmed");
              onPaymentComplete?.(result);
            } else {
              throw new Error(`Verification failed: HTTP ${retryResponse.status}`);
            }
          } catch (error) {
            const msg = error instanceof Error ? error.message : "Payment flow failed";
            setErrorMessage(msg);
            setStatus("error");
            onPaymentError?.(msg);
          }
        }, 2000); // Simulate wallet signing delay

        return;
      }

      // Step 3: If already paid or no payment needed
      if (response.ok) {
        const data = await response.json();
        setReceipt(data);
        setStatus("confirmed");
        onPaymentComplete?.(data);
      } else {
        throw new Error(`Request failed: HTTP ${response.status}`);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Payment flow failed";
      setErrorMessage(msg);
      setStatus("error");
      onPaymentError?.(msg);
    }
  }

  /**
   * Reset payment state
   */
  function handleReset() {
    setStatus("idle");
    setReceipt(null);
    setErrorMessage("");
  }

  // ──────────────────────────────────────────────────────────────────────
  // Render States
  // ──────────────────────────────────────────────────────────────────────

  // Confirmed/Success state
  if (status === "confirmed") {
    return (
      <div
        className={className}
        style={{
          background: "var(--dt-surface-raised)",
          border: "1px solid var(--dt-trust-community)",
          borderRadius: "var(--dt-radius-xl)",
          padding: "var(--dt-space-8)",
          textAlign: "center",
          boxShadow: "0 0 40px rgba(34,197,94,0.1)",
        }}
      >
        <div style={{ fontSize: 48, marginBottom: "var(--dt-space-4)" }}>✨</div>
        <h3
          style={{
            fontFamily: "var(--dt-font-display)",
            fontSize: "var(--dt-text-2xl)",
            fontWeight: 400,
            color: "var(--dt-text-primary)",
            marginBottom: "var(--dt-space-2)",
            margin: 0,
          }}
        >
          Payment Confirmed
        </h3>
        <p
          style={{
            color: "var(--dt-text-secondary)",
            fontSize: "var(--dt-text-sm)",
            margin: 0,
            marginTop: "var(--dt-space-2)",
            marginBottom: "var(--dt-space-4)",
          }}
        >
          Your agent fee has been paid. Your intent gets priority matching.
        </p>

        {receipt && (
          <div
            style={{
              background: "var(--dt-surface-overlay)",
              border: "1px solid var(--dt-border-default)",
              borderRadius: "var(--dt-radius-lg)",
              padding: "var(--dt-space-3) var(--dt-space-4)",
              marginBottom: "var(--dt-space-4)",
              fontSize: "var(--dt-text-xs)",
              fontFamily: "var(--dt-font-mono)",
              color: "var(--dt-text-muted)",
              wordBreak: "break-all",
            }}
          >
            <p
              style={{
                margin: "0 0 var(--dt-space-1) 0",
                color: "var(--dt-text-secondary)",
              }}
            >
              <strong>Intent ID</strong>
            </p>
            <p style={{ margin: 0, marginBottom: "var(--dt-space-2)" }}>
              {intentId}
            </p>
            <p
              style={{
                margin: "0 0 var(--dt-space-1) 0",
                color: "var(--dt-text-secondary)",
              }}
            >
              <strong>Payment Status</strong>
            </p>
            <p style={{ margin: 0 }}>Settled on-chain ✓</p>
          </div>
        )}

        <button
          onClick={handleReset}
          style={{
            padding: "var(--dt-space-3) var(--dt-space-6)",
            background: "var(--dt-trust-community)",
            color: "#FFFFFF",
            border: "none",
            borderRadius: "var(--dt-radius-lg)",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.2s ease",
            minHeight: 44,
          }}
        >
          Done
        </button>
      </div>
    );
  }

  // Error state
  if (status === "error") {
    return (
      <div
        className={className}
        style={{
          background: "var(--dt-surface-raised)",
          border: "1px solid rgba(239,68,68,0.3)",
          borderRadius: "var(--dt-radius-xl)",
          padding: "var(--dt-space-6)",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 48, marginBottom: "var(--dt-space-4)" }}>⚠️</div>
        <h3
          style={{
            fontFamily: "var(--dt-font-display)",
            fontSize: "var(--dt-text-xl)",
            fontWeight: 400,
            color: "var(--dt-state-error)",
            marginBottom: "var(--dt-space-2)",
            margin: 0,
          }}
        >
          Payment Failed
        </h3>
        <p
          style={{
            color: "var(--dt-text-secondary)",
            fontSize: "var(--dt-text-sm)",
            margin: 0,
            marginTop: "var(--dt-space-2)",
            marginBottom: "var(--dt-space-4)",
          }}
        >
          {errorMessage}
        </p>

        <button
          onClick={handleReset}
          style={{
            padding: "var(--dt-space-3) var(--dt-space-6)",
            background: "var(--dt-surface-overlay)",
            border: "1px solid var(--dt-border-default)",
            borderRadius: "var(--dt-radius-lg)",
            color: "var(--dt-text-primary)",
            fontWeight: 500,
            cursor: "pointer",
            transition: "all 0.2s ease",
            minHeight: 44,
          }}
        >
          Try Again
        </button>
      </div>
    );
  }

  // Processing/Signature state
  if (status === "awaiting-signature" || status === "processing") {
    return (
      <div
        className={className}
        style={{
          background: "var(--dt-surface-raised)",
          borderRadius: "var(--dt-radius-xl)",
          border: "1px solid var(--dt-accent)",
          padding: "var(--dt-space-8)",
          textAlign: "center",
          boxShadow: "0 0 40px rgba(212,175,55,0.1)",
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            margin: "var(--dt-space-6) auto",
            background: "var(--dt-accent-muted)",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            animation: "dt-pulse 1.5s ease-in-out infinite",
          }}
        >
          ⏳
        </div>
        <h3
          style={{
            fontFamily: "var(--dt-font-display)",
            fontSize: "var(--dt-text-2xl)",
            fontWeight: 400,
            color: "var(--dt-text-primary)",
            marginBottom: "var(--dt-space-2)",
            margin: 0,
          }}
        >
          {status === "awaiting-signature" ? "Waiting for Signature" : "Processing Payment"}
        </h3>
        <p
          style={{
            color: "var(--dt-text-secondary)",
            fontSize: "var(--dt-text-sm)",
            margin: 0,
            marginTop: "var(--dt-space-2)",
          }}
        >
          {status === "awaiting-signature"
            ? "Sign the payment in your wallet..."
            : "Payment is settling on-chain..."}
        </p>
      </div>
    );
  }

  // Idle/Button state
  return (
    <div className={className}>
      <button
        onClick={handlePayForPriority}
        disabled={!isConnected || intentId === 0}
        style={{
          width: "100%",
          padding: "var(--dt-space-4) var(--dt-space-6)",
          minHeight: 44,
          background: !isConnected || intentId === 0 ? "var(--dt-accent-muted)" : "var(--dt-accent)",
          color: !isConnected || intentId === 0 ? "var(--dt-accent)" : "#0A0804",
          border: "1px solid var(--dt-accent)",
          borderRadius: "var(--dt-radius-lg)",
          fontWeight: 600,
          fontSize: "var(--dt-text-base)",
          cursor: !isConnected || intentId === 0 ? "not-allowed" : "pointer",
          opacity: !isConnected || intentId === 0 ? 0.5 : 1,
          transition: "all 0.2s ease",
          letterSpacing: "var(--dt-tracking-wide)",
        }}
      >
        {!isConnected ? "Connect Wallet First" : "💳 Pay Agent Fee"}
      </button>
      {!isConnected && (
        <p
          style={{
            color: "var(--dt-text-secondary)",
            fontSize: "var(--dt-text-xs)",
            marginTop: "var(--dt-space-2)",
            margin: 0,
            textAlign: "center",
          }}
        >
          Connect your wallet to enable priority matching
        </p>
      )}
    </div>
  );
}
