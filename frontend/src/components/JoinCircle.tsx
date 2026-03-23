import { useState } from 'react'
import { useAccount, useConnect } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { MemberAvatar } from './MemberAvatar'

interface JoinCircleProps {
  circleAddress?: string
  onBack?: () => void
}

const DEMO_CIRCLE = {
  address: '0xF9Cc36a52ff067A92180D48d782bf9684A87A12A',
  contribution: '100',
  currency: 'cUSD',
  cycle: 'weekly',
  cycleDuration: 604800,
  groupSize: 5,
  totalDuration: '20 weeks',
  members: [
    { address: '0x76990983caBF0B073a6E3Be8d04Fb590f64FA694', isCreator: true },
    { address: '0x7Fc26418A098337bc6b130c0156f1ff435D97106', isCreator: false },
  ],
  spotsRemaining: 3,
  status: 'FORMING',
}

const SCALLOP_STYLE = `
  .scalloped-bottom::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 0;
    width: 100%;
    height: 6px;
    background-image: radial-gradient(circle at 50% 100%, #f5f4ef 3px, transparent 3px);
    background-size: 12px 6px;
    background-position: center bottom;
    background-repeat: repeat-x;
  }
`

function shortenAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-5)}`
}

function saveAlias(address: string, alias: string): void {
  if (typeof window === 'undefined') return
  const aliases = JSON.parse(localStorage.getItem('memberAliases') || '{}')
  if (alias.trim()) {
    aliases[address.toLowerCase()] = alias.trim()
  } else {
    delete aliases[address.toLowerCase()]
  }
  localStorage.setItem('memberAliases', JSON.stringify(aliases))
}

export function JoinCircle({ circleAddress, onBack }: JoinCircleProps) {
  const { isConnected } = useAccount()
  const { connect, isPending: isConnecting } = useConnect()
  const [copyFeedback, setCopyFeedback] = useState(false)
  const [joiningAlert, setJoiningAlert] = useState(false)
  const [aliases, setAliases] = useState<{ [key: string]: string }>(() => {
    if (typeof window === 'undefined') return {}
    return JSON.parse(localStorage.getItem('memberAliases') || '{}')
  })

  const circle = circleAddress ? DEMO_CIRCLE : DEMO_CIRCLE

  const handleCopyLink = () => {
    const inviteUrl = `${window.location.origin}/#/join/${circle.address}`
    navigator.clipboard.writeText(inviteUrl).then(() => {
      setCopyFeedback(true)
      setTimeout(() => setCopyFeedback(false), 2000)
    })
  }

  const handleJoinClick = () => {
    if (!isConnected) {
      connect({ connector: injected() })
    } else {
      setJoiningAlert(true)
      setTimeout(() => setJoiningAlert(false), 2000)
      console.log('Joining circle:', circle.address)
    }
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: SCALLOP_STYLE }} />
      
      <div style={{
        minHeight: '100vh',
        background: '#f5f4ef',
        color: '#22211f',
        fontFamily: "'Inter', -apple-system, sans-serif",
        paddingTop: 0,
        paddingBottom: '80px',
        position: 'relative',
      }}>
        {/* Header with back button */}
        <header style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          background: '#ffffff',
          borderBottom: '1px solid #e4e2db',
          padding: 'var(--dt-space-2) var(--dt-space-3)',
          boxSizing: 'border-box',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: 48,
        }}>
          {onBack ? (
            <button
              onClick={onBack}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 20,
                color: '#8c8981',
                padding: '8px',
                lineHeight: 1,
              }}
            >
              ←
            </button>
          ) : (
            <div style={{ width: 36 }} />
          )}
          <div style={{
            flex: 1,
            textAlign: 'center',
            fontWeight: 600,
            fontSize: '14px',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#22211f',
          }}>
            ROSA
          </div>
          <div style={{ width: 36 }} />
        </header>

        {/* Main content */}
        <main style={{
          maxWidth: 480,
          margin: '0 auto',
          padding: '24px 20px',
          boxSizing: 'border-box',
          width: '100%',
        }}>
          {/* "You're Invited" header */}
          <div style={{
            textAlign: 'center',
            marginBottom: '48px',
          }}>
            <h1 style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontStyle: 'italic',
              fontSize: '36px',
              fontWeight: 400,
              color: '#22211f',
              margin: 0,
              marginBottom: '8px',
            }}>
              You're Invited
            </h1>
            <p style={{
              fontSize: '13px',
              color: '#8c8981',
              margin: 0,
              letterSpacing: '0.5px',
            }}>
              Join a private savings circle
            </p>
          </div>

          {/* Circle Details Card */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e4e2db',
            padding: '32px 24px',
            position: 'relative',
            marginBottom: '32px',
            borderRadius: '2px',
          }} className="scalloped-bottom">
            <div style={{
              fontSize: '10px',
              letterSpacing: '2px',
              color: '#8c8981',
              textTransform: 'uppercase',
              marginBottom: '20px',
              fontWeight: 600,
            }}>
              Circle Details
            </div>

            {/* Contribution - Large serif number */}
            <div style={{
              marginBottom: '24px',
              paddingBottom: '20px',
              borderBottom: '1px solid #eceae3',
            }}>
              <div style={{
                fontSize: '9px',
                letterSpacing: '1.5px',
                color: '#8c8981',
                textTransform: 'uppercase',
                marginBottom: '8px',
              }}>
                Weekly Contribution
              </div>
              <div style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontStyle: 'italic',
                fontSize: '48px',
                color: '#c85a3f',
                lineHeight: 1,
                margin: 0,
              }}>
                {circle.contribution} <span style={{ fontSize: '20px', color: '#8c8981' }}>{circle.currency}</span>
              </div>
            </div>

            {/* Details grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
              marginBottom: '20px',
            }}>
              <div>
                <div style={{
                  fontSize: '9px',
                  letterSpacing: '1.5px',
                  color: '#8c8981',
                  textTransform: 'uppercase',
                  marginBottom: '6px',
                }}>
                  Group Size
                </div>
                <div style={{
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontStyle: 'italic',
                  fontSize: '20px',
                  color: '#22211f',
                }}>
                  {circle.groupSize}
                </div>
              </div>
              <div>
                <div style={{
                  fontSize: '9px',
                  letterSpacing: '1.5px',
                  color: '#8c8981',
                  textTransform: 'uppercase',
                  marginBottom: '6px',
                }}>
                  Duration
                </div>
                <div style={{
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontStyle: 'italic',
                  fontSize: '20px',
                  color: '#22211f',
                }}>
                  {circle.totalDuration}
                </div>
              </div>
              <div>
                <div style={{
                  fontSize: '9px',
                  letterSpacing: '1.5px',
                  color: '#8c8981',
                  textTransform: 'uppercase',
                  marginBottom: '6px',
                }}>
                  Your Turn
                </div>
                <div style={{
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontStyle: 'italic',
                  fontSize: '20px',
                  color: '#22211f',
                }}>
                  TBD
                </div>
              </div>
              <div>
                <div style={{
                  fontSize: '9px',
                  letterSpacing: '1.5px',
                  color: '#8c8981',
                  textTransform: 'uppercase',
                  marginBottom: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}>
                  <span>◆</span> Network
                </div>
                <div style={{
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontStyle: 'italic',
                  fontSize: '20px',
                  color: '#22211f',
                }}>
                  Celo
                </div>
              </div>
            </div>
          </div>

          {/* Members Section */}
          <div style={{
            marginBottom: '32px',
          }}>
            <div style={{
              fontSize: '10px',
              letterSpacing: '2px',
              color: '#8c8981',
              textTransform: 'uppercase',
              marginBottom: '16px',
              fontWeight: 600,
            }}>
              Members ({circle.members.length}/{circle.groupSize})
            </div>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1px',
              background: '#eceae3',
              border: '1px solid #eceae3',
              marginBottom: '12px',
            }}>
              {circle.members.map((member, idx) => {
                const memberKey = member.address.toLowerCase()
                const alias = aliases[memberKey]
                
                return (
                  <div
                    key={idx}
                    style={{
                      background: '#ffffff',
                      padding: '16px 20px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '12px',
                      fontSize: '12px',
                      fontFamily: "'Inter', -apple-system, sans-serif",
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                      <MemberAvatar address={member.address} size={32} />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                        <input
                          type="text"
                          value={alias || ''}
                          onChange={(e) => {
                            const newAlias = e.target.value
                            saveAlias(member.address, newAlias)
                            setAliases((prev) => ({
                              ...prev,
                              [memberKey]: newAlias,
                            }))
                          }}
                          placeholder={shortenAddress(member.address)}
                          style={{
                            border: '1px solid #e4e2db',
                            borderRadius: '4px',
                            padding: '6px 8px',
                            fontSize: '12px',
                            fontFamily: "'Inter', -apple-system, sans-serif",
                            color: '#22211f',
                            background: '#ffffff',
                            outline: 'none',
                            transition: 'border-color 0.2s ease',
                          }}
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor = '#c85a3f'
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = '#e4e2db'
                          }}
                        />
                        <span style={{
                          fontSize: '10px',
                          color: '#8c8981',
                          letterSpacing: '0.5px',
                        }}>
                          {shortenAddress(member.address)}
                        </span>
                      </div>
                    </div>
                    {member.isCreator && (
                      <span style={{
                        fontSize: '11px',
                        color: '#c85a3f',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                      }}>
                        ★ Creator
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
            <div style={{
              fontSize: '12px',
              color: '#8c8981',
              fontStyle: 'italic',
            }}>
              {circle.spotsRemaining} spot{circle.spotsRemaining !== 1 ? 's' : ''} remaining
            </div>
          </div>

          {/* How It Works */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #eceae3',
            padding: '24px',
            marginBottom: '32px',
            borderRadius: '2px',
          }}>
            <div style={{
              fontSize: '10px',
              letterSpacing: '2px',
              color: '#8c8981',
              textTransform: 'uppercase',
              marginBottom: '16px',
              fontWeight: 600,
            }}>
              How It Works
            </div>
            <ol style={{
              margin: 0,
              paddingLeft: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              fontSize: '13px',
              lineHeight: 1.6,
              color: '#22211f',
            }}>
              <li>Sign in</li>
              <li>Approve your contribution</li>
              <li>ROSA handles contributions, payouts, and trust</li>
            </ol>
          </div>

          {/* Join Button */}
          <button
            onClick={handleJoinClick}
            disabled={isConnecting}
            style={{
              width: '100%',
              background: '#c85a3f',
              color: '#ffffff',
              border: 'none',
              borderRadius: '30px',
              padding: '18px 24px',
              fontSize: '10px',
              fontWeight: 600,
              letterSpacing: '2px',
              textTransform: 'uppercase',
              cursor: isConnecting ? 'not-allowed' : 'pointer',
              opacity: isConnecting ? 0.6 : 1,
              transition: 'all 0.2s ease',
              marginBottom: '20px',
              fontFamily: "'Inter', -apple-system, sans-serif",
            }}
            onMouseDown={(e) => {
              if (!isConnecting) {
                (e.currentTarget as HTMLButtonElement).style.background = '#b34e35'
              }
            }}
            onMouseUp={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = '#c85a3f'
            }}
          >
            {!isConnected ? 'Sign In to Join' : 'JOIN THIS CIRCLE'}
          </button>

          {/* Alert feedback */}
          {joiningAlert && (
            <div style={{
              background: '#eceae3',
              border: '1px solid #e4e2db',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '20px',
              fontSize: '12px',
              color: '#22211f',
              textAlign: 'center',
              animation: 'fadeIn 0.2s ease',
            }}>
              Joining circle...
            </div>
          )}

          {/* Footer Info */}
          <div style={{
            textAlign: 'center',
            borderTop: '1px solid #e4e2db',
            paddingTop: '20px',
            marginBottom: '20px',
          }}>
            <div style={{
              fontSize: '11px',
              color: '#8c8981',
              marginBottom: '12px',
              letterSpacing: '0.5px',
            }}>
              ⚡ Managed by ROSA
            </div>
            <div style={{
              fontSize: '10px',
              color: '#8c8981',
              lineHeight: 1.5,
              marginBottom: '20px',
            }}>
              Managed by ROSA — automated savings agent
            </div>
          </div>

          {/* Copy Link Section */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #eceae3',
            padding: '20px 24px',
            borderRadius: '2px',
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: '9px',
              letterSpacing: '1.5px',
              color: '#8c8981',
              textTransform: 'uppercase',
              marginBottom: '12px',
              fontWeight: 600,
            }}>
              Share This Invite
            </div>
            <button
              onClick={handleCopyLink}
              style={{
                width: '100%',
                background: 'transparent',
                border: '1px solid #e4e2db',
                borderRadius: '8px',
                padding: '12px 16px',
                fontSize: '11px',
                fontWeight: 500,
                letterSpacing: '1px',
                color: copyFeedback ? '#4a7c59' : '#22211f',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontFamily: "'Inter', -apple-system, sans-serif",
              }}
              onMouseDown={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = '#eceae3'
              }}
              onMouseUp={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
              }}
            >
              {copyFeedback ? '✓ Copied to clipboard' : '[Copy Link]'}
            </button>
          </div>
        </main>
      </div>

      {/* Fade-in animation */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  )
}
