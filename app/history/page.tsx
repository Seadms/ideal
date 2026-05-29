import { and, eq, gte, sql } from 'drizzle-orm'
import { db, initDb } from '@/lib/db'
import { habits, habitCompletions, tasks, rewards, rewardRedemptions, bonusTaskSessions, bonusTaskPool } from '@/lib/db/schema'
import { todayString, daysAgoString, formatPoints, categoryEmoji, cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

function heatColor(pts: number): string {
  if (pts === 0) return 'bg-zinc-800/80'
  if (pts < 50) return 'bg-emerald-900'
  if (pts < 150) return 'bg-emerald-700/80'
  if (pts < 300) return 'bg-emerald-600'
  return 'bg-emerald-500'
}

export default async function HistoryPage() {
  await initDb()

  const today = todayString()
  const since60 = daysAgoString(60)
  const since34 = daysAgoString(34)

  // Fetch all history data in parallel
  const [completions, allHabits, completedTasks, allRedemptions, allRewards, bonusSessions, bonusPool] = await Promise.all([
    db.select().from(habitCompletions).where(gte(habitCompletions.completedDate, since60)),
    db.select().from(habits),
    // All completed tasks (active or soft-deleted) completed in the last 60 days
    db.select().from(tasks).where(
      and(eq(tasks.isCompleted, true), sql`${tasks.completedAt} >= ${since60}`),
    ),
    db.select().from(rewardRedemptions),
    db.select({ id: rewards.id, title: rewards.title, category: rewards.category }).from(rewards),
    db.select().from(bonusTaskSessions).where(
      and(eq(bonusTaskSessions.state, 'completed'), gte(bonusTaskSessions.date, since60)),
    ),
    db.select().from(bonusTaskPool),
  ])

  const bonusPoolMap = new Map(bonusPool.map(t => [t.id, t]))

  const habitMap = new Map(allHabits.map(h => [h.id, h]))
  const rewardMap = new Map(allRewards.map(r => [r.id, r]))

  // ── Heatmap ────────────────────────────────────────────────────────────────
  const heatDays = Array.from({ length: 35 }, (_, i) => daysAgoString(34 - i))
  const dailyPts = new Map<string, number>()
  const addPts = (date: string, pts: number) =>
    dailyPts.set(date, (dailyPts.get(date) ?? 0) + pts)

  completions
    .filter(c => c.completedDate >= since34)
    .forEach(c => addPts(c.completedDate, c.pointsEarned))
  completedTasks
    .filter(t => t.completedAt && t.completedAt.slice(0, 10) >= since34)
    .forEach(t => addPts(t.completedAt!.slice(0, 10), t.points))
  bonusSessions
    .filter(s => s.date >= since34)
    .forEach(s => addPts(s.date, s.pointsEarned ?? 0))

  // ── Activity list ──────────────────────────────────────────────────────────
  type Entry = {
    kind: 'habit' | 'task' | 'bonus' | 'reward'
    title: string
    category: string
    date: string
    pts: number
    sortKey: string
  }

  const entries: Entry[] = [
    ...completions.map(c => ({
      kind: 'habit' as const,
      title: habitMap.get(c.habitId)?.title ?? 'Unknown habit',
      category: habitMap.get(c.habitId)?.category ?? 'general',
      date: c.completedDate,
      pts: c.pointsEarned,
      sortKey: c.completedDate,
    })),
    ...completedTasks
      .filter(t => !!t.completedAt)
      .map(t => ({
        kind: 'task' as const,
        title: t.title,
        category: t.category,
        date: t.completedAt!.slice(0, 10),
        pts: t.points,
        sortKey: t.completedAt!,
      })),
    ...bonusSessions.map(s => ({
      kind: 'bonus' as const,
      title: bonusPoolMap.get(s.taskId)?.title ?? 'Bonus task',
      category: bonusPoolMap.get(s.taskId)?.category ?? 'general',
      date: s.date,
      pts: s.pointsEarned ?? 0,
      sortKey: s.createdAt,
    })),
    ...allRedemptions
      .filter(r => r.redeemedAt.slice(0, 10) >= since60)
      .map(r => ({
        kind: 'reward' as const,
        title: rewardMap.get(r.rewardId)?.title ?? 'Unknown reward',
        category: rewardMap.get(r.rewardId)?.category ?? 'general',
        date: r.redeemedAt.slice(0, 10),
        pts: r.pointsSpent,
        sortKey: r.redeemedAt,
      })),
  ].sort((a, b) => b.sortKey.localeCompare(a.sortKey))

  // ── Per-habit performance ──────────────────────────────────────────────────
  const activeHabits = allHabits.filter(h => h.isActive)
  const habitPerf = activeHabits
    .map(h => {
      const count = completions.filter(c => c.habitId === h.id).length
      const maxPossible = h.frequencyPerWeek < 7
        ? Math.round(60 / 7 * h.frequencyPerWeek)
        : 60
      return { id: h.id, title: h.title, category: h.category, count, maxPossible }
    })
    .filter(h => h.count > 0)
    .sort((a, b) => (b.count / b.maxPossible) - (a.count / a.maxPossible))

  // ── Totals ─────────────────────────────────────────────────────────────────
  const totalHabitCompletions = completions.length
  const totalTaskCompletions = completedTasks.length
  const habitPtsEarned = completions.reduce((s, c) => s + c.pointsEarned, 0)
  const taskPtsEarned = completedTasks.reduce((s, t) => s + t.points, 0)
  const bonusPtsEarned = bonusSessions.reduce((s, b) => s + (b.pointsEarned ?? 0), 0)
  const totalPtsEarned = habitPtsEarned + taskPtsEarned + bonusPtsEarned
  const totalRedemptions = allRedemptions.length
  const totalPtsSpent = allRedemptions.reduce((s, r) => s + r.pointsSpent, 0)

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-lg font-semibold text-zinc-100">History</h1>
        <p className="text-xs text-zinc-500 mt-0.5">Activity over the last 60 days</p>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Habits done', value: totalHabitCompletions },
          { label: 'Tasks done', value: totalTaskCompletions },
          { label: 'Pts earned', value: formatPoints(totalPtsEarned) },
          { label: 'Pts spent', value: formatPoints(totalPtsSpent) },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2.5 text-center">
            <p className="text-base font-semibold text-zinc-200 tabular-nums">{value}</p>
            <p className="text-[10px] text-zinc-600 mt-0.5 uppercase tracking-wider">{label}</p>
          </div>
        ))}
      </div>

      {/* Heatmap */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Last 35 days</p>
        <div className="grid grid-cols-7 gap-1.5">
          {heatDays.map(date => {
            const pts = dailyPts.get(date) ?? 0
            const isToday = date === today
            return (
              <div
                key={date}
                title={`${date}${pts ? ` · ${pts} pts` : ''}`}
                className={cn(
                  'aspect-square rounded-sm transition-colors',
                  heatColor(pts),
                  isToday && 'ring-1 ring-white/25',
                )}
              />
            )
          })}
        </div>
        <div className="flex items-center justify-end gap-1.5 mt-3">
          <span className="text-[9px] text-zinc-600">Less</span>
          {['bg-zinc-800/80', 'bg-emerald-900', 'bg-emerald-700/80', 'bg-emerald-600', 'bg-emerald-500'].map(cls => (
            <div key={cls} className={cn('h-2.5 w-2.5 rounded-sm', cls)} />
          ))}
          <span className="text-[9px] text-zinc-600">More</span>
        </div>
      </div>

      {/* Per-habit performance */}
      {habitPerf.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Habit Performance (60 days)</h2>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 divide-y divide-zinc-800/60">
            {habitPerf.map(h => {
              const pct = Math.min(Math.round((h.count / h.maxPossible) * 100), 100)
              return (
                <div key={h.id} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-sm text-zinc-300 truncate flex items-center gap-1.5 min-w-0">
                      <span className="shrink-0">{categoryEmoji(h.category)}</span>
                      <span className="truncate">{h.title}</span>
                    </p>
                    <span className="text-xs text-zinc-500 shrink-0 ml-3">
                      {h.count}/{h.maxPossible}d · {pct}%
                    </span>
                  </div>
                  <div className="h-1 w-full rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-zinc-500',
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Activity list */}
      <section>
        <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Recent Activity</h2>
        {entries.length === 0 ? (
          <p className="text-sm text-zinc-600 py-6 text-center">No activity yet.</p>
        ) : (
          <div className="space-y-1.5">
            {entries.map((e) => (
              <div
                key={`${e.kind}-${e.sortKey}-${e.title}`}
                className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3"
              >
                <span className="text-base shrink-0">{categoryEmoji(e.category)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-200 truncate flex items-center gap-1.5">
                    {e.title}
                    {e.kind === 'bonus' && <span className="text-[10px] text-violet-500/70 shrink-0">✦</span>}
                  </p>
                  <p className="text-xs text-zinc-600 mt-0.5">{e.date}</p>
                </div>
                <span className={cn(
                  'text-sm font-semibold tabular-nums shrink-0',
                  e.kind === 'reward' ? 'text-rose-400' : 'text-emerald-400',
                )}>
                  {e.kind === 'reward' ? '−' : '+'}{formatPoints(e.pts)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
