import { and, eq, gte, sql } from 'drizzle-orm'
import { db, initDb } from '@/lib/db'
import { habits, habitCompletions, tasks, bonusTaskSessions, bonusTaskPool, scheduledTasks, scheduledTaskCompletions } from '@/lib/db/schema'
import { todayString, daysAgoString, cn } from '@/lib/utils'
import { CategoryIcon } from '@/components/ui/category-icon'
import { PageHeader } from '@/components/ui/page-header'

export const dynamic = 'force-dynamic'

// Shade by how much got done that day (habits, chores, tasks, bonus — one each).
function heatColor(count: number): string {
  if (count === 0) return 'bg-zinc-800/80'
  if (count < 3) return 'bg-emerald-900'
  if (count < 6) return 'bg-emerald-700/80'
  if (count < 10) return 'bg-emerald-600'
  return 'bg-emerald-500'
}

const DOW_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function friendlyDate(dateStr: string, today: string, yesterday: string): string {
  if (dateStr === today) return 'Today'
  if (dateStr === yesterday) return 'Yesterday'
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
}

export default async function HistoryPage() {
  await initDb()

  const today = todayString()
  const yesterday = daysAgoString(1)
  const since60 = daysAgoString(60)
  const since34 = daysAgoString(34)

  const [completions, allHabits, completedTasks, bonusSessions, bonusPool, schedCompletions, allScheduled] = await Promise.all([
    db.select().from(habitCompletions).where(gte(habitCompletions.completedDate, since60)),
    db.select().from(habits),
    db.select().from(tasks).where(
      and(eq(tasks.isCompleted, true), sql`${tasks.completedAt} >= ${since60}`),
    ),
    db.select().from(bonusTaskSessions).where(
      and(eq(bonusTaskSessions.state, 'completed'), gte(bonusTaskSessions.date, since60)),
    ),
    db.select().from(bonusTaskPool),
    // Recurring chores are a large share of a normal day — without these the
    // heatmap, the feed and the totals all under-report it.
    db.select().from(scheduledTaskCompletions).where(gte(scheduledTaskCompletions.completedDate, since60)),
    db.select().from(scheduledTasks),
  ])

  const bonusPoolMap = new Map(bonusPool.map(t => [t.id, t]))
  const schedMap = new Map(allScheduled.map(t => [t.id, t]))
  const habitMap = new Map(allHabits.map(h => [h.id, h]))

  // ── Heatmap ────────────────────────────────────────────────────────────────
  const heatDays = Array.from({ length: 35 }, (_, i) => daysAgoString(34 - i))
  const dailyCount = new Map<string, number>()
  const bump = (date: string) =>
    dailyCount.set(date, (dailyCount.get(date) ?? 0) + 1)

  completions
    .filter(c => c.completedDate >= since34)
    .forEach(c => bump(c.completedDate))
  completedTasks
    .filter(t => t.completedAt && t.completedAt.slice(0, 10) >= since34)
    .forEach(t => bump(t.completedAt!.slice(0, 10)))
  bonusSessions
    .filter(s => s.date >= since34)
    .forEach(s => bump(s.date))
  schedCompletions
    .filter(c => c.completedDate >= since34)
    .forEach(c => bump(c.completedDate))

  // Day-of-week column labels aligned to the grid start day
  const startDow = new Date(since34 + 'T12:00:00').getDay()
  const colLabels = Array.from({ length: 7 }, (_, i) => DOW_SHORT[(startDow + i) % 7])

  // ── Activity grouped by date ───────────────────────────────────────────────
  type Entry = {
    kind: 'habit' | 'task' | 'bonus'
    title: string
    category: string
    date: string
    sortKey: string
  }

  const entries: Entry[] = [
    ...completions.map(c => ({
      kind: 'habit' as const,
      title: habitMap.get(c.habitId)?.title ?? 'Unknown habit',
      category: habitMap.get(c.habitId)?.category ?? 'general',
      date: c.completedDate,
      sortKey: c.completedDate,
    })),
    ...completedTasks
      .filter(t => !!t.completedAt)
      .map(t => ({
        kind: 'task' as const,
        title: t.title,
        category: t.category,
        date: t.completedAt!.slice(0, 10),
        sortKey: t.completedAt!,
      })),
    ...bonusSessions.map(s => ({
      kind: 'bonus' as const,
      title: bonusPoolMap.get(s.taskId)?.title ?? 'Bonus task',
      category: bonusPoolMap.get(s.taskId)?.category ?? 'general',
      date: s.date,
      sortKey: s.createdAt,
    })),
    ...schedCompletions.map(c => ({
      kind: 'task' as const,
      title: schedMap.get(c.taskId)?.title ?? 'Scheduled task',
      category: schedMap.get(c.taskId)?.category ?? 'home',
      date: c.completedDate,
      sortKey: c.createdAt,
    })),
  ].sort((a, b) => b.sortKey.localeCompare(a.sortKey))

  // Group by date
  const grouped = new Map<string, Entry[]>()
  for (const e of entries) {
    if (!grouped.has(e.date)) grouped.set(e.date, [])
    grouped.get(e.date)!.push(e)
  }
  const groupedDates = [...grouped.keys()].sort((a, b) => b.localeCompare(a))

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
  const totalTaskCompletions = completedTasks.length + schedCompletions.length
  const totalBonus = bonusSessions.length

  return (
    <div className="space-y-6">
      <div>
        <PageHeader title="History" ghost="60 days" sub="Activity over the last 60 days" />
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Habits done', value: totalHabitCompletions },
          { label: 'Tasks done', value: totalTaskCompletions },
          { label: 'Bonus done', value: totalBonus },
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
        {/* Day-of-week column labels */}
        <div className="grid grid-cols-7 gap-1.5 mb-1">
          {colLabels.map((label, i) => (
            <p key={i} className="text-[9px] text-zinc-600 text-center uppercase tracking-wide">{label.slice(0, 2)}</p>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {heatDays.map(date => {
            const count = dailyCount.get(date) ?? 0
            const isToday = date === today
            const d = new Date(date + 'T12:00:00')
            const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
            return (
              <div
                key={date}
                title={`${label}${count ? ` · ${count} done` : ''}`}
                className={cn(
                  'aspect-square rounded-sm transition-colors',
                  heatColor(count),
                  isToday && 'ring-1 ring-white/30',
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
                      <CategoryIcon category={h.category} size={12} />
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

      {/* Activity — grouped by date */}
      <section>
        <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Recent Activity</h2>
        {groupedDates.length === 0 ? (
          <p className="text-sm text-zinc-600 py-6 text-center">No activity yet.</p>
        ) : (
          <div className="space-y-4">
            {groupedDates.map(date => {
              const dayEntries = grouped.get(date)!
              return (
                <div key={date}>
                  {/* Date header */}
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs font-semibold text-zinc-400">
                      {friendlyDate(date, today, yesterday)}
                    </p>
                    <p className="text-xs tabular-nums text-zinc-600">
                      {dayEntries.length} done
                    </p>
                  </div>
                  {/* Entries for this day */}
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 divide-y divide-zinc-800/60 overflow-hidden">
                    {dayEntries.map((e, i) => (
                      <div
                        key={`${e.kind}-${e.sortKey}-${i}`}
                        className="flex items-center gap-3 px-4 py-2.5"
                      >
                        <CategoryIcon category={e.category} size={14} className="text-zinc-600" />
                        <p className="flex-1 min-w-0 text-sm text-zinc-300 truncate flex items-center gap-1.5">
                          {e.title}
                          {e.kind === 'bonus' && <span className="text-[10px] text-violet-500/70 shrink-0">✦ bonus</span>}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
