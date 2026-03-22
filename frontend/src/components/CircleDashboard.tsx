import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { erc20Abi, maxUint256 } from 'viem'
import { CONTRACT_ADDRESSES } from '../config/wagmi'
import { SaveCircleABI } from '../abis/SaveCircle'
import { getPrivacyMode } from '../utils/privacy'
import { PrivacyBadge } from './PrivacyBadge'
import { AgentStatus } from './AgentStatus'
import { useState } from 'react'

interface ActivityEntry {
  type: 'yield' | 'threshold' | 'endowment'
  date: string
  amount: string
  isPositive: boolean
}

function CircleCard() {
  const { address, isConnected } = useAccount()
  const [isApproving, setIsApproving] = useState(false)
  const [showError, setShowError] = useState('')
  
  const isPrivacyMode = getPrivacyMode(CONTRACT_ADDRESSES.demoCircle)

  const { data: memberCount } = useReadContract({
    address: CONTRACT_ADDRESSES.demoCircle,
    abi: SaveCircleABI,
    functionName: 'getMemberCount',
    query: { enabled: isConnected },
  })

  const { data: contributionAmount } = useReadContract({
    address: CONTRACT_ADDRESSES.demoCircle,
    abi: SaveCircleABI,
    functionName: 'contributionAmount',
    query: { enabled: isConnected },
  })

  // const { data: roundDuration } = useReadContract({
  //   address: CONTRACT_ADDRESSES.demoCircle,
  //   abi: SaveCircleABI,
  //   functionName: 'roundDuration',
  //   query: { enabled: isConnected },
  // })

  const { data: currentRound } = useReadContract({
    address: CONTRACT_ADDRESSES.demoCircle,
    abi: SaveCircleABI,
    functionName: 'currentRound',
    query: { enabled: isConnected },
  })

  // const { data: rotationIndex } = useReadContract({
  //   address: CONTRACT_ADDRESSES.demoCircle,
  //   abi: SaveCircleABI,
  //   functionName: 'rotationIndex',
  //   query: { enabled: isConnected },
  // })

  // const { data: hasContributed } = useReadContract({
  //   address: CONTRACT_ADDRESSES.demoCircle,
  //   abi: SaveCircleABI,
  //   functionName: 'hasClaimedThisRound',
  //   args: address ? [address] : undefined,
  //   query: { enabled: !!address },
  // })

  const { data: isMember } = useReadContract({
    address: CONTRACT_ADDRESSES.demoCircle,
    abi: SaveCircleABI,
    functionName: 'isMember',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })

  const { writeContract: doContribute, isPending: isContributing } = useWriteContract()
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: isContributing ? undefined : undefined,
  })

  const { writeContract: approveToken, isPending: isApprovingToken } = useWriteContract()

  async function handleContribute() {
    if (!address || !contributionAmount) return
    setShowError('')

    try {
      setIsApproving(true)
      approveToken(
        {
          address: CONTRACT_ADDRESSES.cUSD,
          abi: erc20Abi,
          functionName: 'approve',
          args: [CONTRACT_ADDRESSES.demoCircle, maxUint256],
        },
        {
          onSuccess: () => {
            setTimeout(() => {
              doContribute({
                address: CONTRACT_ADDRESSES.demoCircle,
                abi: SaveCircleABI,
                functionName: 'contribute',
              })
              setIsApproving(false)
            }, 500)
          },
          onError: (err: any) => {
            setShowError('Approval failed: ' + (err.message || 'Unknown error'))
            setIsApproving(false)
          },
        }
      )
    } catch (err: any) {
      setShowError('Error: ' + (err.message || 'Unknown error'))
      setIsApproving(false)
    }
  }

  if (!isConnected || !isMember) {
    return (
      <div style={{
        background: 'var(--dt-surface-raised)',
        border: '1px dashed var(--dt-border-default)',
        borderRadius: 'var(--dt-radius-xl)',
        padding: 'var(--dt-space-8)',
        textAlign: 'center',
        color: 'var(--dt-text-muted)',
        fontSize: 'var(--dt-text-base)',
      }}>
        {!isConnected ? 'Connect wallet to join a circle' : 'Submit an intent to get matched into a circle'}
      </div>
    )
  }

  const members = Number(memberCount ?? 0n)
  // const contribution = contributionAmount ? Number(formatUnits(contributionAmount, 18)) : 0
  const round = Number(currentRound ?? 0n)
  // const rotation = Number(rotationIndex ?? 0n)
  // const yourTurn = rotation === Number(address ? BigInt(address) % BigInt(members || 1) : 0)

  // Mock balance and APY for demo
  const mockBalance = 2440.12
  const mockAPY = 2.8

  // Mock recent activity
  const mockActivity: ActivityEntry[] = [
    { type: 'yield', date: 'Today', amount: '+45.32', isPositive: true },
    { type: 'threshold', date: '2 days ago', amount: '-10.00', isPositive: false },
    { type: 'endowment', date: '1 week ago', amount: '-250.00', isPositive: false },
  ]

  // const displayContribution = isPrivacyMode ? 'Private' : `$${contribution.toFixed(2)}`

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--dt-space-6)'
    }}>
      {/* Variant Design: Financial Dashboard */}
      
      {/* Header with Circle Name */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 'var(--dt-space-2)'
      }}>
        <div>
          <h2 style={{
            fontFamily: 'var(--dt-font-display)',
            fontSize: 'var(--dt-text-2xl)',
            fontWeight: 400,
            color: 'var(--dt-text-primary)',
            margin: 0,
            marginBottom: 'var(--dt-space-1)'
          }}>Demo Circle</h2>
          <p style={{
            color: 'var(--dt-text-muted)',
            fontSize: 'var(--dt-text-sm)',
            margin: 0
          }}>{members} members · Round {round}</p>
        </div>
        <PrivacyBadge isPrivate={isPrivacyMode} />
      </div>

      {/* Large Balance Display */}
      <div style={{
        background: 'var(--dt-surface-raised)',
        border: '1px solid var(--dt-border-default)',
        borderRadius: 'var(--dt-radius-2xl)',
        padding: 'var(--dt-space-8)',
        boxShadow: 'var(--dt-shadow-card)',
        textAlign: 'center'
      }}>
        <p style={{
          color: 'var(--dt-text-muted)',
          fontSize: 'var(--dt-text-sm)',
          margin: '0 0 var(--dt-space-3) 0'
        }}>Your Balance</p>
        
        <div style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'center',
          gap: 'var(--dt-space-2)',
          marginBottom: 'var(--dt-space-6)'
        }}>
          <span style={{
            fontFamily: 'var(--dt-font-display)',
            fontSize: 'var(--dt-text-4xl)',
            fontWeight: 400,
            color: 'var(--dt-text-primary)'
          }}>
            $
          </span>
          <span style={{
            fontFamily: 'var(--dt-font-mono)',
            fontSize: 'var(--dt-text-4xl)',
            fontWeight: 500,
            color: 'var(--dt-text-primary)'
          }}>
            {mockBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        {/* APY Indicator Pill */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 'var(--dt-space-2)',
          padding: 'var(--dt-space-2) var(--dt-space-4)',
          background: 'rgba(53, 208, 127, 0.1)',
          border: '1px solid var(--dt-trust-community)',
          borderRadius: 'var(--dt-radius-full)',
          color: 'var(--dt-trust-community)',
          fontFamily: 'var(--dt-font-body)',
          fontWeight: 600,
          fontSize: 'var(--dt-text-sm)'
        }}>
          <span>↗️</span>
          <span>+{mockAPY}% APY • Staked in Pool</span>
        </div>
      </div>

      {/* Deposit / Withdraw Buttons */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 'var(--dt-space-3)'
      }}>
        <button
          onClick={handleContribute}
          disabled={isApproving || isApprovingToken || isContributing || isConfirming}
          style={{
            padding: 'var(--dt-space-4)',
            background: 'var(--dt-accent)',
            border: 'none',
            borderRadius: 'var(--dt-radius-lg)',
            color: '#FFF',
            fontFamily: 'var(--dt-font-body)',
            fontWeight: 600,
            fontSize: 'var(--dt-text-sm)',
            cursor: isApproving || isApprovingToken || isContributing ? 'not-allowed' : 'pointer',
            opacity: isApproving || isApprovingToken || isContributing ? 0.6 : 1,
            transition: 'all var(--dt-duration-fast) var(--dt-ease-out)',
            minHeight: 44
          }}
          onMouseEnter={(e) => {
            if (!isApproving && !isApprovingToken && !isContributing) {
              (e.currentTarget as HTMLButtonElement).style.background = '#E8704D'
            }
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = '#C75B39'
          }}
        >
          {isApproving ? '⏳ Approving...' : isContributing || isConfirming ? '⏳ Contributing...' : '📥 Deposit'}
        </button>

        <button
          style={{
            padding: 'var(--dt-space-4)',
            background: 'transparent',
            border: '1px solid var(--dt-border-default)',
            borderRadius: 'var(--dt-radius-lg)',
            color: 'var(--dt-text-primary)',
            fontFamily: 'var(--dt-font-body)',
            fontWeight: 600,
            fontSize: 'var(--dt-text-sm)',
            cursor: 'pointer',
            transition: 'all var(--dt-duration-fast) var(--dt-ease-out)',
            minHeight: 44
          }}

        >
          📤 Withdraw
        </button>
      </div>

      {/* Error Message */}
      {showError && (
        <div style={{
          background: 'rgba(255, 107, 107, 0.1)',
          border: '1px solid rgba(255, 107, 107, 0.3)',
          borderRadius: 'var(--dt-radius-md)',
          padding: 'var(--dt-space-3) var(--dt-space-4)',
          color: 'var(--dt-state-error)',
          fontSize: 'var(--dt-text-sm)',
        }}>
          {showError}
        </div>
      )}

      {/* Recent Activity Section */}
      <div>
        <h3 style={{
          fontFamily: 'var(--dt-font-display)',
          fontSize: 'var(--dt-text-lg)',
          fontWeight: 400,
          color: 'var(--dt-text-primary)',
          margin: '0 0 var(--dt-space-4) 0'
        }}>Recent Activity</h3>
        
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--dt-space-3)'
        }}>
          {mockActivity.map((entry, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: 'var(--dt-space-4)',
                background: 'var(--dt-surface-raised)',
                border: '1px solid var(--dt-border-default)',
                borderRadius: 'var(--dt-radius-lg)',
                transition: 'all var(--dt-duration-fast) var(--dt-ease-out)'
              }}

            >
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--dt-space-1)'
              }}>
                <span style={{
                  fontFamily: 'var(--dt-font-body)',
                  fontSize: 'var(--dt-text-sm)',
                  fontWeight: 500,
                  color: 'var(--dt-text-primary)'
                }}>
                  {entry.type === 'yield' && '📈 Yield Distribution'}
                  {entry.type === 'threshold' && '⚡ Threshold Entry Fee'}
                  {entry.type === 'endowment' && '🏛️ Endowment Stake'}
                </span>
                <span style={{
                  fontFamily: 'var(--dt-font-body)',
                  fontSize: 'var(--dt-text-xs)',
                  color: 'var(--dt-text-muted)'
                }}>
                  {entry.date}
                </span>
              </div>
              <span style={{
                fontFamily: 'var(--dt-font-mono)',
                fontSize: 'var(--dt-text-sm)',
                fontWeight: 600,
                color: entry.isPositive ? 'var(--dt-trust-community)' : 'var(--dt-state-error)'
              }}>
                {entry.amount}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Contribution Status */}
      {isPrivacyMode && (
        <div style={{
          background: 'rgba(53, 208, 127, 0.1)',
          border: '1px solid var(--dt-trust-community)',
          borderRadius: 'var(--dt-radius-md)',
          padding: 'var(--dt-space-4)',
          fontSize: 'var(--dt-text-sm)',
          color: 'var(--dt-trust-community)'
        }}>
          <p style={{ margin: 0, fontWeight: 500 }}>
            🔒 Privacy mode enabled — amounts hidden
          </p>
        </div>
      )}

      {/* Agent Status */}
      <AgentStatus />
    </div>
  )
}

export function CircleDashboard() {
  const { isConnected } = useAccount()

  if (!isConnected) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--dt-space-16) var(--dt-space-4)' }}>
        <p style={{ color: 'var(--dt-text-secondary)', fontSize: 'var(--dt-text-lg)', margin: 0 }}>
          Connect your wallet to see circles
        </p>
      </div>
    )
  }

  return <CircleCard />
}
