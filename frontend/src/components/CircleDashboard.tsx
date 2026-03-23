import { useState } from 'react'
import { useAccount, useBalance } from 'wagmi'
import { formatUnits } from 'viem'
import { CONTRACT_ADDRESSES, celoSepolia } from '../config/wagmi'

interface CircleDashboardProps {
  onTabChange?: (tab: string) => void
}

// Scoped CSS for pseudo-elements (scalloped border)
const STYLE = `
  .balance-card-scallop::after {
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

const DEMO_CIRCLE_ADDRESS = '0xF9Cc36a52ff067A92180D48d782bf9684A87A12A';

export function CircleDashboard(_props?: CircleDashboardProps) {
  const { address, isConnected } = useAccount()
  const [copyFeedback, setCopyFeedback] = useState(false)

  // Fetch cUSD balance
  const { data: cUSDBalance } = useBalance({
    address,
    token: CONTRACT_ADDRESSES.cUSD,
    chainId: celoSepolia.id,
    query: { enabled: !!address },
  })

  const balanceDisplay = cUSDBalance 
    ? Number(formatUnits(cUSDBalance.value, 18)).toLocaleString('en-US', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      })
    : '—.——'

  const handleShareCircle = () => {
    const inviteUrl = `${window.location.origin}/#/join/${DEMO_CIRCLE_ADDRESS}`
    navigator.clipboard.writeText(inviteUrl).then(() => {
      setCopyFeedback(true)
      setTimeout(() => setCopyFeedback(false), 2000)
    })
  }

  // Activity list with tx hash references
  const activityItems = [
    {
      name: 'Circle Yield Distro',
      meta: 'OCT 12 • SYSTEM',
      hash: '0x406…cbeb',
      amount: '+$12.40',
      isPositive: true,
    },
    {
      name: 'Threshold Entry Fee',
      meta: 'OCT 08 • VOID CIRCLE',
      hash: '0x54c7…453',
      amount: '-$50.00',
      isPositive: false,
    },
    {
      name: 'Endowment Stake',
      meta: 'OCT 01 • TREASURY',
      hash: '0xaefd…107a',
      amount: '-$500.00',
      isPositive: false,
    },
  ]

  const handleDeposit = () => {
    console.log('Deposit clicked')
  }

  const handleWithdraw = () => {
    console.log('Withdraw clicked')
  }

  if (!isConnected) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '40px 24px',
      }}>
        <p style={{
          fontSize: '16px',
          color: '#8c8981',
          margin: 0,
        }}>
          Connect wallet to view circle
        </p>
      </div>
    )
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLE }} />
      
      <div style={{
        width: '100%',
        background: '#f5f4ef',
        color: '#22211f',
        fontFamily: "'Inter', -apple-system, sans-serif",
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          marginBottom: '40px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}>
          <div>
            <h1 style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontStyle: 'italic',
              color: '#c85a3f',
              fontSize: '24px',
              fontWeight: 400,
              margin: 0,
            }}>
              Circles.
            </h1>
            <div style={{
              fontSize: '9px',
              letterSpacing: '1.5px',
              color: '#8c8981',
              textTransform: 'uppercase',
              marginTop: '4px',
            }}>
              MEMBER 0922 / TREASURY
            </div>
          </div>
          <div style={{
            width: '32px',
            height: '32px',
            border: '1px solid #eceae3',
            borderRadius: '50%',
          }} />
        </div>

        {/* Balance Card with Scalloped Border */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #eceae3',
          padding: '32px 24px',
          position: 'relative',
          marginBottom: '32px',
          borderRadius: '2px',
        }} className="balance-card-scallop">
          <div style={{
            fontSize: '10px',
            letterSpacing: '2px',
            color: '#8c8981',
            textTransform: 'uppercase',
            marginBottom: '8px',
          }}>
            Personal Endowment
          </div>
          <div style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontStyle: 'italic',
            fontSize: '42px',
            color: '#22211f',
            marginBottom: '20px',
          }}>
            ${balanceDisplay}
          </div>
          <div style={{
            display: 'flex',
            gap: '8px',
          }}>
            <div style={{
              fontSize: '10px',
              color: '#c85a3f',
            }}>
              +2.4% APY
            </div>
            <div style={{
              fontSize: '10px',
              color: '#8c8981',
            }}>
              STAKED IN POOL
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          marginBottom: '40px',
        }}>
          <button
            onClick={handleDeposit}
            style={{
              background: '#ffffff',
              border: '1px solid #eceae3',
              padding: '16px',
              textAlign: 'center',
              textDecoration: 'none',
              color: '#22211f',
              fontSize: '10px',
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseDown={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = '#eceae3'
            }}
            onMouseUp={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = '#ffffff'
            }}
          >
            Deposit
          </button>
          <button
            onClick={handleWithdraw}
            style={{
              background: '#ffffff',
              border: '1px solid #eceae3',
              padding: '16px',
              textAlign: 'center',
              textDecoration: 'none',
              color: '#22211f',
              fontSize: '10px',
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseDown={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = '#eceae3'
            }}
            onMouseUp={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = '#ffffff'
            }}
          >
            Withdraw
          </button>
        </div>

        {/* Recent Activity Section Title */}
        <div style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontStyle: 'italic',
          fontSize: '20px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span>Recent Activity</span>
          <button
            onClick={handleShareCircle}
            style={{
              background: 'none',
              border: 'none',
              fontFamily: "'Inter', -apple-system, sans-serif",
              fontSize: '9px',
              fontStyle: 'normal',
              letterSpacing: '1.5px',
              color: copyFeedback ? '#4a7c59' : '#8c8981',
              textTransform: 'uppercase',
              cursor: 'pointer',
              padding: '4px 8px',
              transition: 'color 0.2s ease',
            }}
            title="Copy invite link to clipboard"
          >
            {copyFeedback ? '✓ COPIED' : 'Share Invite'}
          </button>
        </div>

        {/* Activity List */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1px',
          background: '#eceae3',
          border: '1px solid #eceae3',
          marginBottom: '100px',
        }}>
          {activityItems.map((item, idx) => (
            <div
              key={idx}
              style={{
                background: '#ffffff',
                padding: '20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}>
                <div style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#22211f',
                }}>
                  {item.name}
                </div>
                <div style={{
                  fontSize: '10px',
                  color: '#8c8981',
                }}>
                  {item.meta}
                </div>
              </div>
              <div style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontStyle: 'italic',
                fontSize: '16px',
                color: item.isPositive ? '#4a7c59' : '#22211f',
              }}>
                {item.amount}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
