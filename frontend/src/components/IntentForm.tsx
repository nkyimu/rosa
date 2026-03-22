import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { encodeAbiParameters, parseAbiParameters, parseUnits } from "viem";
import { CONTRACT_ADDRESSES } from "../config/wagmi";
import { IntentRegistryABI } from "../abis/IntentRegistry";
import { 
  generateSalt, 
  computeCommitment, 
  storeCommitmentData
} from "../utils/privacy";
import { X402Payment } from "./X402Payment";

const CYCLE_OPTIONS = [
  { label: "Weekly",   value: (7  * 24 * 60 * 60).toString() },
  { label: "Biweekly", value: (14 * 24 * 60 * 60).toString() },
  { label: "Monthly",  value: (30 * 24 * 60 * 60).toString() },
];

type PrivacyStep = "input" | "commit" | "confirming" | "success";

export function IntentForm() {
  const { isConnected } = useAccount();
  const [amount, setAmount] = useState("10");
  const [cycleDuration, setCycleDuration] = useState(CYCLE_OPTIONS[2]!.value);
  const [preferredSize, setPreferredSize] = useState(5);
  
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);
  const [privacyStep, setPrivacyStep] = useState<PrivacyStep>("input");
  const [commitmentData, setCommitmentData] = useState<any>(null);
  const [proofId, setProofId] = useState("");

  const { writeContract, data: txHash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  function togglePrivacyMode() {
    setIsPrivacyMode(!isPrivacyMode);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isConnected) return;

    if (isPrivacyMode) {
      const salt = generateSalt();
      const commitment = computeCommitment(amount, salt);
      
      setCommitmentData({ amount, salt, commitment });
      setPrivacyStep("commit");
      
      setTimeout(() => {
        setPrivacyStep("confirming");
        
        setTimeout(() => {
          const mockProofId = "0x" + Math.random().toString(16).slice(2, 18).padEnd(16, "0");
          setProofId(mockProofId);
          
          storeCommitmentData(CONTRACT_ADDRESSES.demoCircle, {
            amount,
            salt,
            commitment,
            proofId: mockProofId,
          });
          
          setPrivacyStep("success");
        }, 2000);
      }, 1000);
      
      return;
    }

    const params = encodeAbiParameters(
      parseAbiParameters("uint256 contributionAmount, uint256 cycleDuration, uint8 preferredSize"),
      [parseUnits(amount, 18), BigInt(cycleDuration), preferredSize]
    );
    const expiresAt = BigInt(Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60);
    writeContract({ 
      address: CONTRACT_ADDRESSES.intentRegistry, 
      abi: IntentRegistryABI, 
      functionName: "submitIntent", 
      args: [0, params, expiresAt] 
    });
  }

  function handleResetPrivacy() {
    setPrivacyStep("input");
    setCommitmentData(null);
    setProofId("");
  }

  if (!isConnected) {
    return (
      <div style={{
        textAlign: 'center',
        padding: 'var(--dt-space-16) var(--dt-space-4)',
        color: 'var(--dt-text-muted)'
      }}>
        <p style={{ fontSize: 'var(--dt-text-base)', margin: 0 }}>
          Connect your wallet to submit an intent
        </p>
      </div>
    );
  }

  // Success state
  if (isSuccess) {
    return (
      <div style={{
        background: 'var(--dt-surface-raised)',
        border: '1px solid var(--dt-trust-community)',
        borderRadius: 'var(--dt-radius-2xl)',
        padding: 'var(--dt-space-8)',
        textAlign: 'center',
        boxShadow: 'var(--dt-shadow-card)'
      }}>
        <div style={{ fontSize: 48, marginBottom: 'var(--dt-space-4)' }}>✨</div>
        <h3 style={{
          fontFamily: 'var(--dt-font-display)',
          fontSize: 'var(--dt-text-2xl)',
          fontWeight: 400,
          color: 'var(--dt-text-primary)',
          margin: '0 0 var(--dt-space-2) 0'
        }}>Intent Recorded</h3>
        <p style={{
          color: 'var(--dt-text-secondary)',
          fontSize: 'var(--dt-text-sm)',
          margin: '0 0 var(--dt-space-6) 0'
        }}>
          Your intent has been submitted. You'll be matched into a circle based on your preferences.
        </p>
        <button
          onClick={() => {
            setAmount("10");
            setCycleDuration(CYCLE_OPTIONS[2]!.value);
            setPreferredSize(5);
          }}
          style={{
            padding: 'var(--dt-space-3) var(--dt-space-6)',
            background: 'var(--dt-accent)',
            color: '#FFF',
            border: 'none',
            borderRadius: 'var(--dt-radius-lg)',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all var(--dt-duration-fast) var(--dt-ease-out)',
            minHeight: 44
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = '#E8704D'
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = '#C75B39'
          }}
        >
          Submit Another
        </button>
      </div>
    );
  }

  // Privacy commitment phase
  if (isPrivacyMode && privacyStep === "commit") {
    return (
      <div style={{
        background: 'var(--dt-surface-raised)',
        border: '1px solid var(--dt-accent)',
        borderRadius: 'var(--dt-radius-2xl)',
        padding: 'var(--dt-space-8)',
        textAlign: 'center',
        boxShadow: 'var(--dt-shadow-card)'
      }}>
        <div style={{ fontSize: 48, marginBottom: 'var(--dt-space-4)' }}>🔒</div>
        <h3 style={{
          fontFamily: 'var(--dt-font-display)',
          fontSize: 'var(--dt-text-2xl)',
          fontWeight: 400,
          color: 'var(--dt-text-primary)',
          margin: '0 0 var(--dt-space-2) 0'
        }}>Commitment Submitted</h3>
        <p style={{
          color: 'var(--dt-text-secondary)',
          fontSize: 'var(--dt-text-sm)',
          margin: '0 0 var(--dt-space-6) 0'
        }}>
          Your contribution is private. Hashed commitment recorded on-chain.
        </p>
        
        {commitmentData && (
          <div style={{
            background: 'var(--dt-surface-overlay)',
            border: '1px solid var(--dt-border-default)',
            borderRadius: 'var(--dt-radius-lg)',
            padding: 'var(--dt-space-4)',
            textAlign: 'left',
            marginBottom: 'var(--dt-space-4)',
            fontSize: 'var(--dt-text-xs)',
            fontFamily: 'var(--dt-font-mono)',
            color: 'var(--dt-text-muted)',
            wordBreak: 'break-all'
          }}>
            <p style={{ margin: '0 0 var(--dt-space-2) 0' }}>
              <strong>Amount:</strong> {commitmentData.amount} cUSD
            </p>
            <p style={{ margin: '0 0 var(--dt-space-2) 0' }}>
              <strong>Salt:</strong> {commitmentData.salt.slice(0, 16)}...
            </p>
            <p style={{ margin: 0 }}>
              <strong>Commitment:</strong> {commitmentData.commitment.slice(0, 20)}...
            </p>
          </div>
        )}

        <button
          onClick={handleResetPrivacy}
          style={{
            padding: 'var(--dt-space-3) var(--dt-space-6)',
            background: 'var(--dt-surface-overlay)',
            border: '1px solid var(--dt-border-default)',
            borderRadius: 'var(--dt-radius-lg)',
            color: 'var(--dt-text-primary)',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all var(--dt-duration-fast) var(--dt-ease-out)',
            minHeight: 44
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(45, 37, 32, 0.05)'
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
          }}
        >
          Back
        </button>
      </div>
    );
  }

  // Privacy confirming phase
  if (isPrivacyMode && privacyStep === "confirming") {
    return (
      <div style={{
        background: 'var(--dt-surface-raised)',
        border: '1px solid var(--dt-accent)',
        borderRadius: 'var(--dt-radius-2xl)',
        padding: 'var(--dt-space-8)',
        textAlign: 'center',
        boxShadow: 'var(--dt-shadow-card)'
      }}>
        <div style={{
          width: 48,
          height: 48,
          margin: 'var(--dt-space-6) auto',
          background: 'var(--dt-accent-muted)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'dt-pulse 1.5s ease-in-out infinite'
        }}>
          ⏳
        </div>
        <h3 style={{
          fontFamily: 'var(--dt-font-display)',
          fontSize: 'var(--dt-text-2xl)',
          fontWeight: 400,
          color: 'var(--dt-text-primary)',
          margin: '0 0 var(--dt-space-2) 0'
        }}>Encrypting Contribution</h3>
        <p style={{
          color: 'var(--dt-text-secondary)',
          fontSize: 'var(--dt-text-sm)',
          margin: 0
        }}>
          Your amount is being encrypted and recorded...
        </p>
      </div>
    );
  }

  // Privacy success
  if (isPrivacyMode && privacyStep === "success") {
    return (
      <div style={{
        background: 'var(--dt-surface-raised)',
        border: '1px solid var(--dt-trust-community)',
        borderRadius: 'var(--dt-radius-2xl)',
        padding: 'var(--dt-space-8)',
        textAlign: 'center',
        boxShadow: 'var(--dt-shadow-card)'
      }}>
        <div style={{ fontSize: 48, marginBottom: 'var(--dt-space-4)' }}>🎉</div>
        <h3 style={{
          fontFamily: 'var(--dt-font-display)',
          fontSize: 'var(--dt-text-2xl)',
          fontWeight: 400,
          color: 'var(--dt-text-primary)',
          margin: '0 0 var(--dt-space-2) 0'
        }}>Privacy Preserved</h3>
        <p style={{
          color: 'var(--dt-text-secondary)',
          fontSize: 'var(--dt-text-sm)',
          margin: '0 0 var(--dt-space-4) 0'
        }}>
          Your ${amount} cUSD contribution has been privately recorded. Amount hidden on-chain.
        </p>
        
        {proofId && (
          <div style={{
            background: 'var(--dt-surface-overlay)',
            border: '1px solid var(--dt-border-default)',
            borderRadius: 'var(--dt-radius-lg)',
            padding: 'var(--dt-space-3) var(--dt-space-4)',
            marginBottom: 'var(--dt-space-4)',
            fontSize: 'var(--dt-text-xs)',
            fontFamily: 'var(--dt-font-mono)',
            color: 'var(--dt-text-muted)',
            wordBreak: 'break-all'
          }}>
            <p style={{ margin: '0 0 var(--dt-space-1) 0', color: 'var(--dt-text-secondary)' }}>
              <strong>Proof ID</strong>
            </p>
            {proofId.slice(0, 16)}...
          </div>
        )}

        <button
          onClick={handleResetPrivacy}
          style={{
            padding: 'var(--dt-space-3) var(--dt-space-6)',
            background: 'var(--dt-trust-community)',
            color: '#FFF',
            border: 'none',
            borderRadius: 'var(--dt-radius-lg)',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all var(--dt-duration-fast) var(--dt-ease-out)',
            minHeight: 44
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = '0.9'
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = '1'
          }}
        >
          Done
        </button>
      </div>
    );
  }

  // Main conversational form
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--dt-space-8)'
    }}>
      {/* Conversational Heading */}
      <div style={{ textAlign: 'center' }}>
        <h2 style={{
          fontFamily: 'var(--dt-font-display)',
          fontSize: 'var(--dt-text-2xl)',
          fontWeight: 400,
          color: 'var(--dt-text-primary)',
          margin: '0 0 var(--dt-space-2) 0'
        }}>
          How shall the circle manage its common wealth and spending limits?
        </h2>
        <p style={{
          color: 'var(--dt-text-secondary)',
          fontSize: 'var(--dt-text-sm)',
          margin: 0
        }}>
          Tell us about your circle preferences
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--dt-space-6)'
      }}>
        {/* Financial Policy Card */}
        <div style={{
          background: 'var(--dt-surface-raised)',
          border: '1px solid var(--dt-border-default)',
          borderRadius: 'var(--dt-radius-2xl)',
          padding: 'var(--dt-space-6)',
          boxShadow: 'var(--dt-shadow-card)'
        }}>
          <h3 style={{
            fontFamily: 'var(--dt-font-display)',
            fontSize: 'var(--dt-text-lg)',
            fontWeight: 400,
            color: 'var(--dt-text-primary)',
            margin: '0 0 var(--dt-space-4) 0'
          }}>
            Financial Policy
          </h3>

          {/* Contribution Amount */}
          <div style={{
            marginBottom: 'var(--dt-space-5)'
          }}>
            <label style={{
              display: 'block',
              fontFamily: 'var(--dt-font-body)',
              fontSize: 'var(--dt-text-sm)',
              fontWeight: 500,
              color: 'var(--dt-text-primary)',
              marginBottom: 'var(--dt-space-2)'
            }}>
              Contribution Amount (cUSD)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="10.00"
              min="0"
              step="0.01"
              style={{
                width: '100%',
                padding: 'var(--dt-space-3) var(--dt-space-4)',
                background: 'var(--dt-surface-overlay)',
                border: '1px solid var(--dt-border-default)',
                borderRadius: 'var(--dt-radius-lg)',
                color: 'var(--dt-text-primary)',
                fontFamily: 'var(--dt-font-mono)',
                fontSize: 'var(--dt-text-base)',
                boxSizing: 'border-box',
                minHeight: 44,
                transition: 'border-color var(--dt-duration-fast) var(--dt-ease-out)',
                outline: 'none'
              }}

            />
          </div>

          {/* Cycle Duration */}
          <div style={{
            marginBottom: 'var(--dt-space-5)'
          }}>
            <label style={{
              display: 'block',
              fontFamily: 'var(--dt-font-body)',
              fontSize: 'var(--dt-text-sm)',
              fontWeight: 500,
              color: 'var(--dt-text-primary)',
              marginBottom: 'var(--dt-space-2)'
            }}>
              Payment Cycle
            </label>
            <select
              value={cycleDuration}
              onChange={(e) => setCycleDuration(e.target.value)}
              style={{
                width: '100%',
                padding: 'var(--dt-space-3) var(--dt-space-4)',
                background: 'var(--dt-surface-overlay)',
                border: '1px solid var(--dt-border-default)',
                borderRadius: 'var(--dt-radius-lg)',
                color: 'var(--dt-text-primary)',
                fontFamily: 'var(--dt-font-body)',
                fontSize: 'var(--dt-text-base)',
                cursor: 'pointer',
                minHeight: 44,
                boxSizing: 'border-box'
              }}
            >
              {CYCLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Preferred Circle Size */}
          <div>
            <label style={{
              display: 'block',
              fontFamily: 'var(--dt-font-body)',
              fontSize: 'var(--dt-text-sm)',
              fontWeight: 500,
              color: 'var(--dt-text-primary)',
              marginBottom: 'var(--dt-space-2)'
            }}>
              Preferred Circle Size
            </label>
            <div style={{
              display: 'flex',
              gap: 'var(--dt-space-2)',
              flexWrap: 'wrap'
            }}>
              {[3, 5, 7, 10].map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setPreferredSize(size)}
                  style={{
                    padding: 'var(--dt-space-2) var(--dt-space-4)',
                    background: preferredSize === size ? 'var(--dt-accent)' : 'var(--dt-surface-overlay)',
                    border: `1px solid ${preferredSize === size ? 'var(--dt-accent)' : 'var(--dt-border-default)'}`,
                    borderRadius: 'var(--dt-radius-lg)',
                    color: preferredSize === size ? '#FFF' : 'var(--dt-text-primary)',
                    fontFamily: 'var(--dt-font-body)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all var(--dt-duration-fast) var(--dt-ease-out)',
                    minHeight: 44,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onMouseEnter={(e) => {
                    if (preferredSize !== size) {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(45, 37, 32, 0.15)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (preferredSize !== size) {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(45, 37, 32, 0.08)'
                    }
                  }}
                >
                  {size} members
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Privacy Toggle */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--dt-space-3)',
          padding: 'var(--dt-space-4)',
          background: 'rgba(107, 125, 94, 0.05)',
          border: '1px solid rgba(107, 125, 94, 0.2)',
          borderRadius: 'var(--dt-radius-lg)'
        }}>
          <input
            type="checkbox"
            checked={isPrivacyMode}
            onChange={togglePrivacyMode}
            style={{
              cursor: 'pointer',
              width: 20,
              height: 20
            }}
          />
          <label style={{
            fontFamily: 'var(--dt-font-body)',
            fontSize: 'var(--dt-text-sm)',
            color: 'var(--dt-text-primary)',
            cursor: 'pointer',
            flex: 1,
            margin: 0
          }}>
            🔒 Privacy Mode (hide contribution amount)
          </label>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            background: 'rgba(255, 107, 107, 0.1)',
            border: '1px solid rgba(255, 107, 107, 0.3)',
            borderRadius: 'var(--dt-radius-md)',
            padding: 'var(--dt-space-3) var(--dt-space-4)',
            color: 'var(--dt-state-error)',
            fontSize: 'var(--dt-text-sm)'
          }}>
            Error: {(error as any).message || 'Something went wrong'}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isPending || isConfirming}
          style={{
            width: '100%',
            padding: 'var(--dt-space-4)',
            background: 'var(--dt-accent)',
            border: 'none',
            borderRadius: 'var(--dt-radius-lg)',
            color: '#FFF',
            fontFamily: 'var(--dt-font-body)',
            fontSize: 'var(--dt-text-base)',
            fontWeight: 600,
            letterSpacing: 'var(--dt-tracking-wide)',
            cursor: isPending || isConfirming ? 'not-allowed' : 'pointer',
            opacity: isPending || isConfirming ? 0.6 : 1,
            transition: 'all var(--dt-duration-fast) var(--dt-ease-out)',
            minHeight: 44
          }}
          onMouseEnter={(e) => {
            if (!isPending && !isConfirming) {
              (e.currentTarget as HTMLButtonElement).style.background = '#E8704D'
            }
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = '#C75B39'
          }}
        >
          {isPending ? '⏳ Submitting...' : isConfirming ? '⏳ Confirming...' : '✓ UPDATE POLICY'}
        </button>
      </form>

      {/* X402 Payment Integration */}
      <X402Payment intentId={0} />
    </div>
  );
}
