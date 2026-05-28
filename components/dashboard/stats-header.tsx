import { calculateLevel, formatPoints, dayLabel, cn } from '@/lib/utils'
import type { UserStats } from '@/lib/db/schema'
import { Flame, Star, Zap } from 'lucide-react'
import { FreezeStreakButton } from './freeze-streak-button'

interface StatsHeaderProps {
  stats: UserStats
  last7DaysStatus: { date: string; active: boolean; isToday: boolean }[]
  todayAlreadyActive: boolean
}

export function StatsHeader({ stats, last7DaysStatus, todayAlreadyActive }: StatsHeaderProps) {
  const { level, progress, pointsIntoLevel, pointsNeeded } = calculateLevel(stats.totalPointsEarned)

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        {/* Points */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Zap size={13} className="text-amber-400" />
            <span className="text-xs text-zinc-500 uppercase tracking-wider">Points</span>
          </div>
          <p className="text-2xl font-semibold text-amber-400 tabular-nums">
            {formatPoints(stats.currentPoints)}
          </p>
          <p className="text-xs text-zinc-600 mt-0.5">
            {formatPoints(stats.totalPointsEarned)} lifetime
          </p>
        </div>

        {/* Level */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Star size={13} className="text-violet-400" />
            <span className="text-xs text-zinc-500 uppercase tracking-wider">Level</span>
          </div>
          <p className="text-2xl font-semibold text-violet-400 tabular-nums">{level}</p>
          <p className="text-xs text-zinc-600 mt-0.5">
            {formatPoints(pointsIntoLevel)} / {formatPoints(pointsNeeded)}
          </p>
        </div>

        {/* Streak */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Flame size={13} className={stats.currentStreak > 0 ? 'text-emerald-400' : 'text-zinc-600'} />
            <span className="text-xs text-zinc-500 uppercase tracking-wider">Streak</span>
          </div>
          <p className={cn(
            'text-2xl font-semibold tabular-nums',
            stats.currentStreak > 0 ? 'text-emerald-400' : 'text-zinc-600',
          )}>
            {stats.currentStreak}
          </p>

          {last7DaysStatus.length > 0 ? (
            <div className="flex items-end gap-1 mt-1.5">
              {last7DaysStatus.map(({ date, active, isToday }) => (
                <div key={date} className="flex flex-col items-center gap-0.5">
                  <div className={cn(
                    'h-2 w-2 rounded-full transition-colors',
                    active ? 'bg-emerald-400' : 'bg-zinc-700',
                    isToday && !active && 'ring-1 ring-emerald-600',
                  )} />
                  <span className="text-[9px] text-zinc-700 leading-none">{dayLabel(date)[0]}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-600 mt-0.5">best: {stats.longestStreak}d</p>
          )}

          <FreezeStreakButton todayAlreadyActive={todayAlreadyActive} />
        </div>
      </div>

      {/* XP bar */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-zinc-500">Level {level}</span>
          <span className="text-xs text-zinc-500">Level {level + 1}</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-600 to-violet-400 transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-zinc-600 mt-1.5 text-center">
          {formatPoints(pointsNeeded - pointsIntoLevel)} pts to next level
        </p>
      </div>
    </div>
  )
}
