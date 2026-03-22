import { useAccount } from 'wagmi'
import { CONTRACT_ADDRESSES } from '../config/wagmi'

interface AgentDashboardProps {
  onTabChange?: (tab: string) => void
}

// Scoped CSS for jagged edge and other pseudo-elements
const STYLE = `
  .jagged-edge {
    position: relative;
    margin: 0 24px;
    height: 30px;
    background-color: #C05227;
    clip-path: polygon(
        0% 0%, 100% 0%, 
        100% 20%, 96% 80%, 92% 30%, 88% 90%, 84% 40%, 80% 85%, 
        76% 25%, 72% 95%, 68% 35%, 64% 80%, 60% 45%, 56% 90%, 
        52% 30%, 48% 85%, 44% 20%, 40% 95%, 36% 40%, 32% 80%, 
        28% 25%, 24% 90%, 20% 35%, 16% 85%, 12% 20%, 8% 95%, 
        4% 30%, 0% 80%
    );
    margin-bottom: 32px;
    z-index: 1;
    margin-top: -1px;
  }

  .pill::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 1px;
    border-bottom: 2px dotted rgba(255,255,255,0.3);
  }
`

export function AgentDashboard(_props?: AgentDashboardProps) {
  const { isConnected } = useAccount()

  const handleSignRelease = () => {
    if (!isConnected) {
      window.alert('Connect wallet to sign')
    } else {
      const circleAddr = CONTRACT_ADDRESSES.demoCircle
      window.alert(`Sign with wallet to release funds from circle ${circleAddr}`)
    }
  }

  const handleAuditTrail = () => {
    console.log('VIEW AUDIT TRAIL clicked')
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLE }} />

      <div style={{
        width: '100%',
        background: '#E4E0D5',
        color: '#2D2B29',
        fontFamily: "'SF Mono', 'Roboto Mono', 'Courier New', Courier, monospace",
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '24px 24px 16px',
          fontSize: '0.65rem',
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: '#2D2B29',
          opacity: 0.8,
        }}>
          CYCLE 04 · DISBURSEMENT PHASE
        </div>

        {/* Primary Card (Rust) */}
        <div style={{
          backgroundColor: '#C05227',
          color: '#F4F0E6',
          margin: '0 24px',
          borderRadius: '20px 20px 0 0',
          position: 'relative',
          padding: '48px 24px 48px',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 2,
        }}>
          {/* Card Icon */}
          <div style={{
            marginBottom: '32px',
          }}>
            <svg
              viewBox="0 0 24 24"
              width="32"
              height="32"
              style={{
                stroke: '#F4F0E6',
                fill: 'none',
                strokeWidth: 1.5,
              }}
            >
              <rect x="3" y="10" width="18" height="11" rx="2"></rect>
              <path d="M7 10V6a5 5 0 0 1 10 0v4"></path>
              <circle cx="12" cy="15" r="1" fill="currentColor"></circle>
            </svg>
          </div>

          {/* Card Subtitle */}
          <div style={{
            fontSize: '0.75rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom: '16px',
            fontFamily: "'SF Mono', 'Roboto Mono', 'Courier New', Courier, monospace",
          }}>
            AI AGENT ACTION
          </div>

          {/* Card Title */}
          <div style={{
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
            fontSize: '2.5rem',
            lineHeight: 1.1,
            fontWeight: 400,
            textTransform: 'uppercase',
            letterSpacing: '0.02em',
            marginBottom: '24px',
            width: '90%',
          }}>
            AUTHORIZE<br />
            PAYOUT
          </div>

          {/* Card Description */}
          <div style={{
            fontFamily: "'SF Mono', 'Roboto Mono', 'Courier New', Courier, monospace",
            fontSize: '0.85rem',
            lineHeight: 1.5,
            maxWidth: '85%',
            marginBottom: '24px',
          }}>
            ROSA has verified all contributions. The pool is ready for rotation payout to the next member.
          </div>

          {/* Card Meta */}
          <div style={{
            fontStyle: 'italic',
            fontSize: '0.75rem',
            lineHeight: 1.4,
            opacity: 0.9,
          }}>
            Part of the Trust Protocol ·<br />
            Zero-Knowledge Verification +<br />
            Automated Escrow
          </div>

          {/* Card ID Vertical */}
          <div style={{
            position: 'absolute',
            right: '24px',
            top: '50%',
            transform: 'translateY(-50%) rotate(-90deg)',
            transformOrigin: 'right center',
            fontSize: '0.65rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            opacity: 0.8,
          }}>
            #SYS-POOL-892
          </div>
        </div>

        {/* Jagged Edge Divider */}
        <div className="jagged-edge"></div>

        {/* Agent Status Label */}
        <div style={{
          padding: '0 24px',
          fontSize: '0.65rem',
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: '#2D2B29',
          marginBottom: '8px',
          opacity: 0.8,
        }}>
          AGENT STATUS
        </div>

        {/* Status Pills */}
        <div style={{
          display: 'flex',
          gap: '8px',
          padding: '0 24px',
          marginBottom: '48px',
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}>
          <div style={{
            flex: 1,
            minWidth: '140px',
            height: '60px',
            borderRadius: '20px 20px 0 0',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            fontSize: '0.7rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: '#F4F0E6',
            position: 'relative',
            overflow: 'hidden',
            backgroundColor: '#B7B0A2',
          }} className="pill pill-taupe">
            <span style={{
              opacity: 0.7,
              fontSize: '0.6rem',
              marginBottom: '2px',
            }}>LIQUIDITY</span>
            <span style={{
              fontWeight: 'bold',
            }}>100% SECURED</span>
          </div>

          <div style={{
            flex: 1,
            minWidth: '140px',
            height: '60px',
            borderRadius: '20px 20px 0 0',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            fontSize: '0.7rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: '#F4F0E6',
            position: 'relative',
            overflow: 'hidden',
            backgroundColor: '#6B7059',
          }} className="pill pill-green">
            <span style={{
              opacity: 0.7,
              fontSize: '0.6rem',
              marginBottom: '2px',
            }}>YOUR TURN</span>
            <span style={{
              fontWeight: 'bold',
            }}>CYCLE 07</span>
          </div>
        </div>

        {/* Action Area */}
        <div style={{
          padding: '0 24px',
          marginTop: 'auto',
          marginBottom: '48px',
        }}>
          {/* Effort Text */}
          <div style={{
            textAlign: 'center',
            fontSize: '0.7rem',
            lineHeight: 1.6,
            marginBottom: '24px',
            opacity: 0.8,
            paddingTop: '24px',
            borderTop: '1px dotted #2D2B29',
          }}>
            ⚄ ~2 min review · Cryptographic signature required · Funds clear in 4 hours
          </div>

          {/* Sign & Release Button */}
          <button
            onClick={handleSignRelease}
            style={{
              width: '100%',
              backgroundColor: '#2D2B29',
              color: '#E4E0D5',
              border: 'none',
              borderRadius: '99px',
              padding: '20px',
              fontFamily: "'SF Mono', 'Roboto Mono', 'Courier New', Courier, monospace",
              fontWeight: 'bold',
              fontSize: '0.85rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'opacity 0.2s ease',
            }}
            onMouseDown={(e) => {
              (e.currentTarget as HTMLButtonElement).style.opacity = '0.8'
            }}
            onMouseUp={(e) => {
              (e.currentTarget as HTMLButtonElement).style.opacity = '1'
            }}
          >
            SIGN &amp; RELEASE FUNDS
          </button>

          {/* Audit Trail Link */}
          <div
            onClick={handleAuditTrail}
            style={{
              textAlign: 'center',
              fontSize: '0.7rem',
              marginTop: '24px',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              opacity: 0.8,
              cursor: 'pointer',
            }}
          >
            VIEW AUDIT TRAIL ↗
          </div>
        </div>
      </div>
    </>
  )
}
