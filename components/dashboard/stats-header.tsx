import { calculateLevel, formatPoints, cn } from '@/lib/utils'
import type { UserStats } from '@/lib/db/schema'
import { Flame } from 'lucide-react'
import { FreezeStreakButton } from './freeze-streak-button'
import { ActivityRings } from './activity-rings'

interface StatsHeaderProps {
  stats: UserStats
  todayAlreadyActive: boolean
  habitsDone: number
  habitsTotal: number
  choresDone: number
  choresTotal: number
}

const RING = {
  habit: { color: '#fa2d6e', track: 'rgba(250, 45, 110, 0.14)' },
  xp: { color: '#c8f542', track: 'rgba(200, 245, 66, 0.13)' },
  chore: { color: '#2de8d8', track: 'rgba(45, 232, 216, 0.13)' },
}

function StatRow({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-xs text-zinc-500 w-14">{label}</span>
      <span className="font-display text-sm font-semibold text-zinc-200 tabular-nums whitespace-nowrap">{value}</span>
    </div>
  )
}

export function StatsHeader({
  stats, todayAlreadyActive,
  habitsDone, habitsTotal, choresDone, choresTotal,
}: StatsHeaderProps) {
  const { level, progress, pointsIntoLevel, pointsNeeded } = calculateLevel(stats.totalPointsEarned)

  const frac = (done: number, total: number) => (total > 0 ? done / total : 0)

  return (
    <section className="rounded-2xl border border-zinc-800/70 bg-zinc-900/40 p-5">
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:gap-6">
        {/* Rings with the streak at their center */}
        <div className="relative shrink-0">
          <ActivityRings
            size={150}
            rings={[
              { fraction: frac(habitsDone, habitsTotal), ...RING.habit },
              { fraction: progress / 100, ...RING.xp },
              { fraction: frac(choresDone, choresTotal), ...RING.chore },
            ]}
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Flame
              size={14}
              className={stats.currentStreak > 0 ? 'text-ring-habit' : 'text-zinc-700'}
            />
            <span className={cn(
              'font-display text-xl font-bold tabular-nums leading-tight',
              stats.currentStreak > 0 ? 'text-zinc-100' : 'text-zinc-600',
            )}>
              {stats.currentStreak}
            </span>
          </div>
        </div>

        {/* Ring legend with live values */}
        <div className="w-full flex-1 min-w-0 space-y-3">
          <StatRow color={RING.habit.color} label="Habits" value={`${habitsDone}/${habitsTotal}`} />
          <StatRow color={RING.xp.color} label={`Level ${level}`} value={`${formatPoints(pointsIntoLevel)}/${formatPoints(pointsNeeded)} xp`} />
          <StatRow color={RING.chore.color} label="Chores" value={choresTotal > 0 ? `${choresDone}/${choresTotal}` : '—'} />
        </div>
      </div>

      {/* Points balance */}
      <div className="mt-4 flex items-center justify-between border-t border-zinc-800/70 pt-4">
        <div>
          <p className="font-display text-2xl font-bold tabular-nums text-slate-300 leading-none">
            {formatPoints(stats.currentPoints)}
          </p>
          <p className="text-xs text-zinc-600 mt-1">
            points · {formatPoints(stats.totalPointsEarned)} lifetime
          </p>
        </div>
        <FreezeStreakButton todayAlreadyActive={todayAlreadyActive} />
      </div>
    </section>
  )
}
