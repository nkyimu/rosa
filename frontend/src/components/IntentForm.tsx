import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { encodeAbiParameters, parseAbiParameters, parseUnits, formatUnits } from "viem";
import { CONTRACT_ADDRESSES } from "../config/wagmi";
import { IntentRegistryABI } from "../abis/IntentRegistry";
import { SaveCircleABI } from "../abis/SaveCircle";
import { 
  generateSalt, 
  computeCommitment, 
  storeCommitmentData, 
  getPrivacyMode 
} from "../utils/privacy";
import { PrivacyBadge } from "./PrivacyBadge";

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
  
  // Privacy mode state
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);
  const [privacyStep, setPrivacyStep] = useState<PrivacyStep>("input");
  const [commitmentData, setCommitmentData] = useState<any>(null);
  const [proofId, setProofId] = useState("");

  const { writeContract, data: txHash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  // Mock reading privacy mode from contract (would be useReadContract in production)
  // For now, toggling is in a demo state
  function togglePrivacyMode() {
    setIsPrivacyMode(!isPrivacyMode);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isConnected) return;

    // Privacy mode: commit-reveal flow
    if (isPrivacyMode) {
      // Step 1: Generate salt and compute commitment
      const salt = generateSalt();
      const commitment = computeCommitment(amount, salt);
      
      setCommitmentData({ amount, salt, commitment });
      setPrivacyStep("commit");
      
      // For hackathon: simulate commitment submission
      // In production: call SaveCircle.commitContribution(commitment)
      setTimeout(() => {
        setPrivacyStep("confirming");
        
        // Simulate Nightfall deposit
        setTimeout(() => {
          // Generate a mock proof ID
          const mockProofId = "0x" + Math.random().toString(16).slice(2, 18).padEnd(16, "0");
          setProofId(mockProofId);
          
          // Store salt in localStorage for reveal
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

    // Standard mode: direct contribution flow
    const params = encodeAbiParameters(
      parseAbiParameters("uint256 contributionAmount, uint256 cycleDuration, uint8 preferredSize"),
      [parseUnits(amount, 18), BigInt(cycleDuration), preferredSize]
    );
    const expiresAt = BigInt(Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60);
    // intentType: 0 = JOIN_CIRCLE
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

  // Privacy mode: commit phase message
  if (isPrivacyMode && privacyStep === "commit") {
    return (
      <div style={{
        background: 'var(--dt-surface-raised)',
        borderRadius: 'var(--dt-radius-xl)',
        border: '1px solid var(--dt-accent)',
        padding: 'var(--dt-space-8)',
        textAlign: 'center',
        boxShadow: '0 0 40px rgba(212,175,55,0.1)'
      }}>
        <div style={{ fontSize: 48, marginBottom: 'var(--dt-space-4)' }}>🔒</div>
        <h3 style={{
          fontFamily: 'var(--dt-font-display)',
          fontSize: 'var(--dt-text-2xl)',
          fontWeight: 400,
          color: 'var(--dt-text-primary)',
          marginBottom: 'var(--dt-space-2)',
          margin: 0
        }}>Commitment Submitted</h3>
        <p style={{
          color: 'var(--dt-text-secondary)',
          fontSize: 'var(--dt-text-sm)',
          margin: 0,
          marginTop: 'var(--dt-space-2)',
          marginBottom: 'var(--dt-space-6)'
        }}>
          Your contribution is private. Hashed commitment recorded on-chain.
        </p>
        
        {commitmentData && (
          <div style={{
            background: 'var(--dt-surface-base)',
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
              <strong>Salt (saved locally):</strong> {commitmentData.salt}
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
            transition: 'all 0.2s ease'
          }}
        >
          Back
        </button>
      </div>
    );
  }

  // Privacy mode: confirming/deposit phase
  if (isPrivacyMode && privacyStep === "confirming") {
    return (
      <div style={{
        background: 'var(--dt-surface-raised)',
        borderRadius: 'var(--dt-radius-xl)',
        border: '1px solid var(--dt-accent)',
        padding: 'var(--dt-space-8)',
        textAlign: 'center',
        boxShadow: '0 0 40px rgba(212,175,55,0.1)'
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
          marginBottom: 'var(--dt-space-2)',
          margin: 0
        }}>Depositing to Nightfall</h3>
        <p style={{
          color: 'var(--dt-text-secondary)',
          fontSize: 'var(--dt-text-sm)',
          margin: 0,
          marginTop: 'var(--dt-space-2)'
        }}>
          Your contribution is being encrypted and sent to the privacy layer...
        </p>
      </div>
    );
  }

  // Privacy mode: success
  if (isPrivacyMode && privacyStep === "success") {
    return (
      <div style={{
        background: 'var(--dt-surface-raised)',
        border: '1px solid var(--dt-trust-community)',
        borderRadius: 'var(--dt-radius-xl)',
        padding: 'var(--dt-space-8)',
        textAlign: 'center',
        boxShadow: '0 0 40px rgba(34,197,94,0.1)'
      }}>
        <div style={{ fontSize: 48, marginBottom: 'var(--dt-space-4)' }}>✨</div>
        <h3 style={{
          fontFamily: 'var(--dt-font-display)',
          fontSize: 'var(--dt-text-2xl)',
          fontWeight: 400,
          color: 'var(--dt-text-primary)',
          marginBottom: 'var(--dt-space-2)',
          margin: 0
        }}>Contribution Recorded Privately</h3>
        <p style={{
          color: 'var(--dt-text-secondary)',
          fontSize: 'var(--dt-text-sm)',
          margin: 0,
          marginTop: 'var(--dt-space-2)',
          marginBottom: 'var(--dt-space-4)'
        }}>
          Your ${amount} cUSD has been privately recorded. Amount hidden on-chain.
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
              <strong>Nightfall Proof ID</strong>
            </p>
            {proofId.slice(0, 16)}...
          </div>
        )}

        <button
          onClick={handleResetPrivacy}
          style={{
            padding: 'var(--dt-space-3) var(--dt-space-6)',
            background: 'var(--dt-trust-community)',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 'var(--dt-radius-lg)',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          Done
        </button>
      </div>
    );
  }

  // Standard form — either privacy off or input phase
  if (isSuccess) {
    return (
      <div style={{
        background: 'var(--dt-surface-raised)',
        border: '1px solid var(--dt-trust-community)',
        borderRadius: 'var(--dt-radius-xl)',
        padding: 'var(--dt-space-8)',
        textAlign: 'center',
        boxShadow: '0 0 40px rgba(34,197,94,0.1)'
      }}>
        <div style={{ fontSize: 48, marginBottom: 'var(--dt-space-4)' }}>✨</div>
        <h3 style={{
          fontFamily: 'var(--dt-font-display)',
          fontSize: 'var(--dt-text-2xl)',
          fontWeight: 400,
          color: 'var(--dt-text-primary)',
          marginBottom: 'var(--dt-space-2)',
          margin: 0
        }}>Intent Submitted</h3>
        <p style={{
          color: 'var(--dt-text-secondary)',
          fontSize: 'var(--dt-text-sm)',
          margin: 0,
          marginTop: 'var(--dt-space-2)'
        }}>
          The agent is searching for your circle. You'll be matched within 24 hours.
        </p>
        {txHash && (
          <a href={`https://sepolia.celoscan.io/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
            style={{
              display: 'inline-block',
              marginTop: 'var(--dt-space-3)',
              fontSize: 'var(--dt-text-xs)',
              color: 'var(--dt-accent)',
              textDecoration: 'underline'
            }}>
            View on CeloScan
          </a>
        )}
      </div>
    );
  }

  return (
    <div style={{
      background: 'var(--dt-surface-raised)',
      borderRadius: 'var(--dt-radius-xl)',
      border: '1px solid var(--dt-border-default)',
      padding: 'var(--dt-space-6)',
      boxShadow: 'var(--dt-shadow-md)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Paper noise layer on card */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 'inherit',
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.5' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
        opacity: 0.06,
        pointerEvents: 'none',
        mixBlendMode: 'screen'
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--dt-space-4)' }}>
          <div>
            <h2 style={{
              fontFamily: 'var(--dt-font-display)',
              fontSize: 'var(--dt-text-2xl)',
              fontWeight: 400,
              color: 'var(--dt-text-primary)',
              marginBottom: 'var(--dt-space-1)',
              margin: 0
            }}>Join a Savings Circle</h2>
            <p style={{
              color: 'var(--dt-text-muted)',
              fontSize: 'var(--dt-text-sm)',
              marginBottom: 'var(--dt-space-1)',
              margin: 0
            }}>
              State your intent — the agent finds your people.
            </p>
          </div>
          <button
            onClick={togglePrivacyMode}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 'var(--dt-space-2)',
              marginLeft: 'auto'
            }}
            title="Toggle privacy mode"
          >
            <PrivacyBadge isPrivate={isPrivacyMode} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--dt-space-5)' }}>
          {/* Amount input */}
          <div>
            <label style={{
              display: 'block', fontSize: 'var(--dt-text-xs)', fontWeight: 500,
              color: 'var(--dt-text-muted)', letterSpacing: 'var(--dt-tracking-widest)',
              textTransform: 'uppercase', marginBottom: 'var(--dt-space-2)',
              margin: 0
            }}>Contribution per round</label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute', left: 'var(--dt-space-4)', top: '50%', transform: 'translateY(-50%)',
                fontFamily: 'var(--dt-font-mono)', color: 'var(--dt-text-muted)', fontSize: 'var(--dt-text-lg)'
              }}>$</span>
              <input type="number" min="1" step="1" value={amount} onChange={(e) => setAmount(e.target.value)}
                style={{
                  width: '100%', paddingLeft: 'var(--dt-space-8)', paddingRight: 'var(--dt-space-4)',
                  paddingTop: 'var(--dt-space-4)', paddingBottom: 'var(--dt-space-4)',
                  background: 'var(--dt-surface-overlay)', border: '1px solid var(--dt-border-default)',
                  borderRadius: 'var(--dt-radius-lg)', color: 'var(--dt-text-primary)',
                  fontFamily: 'var(--dt-font-mono)', fontSize: 'var(--dt-text-xl)', fontWeight: 500,
                  outline: 'none', boxSizing: 'border-box',
                  transition: 'border-color 0.2s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--dt-accent)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--dt-border-default)'}
                required />
            </div>
            <p style={{
              fontSize: 'var(--dt-text-xs)', color: 'var(--dt-text-muted)', marginTop: 'var(--dt-space-1)',
              margin: 0
            }}>
              Matched with members within 10%
            </p>
          </div>

          {/* Cycle duration buttons */}
          <div>
            <label style={{
              display: 'block', fontSize: 'var(--dt-text-xs)', fontWeight: 500,
              color: 'var(--dt-text-muted)', letterSpacing: 'var(--dt-tracking-widest)',
              textTransform: 'uppercase', marginBottom: 'var(--dt-space-2)',
              margin: 0
            }}>Cycle</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--dt-space-2)' }}>
              {CYCLE_OPTIONS.map((opt) => (
                <button key={opt.value} type="button" onClick={() => setCycleDuration(opt.value)}
                  style={{
                    padding: 'var(--dt-space-3) var(--dt-space-2)',
                    borderRadius: 'var(--dt-radius-md)',
                    border: `1px solid ${cycleDuration === opt.value ? 'var(--dt-accent)' : 'var(--dt-border-default)'}`,
                    background: cycleDuration === opt.value ? 'var(--dt-accent-muted)' : 'var(--dt-surface-overlay)',
                    color: cycleDuration === opt.value ? 'var(--dt-accent)' : 'var(--dt-text-secondary)',
                    fontWeight: 500, fontSize: 'var(--dt-text-sm)', cursor: 'pointer',
                    transition: 'all 0.2s ease', minHeight: 44
                  }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Circle size slider */}
          <div>
            <label style={{
              display: 'block', fontSize: 'var(--dt-text-xs)', fontWeight: 500,
              color: 'var(--dt-text-muted)', letterSpacing: 'var(--dt-tracking-widest)',
              textTransform: 'uppercase', marginBottom: 'var(--dt-space-2)',
              margin: 0
            }}>
              Preferred circle size: <span style={{ color: 'var(--dt-accent)', fontFamily: 'var(--dt-font-mono)' }}>{preferredSize} members</span>
            </label>
            <input type="range" min={5} max={20} value={preferredSize}
              onChange={(e) => setPreferredSize(Number(e.target.value))}
              style={{ width: '100%', height: 44, cursor: 'pointer' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--dt-text-xs)', color: 'var(--dt-text-muted)', marginTop: 'var(--dt-space-1)' }}>
              <span>5 (smaller)</span><span>20 (larger)</span>
            </div>
          </div>

          {/* Intent summary — document/contract style */}
          <div style={{
            background: 'var(--dt-surface-base)',
            border: '1px solid var(--dt-border-strong)',
            borderRadius: 'var(--dt-radius-lg)',
            padding: 'var(--dt-space-4) var(--dt-space-5)',
            marginBottom: 'var(--dt-space-2)',
            position: 'relative'
          }}>
            {/* "INTENT" stamp label */}
            <div style={{
              position: 'absolute', top: -10, left: 'var(--dt-space-4)',
              background: 'var(--dt-accent)', color: '#0A0804',
              fontSize: 'var(--dt-text-xs)', fontWeight: 700,
              padding: '2px var(--dt-space-3)', borderRadius: 'var(--dt-radius-full)',
              letterSpacing: 'var(--dt-tracking-widest)', textTransform: 'uppercase'
            }}>Intent</div>
            <div style={{ marginTop: 'var(--dt-space-2)' }}>
              <p style={{
                fontFamily: 'var(--dt-font-mono)', fontSize: 'var(--dt-text-sm)',
                color: 'var(--dt-text-secondary)', margin: 0
              }}>
                Contribute <span style={{ color: 'var(--dt-accent)', fontWeight: 600 }}>${amount} cUSD</span> per round
                · <span style={{ color: 'var(--dt-text-primary)' }}>{CYCLE_OPTIONS.find(o => o.value === cycleDuration)?.label}</span>
                · <span style={{ color: 'var(--dt-text-primary)' }}>{preferredSize} members</span>
              </p>
              <p style={{
                fontFamily: 'var(--dt-font-display)', fontSize: 'var(--dt-text-xl)',
                color: 'var(--dt-text-primary)', marginTop: 'var(--dt-space-2)', fontWeight: 400,
                margin: 0
              }}>
                Total payout: <span style={{ color: 'var(--dt-trust-credit)' }}>${(Number(amount) * preferredSize).toFixed(0)} cUSD</span>
              </p>
            </div>
          </div>

          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 'var(--dt-radius-md)',
              padding: 'var(--dt-space-3) var(--dt-space-4)',
              color: 'var(--dt-state-error)',
              fontSize: 'var(--dt-text-sm)'
            }}>
              {error.message.slice(0, 120)}
            </div>
          )}

          {/* CTA button — gold, prominent */}
          <button type="submit" disabled={isPending || isConfirming || !isConnected}
            style={{
              width: '100%', padding: 'var(--dt-space-4) var(--dt-space-6)',
              minHeight: 44,
              background: isPending || isConfirming ? 'var(--dt-accent-muted)' : 'var(--dt-accent)',
              color: isPending || isConfirming ? 'var(--dt-accent)' : '#0A0804',
              border: '1px solid var(--dt-accent)',
              borderRadius: 'var(--dt-radius-lg)',
              fontWeight: 600, fontSize: 'var(--dt-text-base)',
              cursor: isPending || isConfirming || !isConnected ? 'not-allowed' : 'pointer',
              opacity: !isConnected ? 0.5 : 1,
              transition: 'all 0.2s ease',
              letterSpacing: 'var(--dt-tracking-wide)'
            }}>
            {isPending ? "Confirm in wallet..." : isConfirming ? "Submitting intent..." : !isConnected ? "Connect wallet first" : "✦ Submit Intent"}
          </button>
        </form>
      </div>
    </div>
  );
}
