import { formatPoints, parseUtcDateTime } from '@/lib/utils'
import { Clock } from 'lucide-react'

interface Redemption {
  id: string
  rewardTitle: string
  pointsSpent: number
  redeemedAt: string
}

interface RedemptionHistoryProps {
  redemptions: Redemption[]
}

export function RedemptionHistory({ redemptions }: RedemptionHistoryProps) {
  if (redemptions.length === 0) return null

  return (
    <section className="mt-4">
      <div className="flex items-center gap-2 mb-3">
        <Clock size={13} className="text-zinc-500" />
        <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          Redemption History
        </h2>
      </div>
      <div className="space-y-1.5">
        {redemptions.map(r => (
          <div
            key={r.id}
            className="flex items-center justify-between rounded-xl border border-zinc-800/60 bg-zinc-900/30 px-4 py-3"
          >
            <div>
              <p className="text-sm text-zinc-200">{r.rewardTitle}</p>
              <p className="text-xs text-zinc-600 mt-0.5">
                {parseUtcDateTime(r.redeemedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </p>
            </div>
            <span className="text-sm font-medium text-rose-400">−{formatPoints(r.pointsSpent)}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
