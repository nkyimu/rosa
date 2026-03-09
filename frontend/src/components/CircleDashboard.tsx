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

  return (
    <div className="rounded-xl border border-gray-800 p-4" style={{ background: '#23242A' }}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-white font-semibold">Circle #{circle.id}</h3>
          <p className="text-gray-400 text-xs">
            {circle.members}/{circle.maxMembers} members · {circle.cycle}
          </p>
        </div>
        <span className="text-sm" style={{ color: '#35D07F' }}>
          +{circle.yieldEarned} cUSD
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 rounded-full bg-gray-700 mb-3">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${progress}%`, background: '#35D07F' }}
        />
      </div>
      <p className="text-xs text-gray-500 mb-3">
        Round {circle.currentRound} of {circle.totalRounds} · {circle.contribution} cUSD/cycle
      </p>

      {/* Actions */}
      <div className="flex gap-2">
        {!circle.contributed && (
          <button
            className="flex-1 text-sm font-medium rounded-lg py-2 transition hover:opacity-90"
            style={{ background: '#35D07F', color: '#1A1B1F' }}
          >
            Contribute {circle.contribution} cUSD
          </button>
        )}
        {circle.yourTurn && (
          <button
            className="flex-1 text-sm font-medium rounded-lg py-2 border transition hover:opacity-90"
            style={{ borderColor: '#35D07F', color: '#35D07F' }}
          >
            🎉 Claim Payout
          </button>
        )}
        {circle.contributed && !circle.yourTurn && (
          <div className="flex-1 text-center text-sm text-gray-400 py-2">
            ✅ Contributed · Waiting for round
          </div>
        )}
      </div>
    </div>
  )
}

export function CircleDashboard() {
  const { isConnected } = useAccount()

  if (!isConnected) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400 text-lg">Connect your wallet to see circles</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-bold text-lg">My Circles</h2>
        <span className="text-xs text-gray-400">{MOCK_CIRCLES.length} active</span>
      </div>

      {MOCK_CIRCLES.map((circle) => (
        <CircleCard key={circle.id} circle={circle} />
      ))}

      {MOCK_CIRCLES.length === 0 && (
        <div className="text-center py-12 rounded-xl border border-dashed border-gray-700">
          <p className="text-gray-400 mb-2">No circles yet</p>
          <p className="text-gray-500 text-sm">Submit a save intent to get matched!</p>
        </div>
      )}
    </div>
  )
}
