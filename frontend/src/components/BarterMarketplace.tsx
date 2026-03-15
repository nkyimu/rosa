import { useState } from "react";
import { useAccount } from "wagmi";
import { useBarterMatches, useTrustScore, submitBarterIntent } from "../hooks/useAgent";

export function BarterMarketplace() {
  const { address, isConnected } = useAccount();
  const [offering, setOffering] = useState("");
  const [seeking, setSeeking] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const { data: matches, loading: matchesLoading } = useBarterMatches();
  const { data: tierData } = useTrustScore(address);

  const isElder = tierData?.tier === "ELDER";

  async function handleSubmitBarter(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError("");
    setSubmitSuccess(false);

    if (!offering.trim() || !seeking.trim()) {
      setSubmitError("Please fill in both offering and seeking fields");
      return;
    }

    setIsSubmitting(true);
    try {
      await submitBarterIntent(offering, seeking);
      setSubmitSuccess(true);
      setOffering("");
      setSeeking("");
      setTimeout(() => setSubmitSuccess(false), 4000);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to submit barter intent");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isConnected) {
    return (
      <div style={{
        textAlign: 'center',
        padding: 'var(--dt-space-12) var(--dt-space-4)',
        color: 'var(--dt-text-secondary)',
        fontSize: 'var(--dt-text-base)'
      }}>
        Connect your wallet to access the barter marketplace
      </div>
    );
  }

  if (!isElder) {
    return (
      <div style={{
        background: 'var(--dt-surface-raised)',
        border: '1px solid var(--dt-border-default)',
        borderRadius: 'var(--dt-radius-xl)',
        padding: 'var(--dt-space-8)',
        boxShadow: 'var(--dt-shadow-md)',
        textAlign: 'center'
      }}>
        <div style={{
          fontSize: 48,
          marginBottom: 'var(--dt-space-4)'
        }}>
          🔐
        </div>
        <h3 style={{
          fontFamily: 'var(--dt-font-display)',
          fontSize: 'var(--dt-text-lg)',
          fontWeight: 400,
          color: 'var(--dt-text-primary)',
          marginBottom: 'var(--dt-space-2)',
          margin: 0
        }}>
          Barter Marketplace Locked
        </h3>
        <p style={{
          color: 'var(--dt-text-secondary)',
          fontSize: 'var(--dt-text-sm)',
          margin: 0,
          marginBottom: 'var(--dt-space-4)'
        }}>
          Reach <strong>ELDER tier</strong> (95+ reputation) to unlock the barter marketplace and exchange services with other agents.
        </p>
        <div style={{
          padding: 'var(--dt-space-3) var(--dt-space-4)',
          background: 'var(--dt-surface-overlay)',
          borderRadius: 'var(--dt-radius-md)',
          border: '1px solid var(--dt-border-subtle)',
          fontSize: 'var(--dt-text-xs)',
          color: 'var(--dt-text-muted)'
        }}>
          Your reputation: {tierData?.score || 0} / 100
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--dt-space-6)' }}>
      {/* Submit Barter Intent Form */}
      <div style={{
        background: 'var(--dt-surface-raised)',
        border: '1px solid var(--dt-border-default)',
        borderRadius: 'var(--dt-radius-xl)',
        padding: 'var(--dt-space-6)',
        boxShadow: 'var(--dt-shadow-md)'
      }}>
        <h3 style={{
          fontFamily: 'var(--dt-font-display)',
          fontSize: 'var(--dt-text-xl)',
          fontWeight: 400,
          color: 'var(--dt-text-primary)',
          margin: 0,
          marginBottom: 'var(--dt-space-1)'
        }}>
          Post a Barter Intent
        </h3>
        <p style={{
          color: 'var(--dt-text-muted)',
          fontSize: 'var(--dt-text-sm)',
          margin: 0,
          marginBottom: 'var(--dt-space-5)'
        }}>
          Describe what you can offer and what you're looking for
        </p>

        <form onSubmit={handleSubmitBarter} style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--dt-space-4)'
        }}>
          {/* I can offer */}
          <div>
            <label style={{
              display: 'block',
              fontSize: 'var(--dt-text-xs)',
              fontWeight: 500,
              color: 'var(--dt-text-muted)',
              letterSpacing: 'var(--dt-tracking-widest)',
              textTransform: 'uppercase',
              marginBottom: 'var(--dt-space-2)',
              margin: 0
            }}>
              I can offer
            </label>
            <textarea
              value={offering}
              onChange={(e) => setOffering(e.target.value)}
              placeholder="e.g., 'Web design consultation', 'Legal review service', 'Spanish tutoring'"
              style={{
                width: '100%',
                padding: 'var(--dt-space-3) var(--dt-space-4)',
                background: 'var(--dt-surface-overlay)',
                border: '1px solid var(--dt-border-default)',
                borderRadius: 'var(--dt-radius-lg)',
                fontFamily: 'var(--dt-font-body)',
                fontSize: 'var(--dt-text-base)',
                color: 'var(--dt-text-primary)',
                minHeight: 80,
                resize: 'vertical',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s ease'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = 'var(--dt-accent)'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'var(--dt-border-default)'}
            />
          </div>

          {/* I'm looking for */}
          <div>
            <label style={{
              display: 'block',
              fontSize: 'var(--dt-text-xs)',
              fontWeight: 500,
              color: 'var(--dt-text-muted)',
              letterSpacing: 'var(--dt-tracking-widest)',
              textTransform: 'uppercase',
              marginBottom: 'var(--dt-space-2)',
              margin: 0
            }}>
              I'm looking for
            </label>
            <textarea
              value={seeking}
              onChange={(e) => setSeeking(e.target.value)}
              placeholder="e.g., 'Smart contract review', 'Brand strategy', 'DeFi consulting'"
              style={{
                width: '100%',
                padding: 'var(--dt-space-3) var(--dt-space-4)',
                background: 'var(--dt-surface-overlay)',
                border: '1px solid var(--dt-border-default)',
                borderRadius: 'var(--dt-radius-lg)',
                fontFamily: 'var(--dt-font-body)',
                fontSize: 'var(--dt-text-base)',
                color: 'var(--dt-text-primary)',
                minHeight: 80,
                resize: 'vertical',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s ease'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = 'var(--dt-accent)'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'var(--dt-border-default)'}
            />
          </div>

          {submitError && (
            <div style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 'var(--dt-radius-md)',
              padding: 'var(--dt-space-2) var(--dt-space-3)',
              color: 'var(--dt-state-error)',
              fontSize: 'var(--dt-text-xs)'
            }}>
              {submitError}
            </div>
          )}

          {submitSuccess && (
            <div style={{
              background: 'rgba(34,197,94,0.08)',
              border: '1px solid rgba(34,197,94,0.2)',
              borderRadius: 'var(--dt-radius-md)',
              padding: 'var(--dt-space-2) var(--dt-space-3)',
              color: 'var(--dt-trust-community)',
              fontSize: 'var(--dt-text-xs)'
            }}>
              ✓ Barter intent posted successfully
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              width: '100%',
              padding: 'var(--dt-space-3) var(--dt-space-4)',
              background: isSubmitting ? 'var(--dt-accent-muted)' : 'var(--dt-accent)',
              border: '1px solid var(--dt-accent)',
              borderRadius: 'var(--dt-radius-lg)',
              color: isSubmitting ? 'var(--dt-accent)' : '#0A0A0A',
              fontWeight: 600,
              fontSize: 'var(--dt-text-sm)',
              letterSpacing: 'var(--dt-tracking-wide)',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {isSubmitting ? "Posting..." : "Post Barter Intent"}
          </button>
        </form>
      </div>

      {/* Available Matches */}
      <div style={{
        background: 'var(--dt-surface-raised)',
        border: '1px solid var(--dt-border-default)',
        borderRadius: 'var(--dt-radius-xl)',
        padding: 'var(--dt-space-6)',
        boxShadow: 'var(--dt-shadow-md)'
      }}>
        <h3 style={{
          fontFamily: 'var(--dt-font-display)',
          fontSize: 'var(--dt-text-xl)',
          fontWeight: 400,
          color: 'var(--dt-text-primary)',
          margin: 0,
          marginBottom: 'var(--dt-space-4)'
        }}>
          Available Matches
        </h3>

        {matchesLoading ? (
          <div style={{ color: 'var(--dt-text-muted)', fontSize: 'var(--dt-text-sm)' }}>
            Loading matches...
          </div>
        ) : matches && matches.length > 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--dt-space-3)'
          }}>
            {matches.map((match) => (
              <div
                key={match.id}
                style={{
                  padding: 'var(--dt-space-4)',
                  background: 'var(--dt-surface-overlay)',
                  border: '1px solid var(--dt-border-subtle)',
                  borderRadius: 'var(--dt-radius-lg)'
                }}
              >
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 32px 1fr',
                  gap: 'var(--dt-space-3)',
                  alignItems: 'center',
                  marginBottom: 'var(--dt-space-3)'
                }}>
                  {/* Offering */}
                  <div>
                    <p style={{
                      fontSize: 'var(--dt-text-xs)',
                      color: 'var(--dt-text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: 'var(--dt-tracking-wide)',
                      fontWeight: 500,
                      margin: 0,
                      marginBottom: 'var(--dt-space-1)'
                    }}>
                      Offering
                    </p>
                    <p style={{
                      fontSize: 'var(--dt-text-sm)',
                      color: 'var(--dt-text-primary)',
                      margin: 0,
                      lineHeight: 'var(--dt-leading-normal)'
                    }}>
                      {match.offering}
                    </p>
                  </div>

                  {/* Arrow icon */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16
                  }}>
                    ↔
                  </div>

                  {/* Seeking */}
                  <div>
                    <p style={{
                      fontSize: 'var(--dt-text-xs)',
                      color: 'var(--dt-text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: 'var(--dt-tracking-wide)',
                      fontWeight: 500,
                      margin: 0,
                      marginBottom: 'var(--dt-space-1)'
                    }}>
                      Seeking
                    </p>
                    <p style={{
                      fontSize: 'var(--dt-text-sm)',
                      color: 'var(--dt-text-primary)',
                      margin: 0,
                      lineHeight: 'var(--dt-leading-normal)'
                    }}>
                      {match.seeking}
                    </p>
                  </div>
                </div>

                {/* Compatibility and offerer */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: 'var(--dt-space-3)',
                  borderTop: '1px solid var(--dt-border-subtle)',
                  marginBottom: 'var(--dt-space-3)'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--dt-space-2)'
                  }}>
                    <span style={{
                      fontSize: 'var(--dt-text-xs)',
                      color: 'var(--dt-text-muted)',
                      fontWeight: 500
                    }}>
                      Match:
                    </span>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '2px 8px',
                      background: 'var(--dt-accent-muted)',
                      borderRadius: 'var(--dt-radius-full)',
                      border: '1px solid var(--dt-accent)'
                    }}>
                      <span style={{
                        fontFamily: 'var(--dt-font-mono)',
                        fontSize: 'var(--dt-text-xs)',
                        fontWeight: 600,
                        color: 'var(--dt-accent)'
                      }}>
                        {Math.round(match.compatibility)}%
                      </span>
                    </div>
                  </div>
                  <p style={{
                    fontFamily: 'var(--dt-font-mono)',
                    fontSize: 'var(--dt-text-xs)',
                    color: 'var(--dt-text-muted)',
                    margin: 0
                  }}>
                    {match.offerer.slice(0, 8)}...
                  </p>
                </div>

                <button style={{
                  width: '100%',
                  padding: 'var(--dt-space-2) var(--dt-space-3)',
                  background: 'var(--dt-trust-community)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 'var(--dt-radius-md)',
                  fontSize: 'var(--dt-text-sm)',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLButtonElement).style.background = 'var(--dt-trust-community-glow)';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLButtonElement).style.background = 'var(--dt-trust-community)';
                }}
                >
                  Accept Match
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p style={{
            fontSize: 'var(--dt-text-sm)',
            color: 'var(--dt-text-muted)',
            margin: 0
          }}>
            No matches available yet. Be the first to post an intent!
          </p>
        )}
      </div>
    </div>
  );
}
