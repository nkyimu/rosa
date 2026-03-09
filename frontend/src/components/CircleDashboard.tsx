import { useAccount } from 'wagmi'

interface MockCircle {
  id: number
  members: number
  maxMembers: number
  currentRound: number
  totalRounds: number
  contribution: string
  cycle: string
  yourTurn: boolean
  contributed: boolean
  yieldEarned: string
}

const MOCK_CIRCLES: MockCircle[] = [
  {
    id: 1,
    members: 8,
    maxMembers: 10,
    currentRound: 3,
    totalRounds: 10,
    contribution: '5.00',
    cycle: 'Weekly',
    yourTurn: false,
    contributed: true,
    yieldEarned: '0.42',
  },
  {
    id: 2,
    members: 5,
    maxMembers: 5,
    currentRound: 1,
    totalRounds: 5,
    contribution: '20.00',
    cycle: 'Monthly',
    yourTurn: true,
    contributed: false,
    yieldEarned: '1.15',
  },
]

function CircleCard({ circle }: { circle: MockCircle }) {
  const progress = (circle.currentRound / circle.totalRounds) * 100
  const isActive = circle.yourTurn

  return (
    <div style={{
      background: isActive ? 'rgba(14,11,7,0.85)' : 'var(--dt-surface-raised)',
      backdropFilter: isActive ? 'blur(24px) saturate(180%)' : 'none',
      border: `1px solid ${isActive ? 'var(--dt-accent)' : 'var(--dt-border-default)'}`,
      borderRadius: 'var(--dt-radius-xl)',
      padding: 'var(--dt-space-5)',
      boxShadow: isActive ? 'var(--dt-shadow-glow-gold)' : 'var(--dt-shadow-sm)',
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
            }}>Circle #{circle.id}</h3>
            <p style={{
              color: 'var(--dt-text-muted)', fontSize: 'var(--dt-text-xs)', marginTop: 'var(--dt-space-1)',
              margin: 0
            }}>
              {circle.members}/{circle.maxMembers} members · {circle.cycle}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{
              fontFamily: 'var(--dt-font-mono)',
              color: 'var(--dt-trust-community)', fontWeight: 600,
              fontSize: 'var(--dt-text-sm)'
            }}>+{circle.yieldEarned} cUSD</span>
            <p style={{ color: 'var(--dt-text-muted)', fontSize: 'var(--dt-text-xs)', margin: 0, marginTop: 2 }}>yield</p>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{
          width: '100%', height: 6, borderRadius: 'var(--dt-radius-full)',
          background: 'var(--dt-surface-overlay)', marginBottom: 'var(--dt-space-2)', overflow: 'hidden'
        }}>
          <div style={{
            width: `${progress}%`, height: '100%', borderRadius: 'inherit',
            background: 'linear-gradient(90deg, var(--dt-trust-reliability) 0%, var(--dt-trust-community) 100%)',
            transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)'
          }} />
        </div>

        <p style={{
          color: 'var(--dt-text-muted)', fontSize: 'var(--dt-text-xs)', marginBottom: 'var(--dt-space-4)',
          margin: 0,
          marginTop: 'var(--dt-space-1)'
        }}>
          Round {circle.currentRound} of {circle.totalRounds} · {circle.contribution} cUSD/cycle
        </p>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 'var(--dt-space-2)' }}>
          {!circle.contributed && (
            <button style={{
              flex: 1, padding: 'var(--dt-space-3) var(--dt-space-4)', borderRadius: 'var(--dt-radius-lg)',
              background: 'var(--dt-trust-community)', color: '#0A0804',
              fontWeight: 600, fontSize: 'var(--dt-text-sm)', border: 'none', cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}>
              Contribute ${circle.contribution}
            </button>
          )}
          {circle.yourTurn && (
            <button style={{
              flex: 1, padding: 'var(--dt-space-3) var(--dt-space-4)', borderRadius: 'var(--dt-radius-lg)',
              background: 'var(--dt-accent)', color: '#0A0804',
              fontWeight: 700, fontSize: 'var(--dt-text-sm)', border: 'none', cursor: 'pointer',
              boxShadow: 'var(--dt-shadow-glow-gold)',
              letterSpacing: 'var(--dt-tracking-wide)',
              transition: 'all 0.2s ease',
              animation: 'dt-glow-pulse 2.5s ease-in-out infinite'
            }}>
              ✦ Claim Payout
            </button>
          )}
          {circle.contributed && !circle.yourTurn && (
            <div style={{
              flex: 1, textAlign: 'center', padding: 'var(--dt-space-3)',
              color: 'var(--dt-trust-community)', fontSize: 'var(--dt-text-sm)',
              fontFamily: 'var(--dt-font-mono)'
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
        }}>{MOCK_CIRCLES.length} ACTIVE</span>
      </div>

      {MOCK_CIRCLES.map((circle) => (
        <CircleCard key={circle.id} circle={circle} />
      ))}

      {MOCK_CIRCLES.length === 0 && (
        <div style={{
          textAlign: 'center', padding: 'var(--dt-space-12) var(--dt-space-4)',
          borderRadius: 'var(--dt-radius-xl)',
          border: '1px dashed var(--dt-border-default)'
        }}>
          <p style={{ color: 'var(--dt-text-secondary)', marginBottom: 'var(--dt-space-1)', margin: 0 }}>
            No circles yet
          </p>
          <p style={{ color: 'var(--dt-text-muted)', fontSize: 'var(--dt-text-sm)', margin: 0 }}>
            Submit a save intent to get matched!
          </p>
        </div>
      )}
    </div>
  )
}
