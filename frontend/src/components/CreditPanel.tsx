import { useState } from "react";
import { useAccount } from "wagmi";
import { useCreditLines, useCreditReport, submitCreditIssue, downloadCreditReport, useTrustScore } from "../hooks/useAgent";

export function CreditPanel() {
  const { address, isConnected } = useAccount();
  const [borrowerAddr, setBorrowerAddr] = useState("");
  const [creditAmount, setCreditAmount] = useState(50);
  const [durationWeeks, setDurationWeeks] = useState(8);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const { data: creditReport, loading: reportLoading } = useCreditReport(address);
  const { data: creditLines, loading: linesLoading } = useCreditLines(address);
  const { data: tierData } = useTrustScore(address);

  const canIssueCreditLine = tierData?.tier === "CREDITOR" || tierData?.tier === "ELDER";

  async function handleIssueCreditLine(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError("");
    setSubmitSuccess(false);

    if (!/^0x[0-9a-fA-F]{40}$/.test(borrowerAddr)) {
      setSubmitError("Enter a valid Ethereum address");
      return;
    }

    if (creditAmount <= 0 || creditAmount > 1000) {
      setSubmitError("Amount must be between 1 and 1000 cUSD");
      return;
    }

    setIsSubmitting(true);
    try {
      await submitCreditIssue(borrowerAddr, creditAmount, durationWeeks * 7);
      setSubmitSuccess(true);
      setBorrowerAddr("");
      setCreditAmount(50);
      setDurationWeeks(8);
      setTimeout(() => setSubmitSuccess(false), 4000);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to issue credit line");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDownloadReport() {
    if (!address) return;
    try {
      await downloadCreditReport(address);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to download report");
    }
  }

  if (!isConnected) {
    return (
      <div style={{
        textAlign: 'center', padding: 'var(--dt-space-12) var(--dt-space-4)',
        color: 'var(--dt-text-secondary)', fontSize: 'var(--dt-text-base)'
      }}>
        Connect your wallet to view credit info
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--dt-space-6)' }}>
      {/* Credit Report Summary */}
      <div style={{
        background: 'var(--dt-surface-raised)',
        border: '1px solid var(--dt-border-default)',
        borderRadius: 'var(--dt-radius-xl)',
        padding: 'var(--dt-space-6)',
        boxShadow: 'var(--dt-shadow-md)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 'var(--dt-space-4)'
        }}>
          <h3 style={{
            fontFamily: 'var(--dt-font-display)',
            fontSize: 'var(--dt-text-xl)',
            fontWeight: 400,
            color: 'var(--dt-text-primary)',
            margin: 0
          }}>
            Credit Report
          </h3>
          <button
            onClick={handleDownloadReport}
            style={{
              padding: 'var(--dt-space-2) var(--dt-space-3)',
              background: 'var(--dt-surface-overlay)',
              border: '1px solid var(--dt-border-default)',
              borderRadius: 'var(--dt-radius-md)',
              fontSize: 'var(--dt-text-xs)',
              fontWeight: 500,
              color: 'var(--dt-text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.borderColor = 'var(--dt-accent)';
              (e.target as HTMLButtonElement).style.color = 'var(--dt-accent)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.borderColor = 'var(--dt-border-default)';
              (e.target as HTMLButtonElement).style.color = 'var(--dt-text-secondary)';
            }}
          >
            📥 Export
          </button>
        </div>

        {reportLoading ? (
          <div style={{ color: 'var(--dt-text-muted)', fontSize: 'var(--dt-text-sm)' }}>
            Loading credit report...
          </div>
        ) : creditReport ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--dt-space-4)' }}>
            <div style={{
              padding: 'var(--dt-space-3) var(--dt-space-4)',
              background: 'var(--dt-surface-overlay)',
              borderRadius: 'var(--dt-radius-lg)',
              border: '1px solid var(--dt-border-subtle)'
            }}>
              <p style={{
                fontSize: 'var(--dt-text-xs)',
                color: 'var(--dt-text-muted)',
                textTransform: 'uppercase',
                letterSpacing: 'var(--dt-tracking-wide)',
                fontWeight: 500,
                margin: 0,
                marginBottom: 'var(--dt-space-1)'
              }}>
                Available
              </p>
              <p style={{
                fontFamily: 'var(--dt-font-mono)',
                fontSize: 'var(--dt-text-2xl)',
                fontWeight: 500,
                color: 'var(--dt-trust-community)',
                margin: 0
              }}>
                ${creditReport.totalAvailable.toFixed(2)}
              </p>
            </div>

            <div style={{
              padding: 'var(--dt-space-3) var(--dt-space-4)',
              background: 'var(--dt-surface-overlay)',
              borderRadius: 'var(--dt-radius-lg)',
              border: '1px solid var(--dt-border-subtle)'
            }}>
              <p style={{
                fontSize: 'var(--dt-text-xs)',
                color: 'var(--dt-text-muted)',
                textTransform: 'uppercase',
                letterSpacing: 'var(--dt-tracking-wide)',
                fontWeight: 500,
                margin: 0,
                marginBottom: 'var(--dt-space-1)'
              }}>
                Used
              </p>
              <p style={{
                fontFamily: 'var(--dt-font-mono)',
                fontSize: 'var(--dt-text-2xl)',
                fontWeight: 500,
                color: 'var(--dt-accent)',
                margin: 0
              }}>
                ${creditReport.totalUsed.toFixed(2)}
              </p>
            </div>

            <div style={{
              padding: 'var(--dt-space-3) var(--dt-space-4)',
              background: 'var(--dt-surface-overlay)',
              borderRadius: 'var(--dt-radius-lg)',
              border: '1px solid var(--dt-border-subtle)'
            }}>
              <p style={{
                fontSize: 'var(--dt-text-xs)',
                color: 'var(--dt-text-muted)',
                textTransform: 'uppercase',
                letterSpacing: 'var(--dt-tracking-wide)',
                fontWeight: 500,
                margin: 0,
                marginBottom: 'var(--dt-space-1)'
              }}>
                Active Lines
              </p>
              <p style={{
                fontFamily: 'var(--dt-font-mono)',
                fontSize: 'var(--dt-text-2xl)',
                fontWeight: 500,
                color: 'var(--dt-text-primary)',
                margin: 0
              }}>
                {creditReport.activeLineCount}
              </p>
            </div>

            <div style={{
              padding: 'var(--dt-space-3) var(--dt-space-4)',
              background: 'var(--dt-surface-overlay)',
              borderRadius: 'var(--dt-radius-lg)',
              border: '1px solid var(--dt-border-subtle)'
            }}>
              <p style={{
                fontSize: 'var(--dt-text-xs)',
                color: 'var(--dt-text-muted)',
                textTransform: 'uppercase',
                letterSpacing: 'var(--dt-tracking-wide)',
                fontWeight: 500,
                margin: 0,
                marginBottom: 'var(--dt-space-1)'
              }}>
                Defaults
              </p>
              <p style={{
                fontFamily: 'var(--dt-font-mono)',
                fontSize: 'var(--dt-text-2xl)',
                fontWeight: 500,
                color: creditReport.defaultHistory > 0 ? 'var(--dt-state-error)' : 'var(--dt-trust-community)',
                margin: 0
              }}>
                {creditReport.defaultHistory}
              </p>
            </div>
          </div>
        ) : (
          <div style={{ color: 'var(--dt-text-muted)', fontSize: 'var(--dt-text-sm)' }}>
            No credit report available
          </div>
        )}
      </div>

      {/* Issue Credit Line Form — Only if CREDITOR+ */}
      {canIssueCreditLine && (
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
            Issue Credit Line
          </h3>
          <p style={{
            color: 'var(--dt-text-muted)',
            fontSize: 'var(--dt-text-sm)',
            margin: 0,
            marginBottom: 'var(--dt-space-5)'
          }}>
            Lend cUSD to trusted agents and earn interest on repayment
          </p>

          <form onSubmit={handleIssueCreditLine} style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--dt-space-4)'
          }}>
            {/* Borrower address */}
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
                Borrower Address
              </label>
              <input
                type="text"
                value={borrowerAddr}
                onChange={(e) => setBorrowerAddr(e.target.value)}
                placeholder="0x..."
                style={{
                  width: '100%',
                  padding: 'var(--dt-space-3) var(--dt-space-4)',
                  background: 'var(--dt-surface-overlay)',
                  border: '1px solid var(--dt-border-default)',
                  borderRadius: 'var(--dt-radius-lg)',
                  fontFamily: 'var(--dt-font-mono)',
                  fontSize: 'var(--dt-text-sm)',
                  color: 'var(--dt-text-primary)',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s ease'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = 'var(--dt-accent)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'var(--dt-border-default)'}
              />
            </div>

            {/* Amount slider */}
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
                Amount: <span style={{
                  color: 'var(--dt-accent)',
                  fontFamily: 'var(--dt-font-mono)',
                  fontWeight: 500
                }}>
                  ${creditAmount} cUSD
                </span>
              </label>
              <input
                type="range"
                min={1}
                max={1000}
                step={10}
                value={creditAmount}
                onChange={(e) => setCreditAmount(Number(e.target.value))}
                style={{
                  width: '100%'
                }}
              />
              <p style={{
                fontSize: 'var(--dt-text-xs)',
                color: 'var(--dt-text-muted)',
                margin: 'var(--dt-space-2) 0 0 0'
              }}>
                Max available for your tier
              </p>
            </div>

            {/* Duration selector */}
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
                Duration: <span style={{
                  color: 'var(--dt-accent)',
                  fontFamily: 'var(--dt-font-mono)',
                  fontWeight: 500
                }}>
                  {durationWeeks} weeks
                </span>
              </label>
              <div style={{
                display: 'flex',
                gap: 'var(--dt-space-2)',
                flexWrap: 'wrap'
              }}>
                {[6, 8, 12].map((weeks) => (
                  <button
                    key={weeks}
                    type="button"
                    onClick={() => setDurationWeeks(weeks)}
                    style={{
                      padding: 'var(--dt-space-2) var(--dt-space-3)',
                      borderRadius: 'var(--dt-radius-md)',
                      border: `1px solid ${durationWeeks === weeks ? 'var(--dt-accent)' : 'var(--dt-border-default)'}`,
                      background: durationWeeks === weeks ? 'var(--dt-accent-muted)' : 'var(--dt-surface-overlay)',
                      color: durationWeeks === weeks ? 'var(--dt-accent)' : 'var(--dt-text-secondary)',
                      fontSize: 'var(--dt-text-sm)',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {weeks}w
                  </button>
                ))}
              </div>
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
                ✓ Credit line issued successfully
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
              {isSubmitting ? "Issuing..." : "Issue Credit Line"}
            </button>
          </form>
        </div>
      )}

      {/* Active Credit Lines */}
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
          Active Credit Lines
        </h3>

        {linesLoading ? (
          <div style={{ color: 'var(--dt-text-muted)', fontSize: 'var(--dt-text-sm)' }}>
            Loading credit lines...
          </div>
        ) : creditLines && creditLines.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--dt-space-3)' }}>
            {creditLines.map((line) => (
              <div
                key={line.id}
                style={{
                  padding: 'var(--dt-space-4)',
                  background: 'var(--dt-surface-overlay)',
                  border: '1px solid var(--dt-border-subtle)',
                  borderRadius: 'var(--dt-radius-lg)'
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 'var(--dt-space-2)'
                }}>
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
                      {line.borrower === address ? 'Borrowed from' : 'Lent to'}
                    </p>
                    <p style={{
                      fontFamily: 'var(--dt-font-mono)',
                      fontSize: 'var(--dt-text-sm)',
                      color: 'var(--dt-text-primary)',
                      margin: 0
                    }}>
                      {line.borrower === address ? line.issuer : line.borrower}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{
                      fontFamily: 'var(--dt-font-mono)',
                      fontSize: 'var(--dt-text-lg)',
                      fontWeight: 500,
                      color: 'var(--dt-accent)',
                      margin: 0
                    }}>
                      ${line.amount}
                    </p>
                    <p style={{
                      fontSize: 'var(--dt-text-xs)',
                      color: line.status === 'overdue' ? 'var(--dt-state-error)' : 'var(--dt-text-muted)',
                      margin: 0,
                      marginTop: 2
                    }}>
                      {line.status === 'overdue' && '⚠ '}
                      {line.status.charAt(0).toUpperCase() + line.status.slice(1)}
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{
                  width: '100%',
                  height: 4,
                  borderRadius: 'var(--dt-radius-full)',
                  background: 'var(--dt-surface-base)',
                  overflow: 'hidden',
                  marginBottom: 'var(--dt-space-2)'
                }}>
                  <div style={{
                    width: `${(line.drawn / line.amount) * 100}%`,
                    height: '100%',
                    background: line.status === 'overdue' ? 'var(--dt-state-error)' : 'var(--dt-accent)',
                    transition: 'width 0.3s ease'
                  }} />
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 'var(--dt-text-xs)',
                  color: 'var(--dt-text-muted)',
                  marginBottom: 'var(--dt-space-3)'
                }}>
                  <span>Drawn: ${line.drawn}</span>
                  <span>Remaining: ${line.remaining}</span>
                  <span>Due: {line.dueDate}</span>
                </div>

                {/* Actions */}
                <div style={{
                  display: 'flex',
                  gap: 'var(--dt-space-2)',
                  flexWrap: 'wrap'
                }}>
                  {line.borrower === address && line.status === 'active' && (
                    <>
                      <button style={{
                        padding: 'var(--dt-space-2) var(--dt-space-3)',
                        background: 'var(--dt-accent)',
                        color: '#0A0A0A',
                        border: 'none',
                        borderRadius: 'var(--dt-radius-md)',
                        fontSize: 'var(--dt-text-xs)',
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}>
                        Draw
                      </button>
                      <button style={{
                        padding: 'var(--dt-space-2) var(--dt-space-3)',
                        background: 'var(--dt-trust-community)',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: 'var(--dt-radius-md)',
                        fontSize: 'var(--dt-text-xs)',
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}>
                        Repay
                      </button>
                    </>
                  )}
                  {line.issuer === address && line.status === 'overdue' && (
                    <button style={{
                      padding: 'var(--dt-space-2) var(--dt-space-3)',
                      background: 'var(--dt-state-error)',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: 'var(--dt-radius-md)',
                      fontSize: 'var(--dt-text-xs)',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}>
                      Mark Default
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{
            fontSize: 'var(--dt-text-sm)',
            color: 'var(--dt-text-muted)',
            margin: 0
          }}>
            No active credit lines
          </p>
        )}
      </div>
    </div>
  );
}
