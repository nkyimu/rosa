import { useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CONTRACT_ADDRESSES } from "../config/wagmi";

const circleTrustAbi = [
  { type: "function", name: "trustScore",    inputs: [{ name: "user", type: "address" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "getTrustEdges", inputs: [{ name: "user", type: "address" }], outputs: [{ name: "", type: "tuple[]", components: [{ name: "trustee", type: "address" }, { name: "expiresAt", type: "uint96" }] }], stateMutability: "view" },
  { type: "function", name: "trust",         inputs: [{ name: "trustee", type: "address" }, { name: "expiresAt", type: "uint96" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "revokeTrust",   inputs: [{ name: "trustee", type: "address" }], outputs: [], stateMutability: "nonpayable" },
] as const;

type TrustEdge = { trustee: `0x${string}`; expiresAt: bigint };

export function TrustPanel() {
  const { address, isConnected } = useAccount();
  const [vouchAddress, setVouchAddress] = useState("");
  const [vouchMonths, setVouchMonths]   = useState(12);
  const [formError, setFormError]       = useState("");

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const { data: trustScore } = useReadContract({
    address: CONTRACT_ADDRESSES.circleTrust,
    abi: circleTrustAbi,
    functionName: "trustScore",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: givenEdges } = useReadContract({
    address: CONTRACT_ADDRESSES.circleTrust,
    abi: circleTrustAbi,
    functionName: "getTrustEdges",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  function handleVouch(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!/^0x[0-9a-fA-F]{40}$/.test(vouchAddress)) {
      setFormError("Enter a valid Ethereum address (0x...)");
      return;
    }
    const expiresAt = BigInt(Math.floor(Date.now() / 1000) + vouchMonths * 30 * 24 * 60 * 60);
    writeContract({ address: CONTRACT_ADDRESSES.circleTrust, abi: circleTrustAbi, functionName: "trust", args: [vouchAddress as `0x${string}`, expiresAt] });
  }

  function handleRevoke(trustee: `0x${string}`) {
    writeContract({ address: CONTRACT_ADDRESSES.circleTrust, abi: circleTrustAbi, functionName: "revokeTrust", args: [trustee] });
  }

  if (!isConnected) {
    return (
      <div style={{
        textAlign: 'center', padding: 'var(--dt-space-12) var(--dt-space-4)',
        color: 'var(--dt-text-secondary)', fontSize: 'var(--dt-text-base)'
      }}>
        Connect your wallet to manage trust
      </div>
    );
  }

  const score = Number((trustScore as bigint | undefined) ?? 0n);
  const edges = (givenEdges ?? []) as TrustEdge[];

  // Mock three-dimension breakdown
  const reliability = Math.min(score * 0.9 + 5, 100);
  const credit = Math.max(score * 0.7, 0);
  const community = Math.min(score * 1.1, 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--dt-space-6)' }}>
      {/* Trust Score Display — Three Dimensions */}
      <div style={{
        background: 'var(--dt-surface-raised)',
        border: '1px solid var(--dt-border-default)',
        borderRadius: 'var(--dt-radius-xl)',
        padding: 'var(--dt-space-6)',
        boxShadow: 'var(--dt-shadow-md)'
      }}>
        <p style={{
          fontSize: 'var(--dt-text-xs)', fontWeight: 500, letterSpacing: 'var(--dt-tracking-widest)',
          textTransform: 'uppercase', color: 'var(--dt-text-muted)', marginBottom: 'var(--dt-space-2)',
          margin: 0
        }}>Trust Score</p>

        {/* Large score display */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--dt-space-2)', marginBottom: 'var(--dt-space-5)' }}>
          <span style={{
            fontFamily: 'var(--dt-font-display)',
            fontSize: 'var(--dt-text-4xl)', fontWeight: 400,
            color: score >= 80 ? 'var(--dt-trust-community)' : score >= 50 ? 'var(--dt-trust-credit)' : '#EF4444'
          }}>{score}</span>
          <span style={{
            color: 'var(--dt-text-muted)', fontSize: 'var(--dt-text-xl)',
            fontFamily: 'var(--dt-font-mono)'
          }}>/ 100</span>
        </div>

        {/* Three dimension bars */}
        {[
          { label: 'Reliability', color: 'var(--dt-trust-reliability)', value: reliability, desc: 'On-time payments' },
          { label: 'Credit', color: 'var(--dt-trust-credit)', value: credit, desc: 'Borrowing history' },
          { label: 'Community', color: 'var(--dt-trust-community)', value: community, desc: 'Circle connections' },
        ].map((dim) => (
          <div key={dim.label} style={{ marginBottom: 'var(--dt-space-3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--dt-space-1)' }}>
              <span style={{
                fontSize: 'var(--dt-text-xs)', color: 'var(--dt-text-secondary)',
                fontWeight: 500
              }}>
                {dim.label}
              </span>
              <span style={{
                fontSize: 'var(--dt-text-xs)', fontFamily: 'var(--dt-font-mono)',
                color: dim.color
              }}>
                {Math.round(dim.value)}
              </span>
            </div>
            <div style={{
              width: '100%', height: 4, borderRadius: 'var(--dt-radius-full)',
              background: 'var(--dt-surface-overlay)', overflow: 'hidden'
            }}>
              <div style={{
                width: `${dim.value}%`, height: '100%', borderRadius: 'inherit',
                background: dim.color, transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)'
              }} />
            </div>
            <p style={{
              fontSize: 'var(--dt-text-xs)', color: 'var(--dt-text-muted)',
              marginTop: 'var(--dt-space-1)', margin: 0
            }}>
              {dim.desc}
            </p>
          </div>
        ))}

        {/* Score context */}
        <div style={{
          marginTop: 'var(--dt-space-4)', padding: 'var(--dt-space-3) var(--dt-space-4)',
          background: 'var(--dt-surface-overlay)',
          borderRadius: 'var(--dt-radius-md)',
          border: '1px solid var(--dt-border-subtle)'
        }}>
          <p style={{
            fontSize: 'var(--dt-text-xs)', color: 'var(--dt-text-muted)', margin: 0
          }}>
            Score {score}: qualifies for circles up to{' '}
            <span style={{
              color: 'var(--dt-accent)', fontFamily: 'var(--dt-font-mono)',
              fontWeight: 500
            }}>
              ${score >= 80 ? '100' : score >= 50 ? '50' : '20'} cUSD/cycle
            </span>
          </p>
        </div>
      </div>

      {/* Vouch Form */}
      <div style={{
        background: 'var(--dt-surface-raised)',
        border: '1px solid var(--dt-border-default)',
        borderRadius: 'var(--dt-radius-xl)',
        padding: 'var(--dt-space-6)',
        boxShadow: 'var(--dt-shadow-md)'
      }}>
        <h3 style={{
          fontFamily: 'var(--dt-font-display)', fontSize: 'var(--dt-text-xl)',
          fontWeight: 400, color: 'var(--dt-text-primary)', marginBottom: 'var(--dt-space-1)',
          margin: 0
        }}>Vouch for Someone</h3>
        <p style={{
          color: 'var(--dt-text-muted)', fontSize: 'var(--dt-text-sm)',
          marginBottom: 'var(--dt-space-5)', margin: 0,
          marginTop: 'var(--dt-space-1)'
        }}>
          Your endorsement raises their score and opens circles to them.
        </p>

        <form onSubmit={handleVouch} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--dt-space-4)' }}>
          {/* Address input */}
          <div>
            <label style={{
              display: 'block', fontSize: 'var(--dt-text-xs)', fontWeight: 500,
              color: 'var(--dt-text-muted)', letterSpacing: 'var(--dt-tracking-widest)',
              textTransform: 'uppercase', marginBottom: 'var(--dt-space-2)',
              margin: 0
            }}>Wallet Address</label>
            <input type="text" value={vouchAddress}
              onChange={(e) => setVouchAddress(e.target.value)}
              placeholder="0x..."
              style={{
                width: '100%', padding: 'var(--dt-space-3) var(--dt-space-4)',
                background: 'var(--dt-surface-overlay)',
                border: '1px solid var(--dt-border-default)',
                borderRadius: 'var(--dt-radius-lg)',
                color: 'var(--dt-text-primary)',
                fontFamily: 'var(--dt-font-mono)',
                fontSize: 'var(--dt-text-sm)',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s ease'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--dt-accent)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--dt-border-default)'}
            />
          </div>

          {/* Duration slider */}
          <div>
            <label style={{
              display: 'block', fontSize: 'var(--dt-text-xs)', fontWeight: 500,
              color: 'var(--dt-text-muted)', letterSpacing: 'var(--dt-tracking-widest)',
              textTransform: 'uppercase', marginBottom: 'var(--dt-space-2)',
              margin: 0
            }}>
              Duration: <span style={{
                color: 'var(--dt-accent)', fontFamily: 'var(--dt-font-mono)',
                fontWeight: 500
              }}>{vouchMonths} months</span>
            </label>
            <input type="range" min={1} max={24} value={vouchMonths}
              onChange={(e) => setVouchMonths(Number(e.target.value))}
              style={{ width: '100%' }} />
          </div>

          {formError && (
            <div style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 'var(--dt-radius-md)',
              padding: 'var(--dt-space-2) var(--dt-space-3)',
              color: 'var(--dt-state-error)',
              fontSize: 'var(--dt-text-xs)'
            }}>
              {formError}
            </div>
          )}

          {isSuccess && (
            <div style={{
              background: 'rgba(34,197,94,0.08)',
              border: '1px solid rgba(34,197,94,0.2)',
              borderRadius: 'var(--dt-radius-md)',
              padding: 'var(--dt-space-2) var(--dt-space-3)',
              color: 'var(--dt-trust-community)',
              fontSize: 'var(--dt-text-xs)'
            }}>
              Trust added successfully
            </div>
          )}

          <button type="submit" disabled={isPending || isConfirming}
            style={{
              width: '100%', padding: 'var(--dt-space-3) var(--dt-space-4)',
              background: isPending || isConfirming ? 'var(--dt-accent-muted)' : 'var(--dt-surface-overlay)',
              border: '1px solid var(--dt-border-strong)',
              borderRadius: 'var(--dt-radius-lg)',
              color: isPending || isConfirming ? 'var(--dt-accent)' : 'var(--dt-text-primary)',
              fontWeight: 500, fontSize: 'var(--dt-text-sm)',
              cursor: isPending ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease'
            }}>
            {isPending || isConfirming ? "Submitting..." : "Give Vouch"}
          </button>
        </form>
      </div>

      {/* Vouch List */}
      <div style={{
        background: 'var(--dt-surface-raised)',
        border: '1px solid var(--dt-border-default)',
        borderRadius: 'var(--dt-radius-xl)',
        padding: 'var(--dt-space-6)',
        boxShadow: 'var(--dt-shadow-md)'
      }}>
        <h3 style={{
          fontFamily: 'var(--dt-font-display)', fontSize: 'var(--dt-text-xl)',
          fontWeight: 400, color: 'var(--dt-text-primary)', marginBottom: 'var(--dt-space-3)',
          margin: 0
        }}>You Trust ({edges.length})</h3>

        {edges.length === 0 ? (
          <p style={{
            fontSize: 'var(--dt-text-sm)', color: 'var(--dt-text-muted)', margin: 0
          }}>
            You have not vouched for anyone yet
          </p>
        ) : (
          edges.map((edge) => {
            const expiresDate = new Date(Number(edge.expiresAt) * 1000);
            const isExpired = edge.expiresAt > 0n && expiresDate < new Date();
            const shortAddr = `${edge.trustee.slice(0, 8)}...${edge.trustee.slice(-4)}`;
            return (
              <div key={edge.trustee} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                paddingTop: 'var(--dt-space-3)', paddingBottom: 'var(--dt-space-3)',
                borderBottom: '1px solid var(--dt-border-subtle)'
              }}>
                <div>
                  <p style={{
                    fontSize: 'var(--dt-text-sm)', fontFamily: 'var(--dt-font-mono)',
                    color: 'var(--dt-text-primary)', margin: 0
                  }}>
                    {shortAddr}
                  </p>
                  {edge.expiresAt > 0n && (
                    <p style={{
                      fontSize: 'var(--dt-text-xs)',
                      color: isExpired ? 'var(--dt-state-error)' : 'var(--dt-text-muted)',
                      margin: 0,
                      marginTop: 2
                    }}>
                      {isExpired ? "Expired" : `Expires ${expiresDate.toLocaleDateString()}`}
                    </p>
                  )}
                </div>
                <button onClick={() => handleRevoke(edge.trustee)}
                  style={{
                    fontSize: 'var(--dt-text-xs)', color: 'var(--dt-state-error)',
                    background: 'none', border: 'none', cursor: 'pointer', padding: 'var(--dt-space-1) var(--dt-space-2)',
                    borderRadius: 'var(--dt-radius-md)',
                    transition: 'all 0.2s ease'
                  }}>
                  Revoke
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
