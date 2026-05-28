import { formatPoints } from '@/lib/utils'
import { TrendingUp } from 'lucide-react'

interface WeekSummaryProps {
  habitsCompleted: number
  ptsEarned: number
  tasksCompleted: number
}

export function WeekSummary({ habitsCompleted, ptsEarned, tasksCompleted }: WeekSummaryProps) {
  if (habitsCompleted === 0 && tasksCompleted === 0) return null

  return (
    <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3">
      <TrendingUp size={13} className="text-zinc-500 shrink-0" />
      <p className="text-xs text-zinc-500">
        <span className="text-zinc-300 font-medium">This week</span>
        {habitsCompleted > 0 && (
          <span className="ml-2">
            <span className="text-zinc-200">{habitsCompleted}</span> habit checks
          </span>
        )}
        {ptsEarned > 0 && (
          <span className="ml-2">
            · <span className="text-amber-400">+{formatPoints(ptsEarned)}</span> pts
          </span>
        )}
        {tasksCompleted > 0 && (
          <span className="ml-2">
            · <span className="text-zinc-200">{tasksCompleted}</span> task{tasksCompleted !== 1 ? 's' : ''} done
          </span>
        )}
      </p>
    </div>
  )
}
