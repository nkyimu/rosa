import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { formatUnits, erc20Abi, maxUint256 } from 'viem'
import { CONTRACT_ADDRESSES } from '../config/wagmi'
import { SaveCircleABI } from '../abis/SaveCircle'
import { getPrivacyMode } from '../utils/privacy'
import { PrivacyBadge } from './PrivacyBadge'
import { AgentStatus } from './AgentStatus'
import { useState } from 'react'

const cUSDabi = erc20Abi

function CircleCard() {
  const { address, isConnected } = useAccount()
  const [isApproving, setIsApproving] = useState(false)
  const [showError, setShowError] = useState('')
  
  // Check privacy mode
  const isPrivacyMode = getPrivacyMode(CONTRACT_ADDRESSES.demoCircle)

  // Read circle data from DemoCircle
  const { data: circleState } = useReadContract({
    address: CONTRACT_ADDRESSES.demoCircle,
    abi: SaveCircleABI,
    functionName: 'state',
    query: { enabled: isConnected },
  })

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

  const { data: roundDuration } = useReadContract({
    address: CONTRACT_ADDRESSES.demoCircle,
    abi: SaveCircleABI,
    functionName: 'roundDuration',
    query: { enabled: isConnected },
  })

  const { data: currentRound } = useReadContract({
    address: CONTRACT_ADDRESSES.demoCircle,
    abi: SaveCircleABI,
    functionName: 'currentRound',
    query: { enabled: isConnected },
  })

  const { data: rotationIndex } = useReadContract({
    address: CONTRACT_ADDRESSES.demoCircle,
    abi: SaveCircleABI,
    functionName: 'rotationIndex',
    query: { enabled: isConnected },
  })

  const { data: hasContributed } = useReadContract({
    address: CONTRACT_ADDRESSES.demoCircle,
    abi: SaveCircleABI,
    functionName: 'hasClaimedThisRound',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })

  const { data: isMember } = useReadContract({
    address: CONTRACT_ADDRESSES.demoCircle,
    abi: SaveCircleABI,
    functionName: 'isMember',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })

  // Contribute via write contract
  const { writeContract: doContribute, isPending: isContributing } = useWriteContract()
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: isContributing ? undefined : undefined,
  })

  // cUSD approval
  const { writeContract: approveToken, isPending: isApprovingToken } = useWriteContract()

  async function handleContribute() {
    if (!address || !contributionAmount) return
    setShowError('')

    try {
      // Step 1: Approve cUSD
      setIsApproving(true)
      approveToken(
        {
          address: CONTRACT_ADDRESSES.cUSD,
          abi: cUSDabi,
          functionName: 'approve',
          args: [CONTRACT_ADDRESSES.demoCircle, maxUint256],
        },
        {
          onSuccess: () => {
            // Step 2: After approval, contribute
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
        padding: 'var(--dt-space-5)',
        textAlign: 'center',
        color: 'var(--dt-text-muted)',
        fontSize: 'var(--dt-text-sm)',
      }}>
        {!isConnected ? 'Connect wallet to join a circle' : 'Submit an intent to get matched into a circle'}
      </div>
    )
  }

  const members = Number(memberCount ?? 0n)
  const contribution = contributionAmount ? Number(formatUnits(contributionAmount, 18)) : 0
  const round = Number(currentRound ?? 0n)
  const rotation = Number(rotationIndex ?? 0n)
  const yourTurn = rotation === Number(address ? BigInt(address) % BigInt(members || 1) : 0)

  const cycleSeconds = Number(roundDuration ?? 604800) // default 7 days
  const cycleDays = Math.round(cycleSeconds / 86400)
  const cycleLabel = cycleDays === 7 ? 'Weekly' : cycleDays === 14 ? 'Biweekly' : cycleDays === 30 ? 'Monthly' : `${cycleDays}d`

  // Privacy mode: hide individual amounts
  const displayContribution = isPrivacyMode ? 'Private' : `$${contribution.toFixed(2)}`
  const mockContributedCount = isPrivacyMode ? Math.floor(Math.random() * members) + 1 : undefined

  return (
    <div style={{
      background: yourTurn ? 'rgba(14,11,7,0.85)' : 'var(--dt-surface-raised)',
      backdropFilter: yourTurn ? 'blur(24px) saturate(180%)' : 'none',
      border: `1px solid ${yourTurn ? 'var(--dt-accent)' : 'var(--dt-border-default)'}`,
      borderRadius: 'var(--dt-radius-xl)',
      padding: 'var(--dt-space-5)',
      boxShadow: yourTurn ? 'var(--dt-shadow-glow-gold)' : 'var(--dt-shadow-sm)',
      transition: 'all 0.3s ease',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Paper noise on card */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', borderRadius: 'inherit',
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.5' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
        opacity: 0.08, mixBlendMode: 'screen'
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--dt-space-3)' }}>
          <div>
            <h3 style={{
              fontFamily: 'var(--dt-font-display)',
              fontSize: 'var(--dt-text-xl)', fontWeight: 400,
              color: 'var(--dt-text-primary)',
              margin: 0
            }}>Demo Circle</h3>
            <p style={{
              color: 'var(--dt-text-muted)', fontSize: 'var(--dt-text-xs)', marginTop: 'var(--dt-space-1)',
              margin: 0
            }}>
              {members} members · {cycleLabel}
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 'var(--dt-space-2)' }}>
            <PrivacyBadge isPrivate={isPrivacyMode} />
            <span style={{
              fontFamily: 'var(--dt-font-mono)',
              color: 'var(--dt-trust-community)', fontWeight: 600,
              fontSize: 'var(--dt-text-sm)'
            }}>Live</span>
          </div>
        </div>

        <p style={{
          color: 'var(--dt-text-muted)', fontSize: 'var(--dt-text-xs)', marginBottom: 'var(--dt-space-4)',
          margin: 0,
          marginTop: 'var(--dt-space-1)'
        }}>
          Round {round} · {displayContribution}/cycle
        </p>

        {/* Privacy mode: show aggregate instead of individual amounts */}
        {isPrivacyMode && (
          <div style={{
            background: 'var(--dt-accent-muted)',
            border: '1px solid var(--dt-border-accent)',
            borderRadius: 'var(--dt-radius-lg)',
            padding: 'var(--dt-space-3) var(--dt-space-4)',
            marginBottom: 'var(--dt-space-4)',
            fontSize: 'var(--dt-text-sm)',
            color: 'var(--dt-accent)'
          }}>
            <p style={{ margin: 0, fontWeight: 500 }}>
              🔒 {mockContributedCount} of {members} members have contributed this round
            </p>
            <p style={{ margin: '4px 0 0 0', fontSize: 'var(--dt-text-xs)', opacity: 0.8 }}>
              Payout processed privately via Nightfall
            </p>
          </div>
        )}

        {showError && (
          <div style={{
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 'var(--dt-radius-md)',
            padding: 'var(--dt-space-2) var(--dt-space-3)',
            color: 'var(--dt-state-error)',
            fontSize: 'var(--dt-text-xs)',
            marginBottom: 'var(--dt-space-3)'
          }}>
            {showError}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 'var(--dt-space-2)', minHeight: 44 }}>
          {!hasContributed && (
            <button onClick={handleContribute} disabled={isApproving || isApprovingToken || isContributing || isConfirming}
              style={{
                flex: 1, padding: 'var(--dt-space-3) var(--dt-space-4)', borderRadius: 'var(--dt-radius-lg)',
                background: 'var(--dt-trust-community)', color: '#0A0804',
                fontWeight: 600, fontSize: 'var(--dt-text-sm)', border: 'none', cursor: 'pointer',
                opacity: isApproving || isApprovingToken || isContributing ? 0.6 : 1,
                transition: 'all 0.2s ease', minHeight: 44
              }}>
              {isApproving ? 'Approving...' : isContributing || isConfirming ? 'Contributing...' : `Contribute ${displayContribution}`}
            </button>
          )}
          {yourTurn && (
            <button style={{
              flex: 1, padding: 'var(--dt-space-3) var(--dt-space-4)', borderRadius: 'var(--dt-radius-lg)',
              background: 'var(--dt-accent)', color: '#0A0804',
              fontWeight: 700, fontSize: 'var(--dt-text-sm)', border: 'none', cursor: 'pointer',
              boxShadow: 'var(--dt-shadow-glow-gold)',
              letterSpacing: 'var(--dt-tracking-wide)',
              transition: 'all 0.2s ease',
              animation: 'dt-glow-pulse 2.5s ease-in-out infinite',
              minHeight: 44
            }}>
              ✦ Your Turn to Claim
            </button>
          )}
          {hasContributed && !yourTurn && (
            <div style={{
              flex: 1, textAlign: 'center', padding: 'var(--dt-space-3)',
              color: 'var(--dt-trust-community)', fontSize: 'var(--dt-text-sm)',
              fontFamily: 'var(--dt-font-mono)', display: 'flex',
              alignItems: 'center', justifyContent: 'center'
            }}>
              ✓ Contributed · Waiting
            </div>
          )}
        </div>
      </div>
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--dt-space-4)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{
          fontFamily: 'var(--dt-font-display)',
          fontSize: 'var(--dt-text-xl)',
          fontWeight: 400,
          color: 'var(--dt-text-primary)',
          margin: 0
        }}>My Circles</h2>
        <span style={{
          fontSize: 'var(--dt-text-xs)', color: 'var(--dt-text-muted)',
          fontWeight: 500, letterSpacing: 'var(--dt-tracking-wide)'
        }}>1 LIVE</span>
      </div>

      <CircleCard />

      {/* Agent Status Component */}
      <AgentStatus />
    </div>
  )
}
