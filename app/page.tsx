import { Suspense } from 'react'
import { and, asc, eq, gte } from 'drizzle-orm'
import { db } from '@/lib/db'
import { habits, habitCompletions, tasks, userStats, scheduledTasks, scheduledTaskCompletions } from '@/lib/db/schema'
import { seedDatabase } from '@/lib/db/seed'
import { checkStreakOnLoad } from '@/lib/actions/habits'
import {
  todayString, daysAgoString, getLast7Days, getLast7DaysStatus,
  calculateHabitStreak, getWeekStart,
} from '@/lib/utils'
import { StatsHeader } from '@/components/dashboard/stats-header'
import { WeekSummary } from '@/components/dashboard/week-summary'
import { MvdToggle } from '@/components/dashboard/mvd-toggle'
import { HabitItem } from '@/components/dashboard/habit-item'
import { TaskItem } from '@/components/dashboard/task-item'
import { DashboardActions } from '@/components/dashboard/dashboard-actions'
import { ClearCompletedButton } from '@/components/dashboard/clear-completed-button'
import { StreakAtRisk } from '@/components/dashboard/streak-at-risk'
import { ScheduledSection } from '@/components/dashboard/scheduled-section'
import { TodaySchedule, TodayScheduleSkeleton } from '@/components/dashboard/today-schedule'
import { WeekStrip } from '@/components/dashboard/week-strip'
import { KMark } from '@/components/ui/k-mark'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ mvd?: string }>
}

async function DashboardContent({ mvdMode }: { mvdMode: boolean }) {
  await seedDatabase()
  await checkStreakOnLoad()

  const today = todayString()
  const yearAgo = daysAgoString(365)

  // Habits — sorted by user-defined sort order
  const allHabits = await db.select().from(habits)
    .where(
      mvdMode
        ? and(eq(habits.isActive, true), eq(habits.isMinimumViable, true))
        : eq(habits.isActive, true),
    )
    .orderBy(asc(habits.sortOrder))

  // All completions for streaks & week stats (last year is plenty)
  const allCompletions = await db.select().from(habitCompletions)
    .where(gte(habitCompletions.completedDate, yearAgo))

  // Tasks
  const allTasks = await db.select().from(tasks)
    .where(mvdMode
      ? and(eq(tasks.isActive, true), eq(tasks.isCompleted, false))
      : eq(tasks.isActive, true),
    )

  // Scheduled tasks
  const todayDow = new Date().getDay() // 0=Sun … 6=Sat
  const allScheduledTasks = await db.select().from(scheduledTasks)
    .where(eq(scheduledTasks.isActive, true))
  const todayScheduledCompletions = await db.select().from(scheduledTaskCompletions)
    .where(eq(scheduledTaskCompletions.completedDate, today))
  const completedScheduledIds = new Set(todayScheduledCompletions.map(c => c.taskId))

  // Which scheduled tasks are visible today
  const visibleScheduled = allScheduledTasks.filter(t => {
    if (t.recurrenceType === 'once') {
      return !!t.scheduledDate && t.scheduledDate <= today
    }
    // weekly: check if today's day-of-week is in the list
    const days = (t.daysOfWeek ?? '').split(',').map(Number).filter(n => !isNaN(n))
    return days.includes(todayDow)
  })
  const pendingScheduled = visibleScheduled.filter(t => !completedScheduledIds.has(t.id))
  const completedScheduled = visibleScheduled.filter(t => completedScheduledIds.has(t.id))

  // Stats
  const statsRows = await db.select().from(userStats).where(eq(userStats.id, 1))
  const stats = statsRows[0] ?? {
    id: 1, totalPointsEarned: 0, totalPointsSpent: 0, currentPoints: 0,
    currentStreak: 0, longestStreak: 0, lastActiveDate: null, createdAt: today,
  }

  // ── Derived data ────────────────────────────────────────────────────────────
  const todayCompletions = allCompletions.filter(c => c.completedDate === today)
  const completedHabitIds = new Set(todayCompletions.map(c => c.habitId))

  const pendingHabits = allHabits.filter(h => !completedHabitIds.has(h.id))
  const completedHabits = allHabits.filter(h => completedHabitIds.has(h.id))

  // Sort active tasks: overdue first, then by due date, then undated
  const activeTasks = allTasks
    .filter(t => !t.isCompleted)
    .sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0
      if (!a.dueDate) return 1
      if (!b.dueDate) return -1
      return a.dueDate.localeCompare(b.dueDate)
    })
  const completedTasks = allTasks.filter(t => t.isCompleted)

  // Points earned today (habits + tasks)
  const habitPtsToday = todayCompletions.reduce((s, c) => s + c.pointsEarned, 0)
  const taskPtsToday = completedTasks
    .filter(t => t.completedAt?.startsWith(today))
    .reduce((s, t) => s + t.points, 0)
  const scheduledPtsToday = todayScheduledCompletions.reduce((s, c) => s + c.pointsEarned, 0)
  const pointsToday = habitPtsToday + taskPtsToday + scheduledPtsToday

  // Whether today is already credited (freeze or full MVD complete)
  const todayAlreadyActive = stats.lastActiveDate === today

  // MVD complete check
  const mvdHabitIds = allHabits.filter(h => h.isMinimumViable).map(h => h.id)
  const mvdComplete = mvdHabitIds.length > 0 && mvdHabitIds.every(id => completedHabitIds.has(id))

  // 7-day streak dots
  const last7DaysStatus = getLast7DaysStatus(
    allHabits.filter(h => h.isMinimumViable).map(h => h.id),
    allCompletions,
  )

  // Per-habit streaks (respects frequencyPerWeek)
  const habitStreaks = new Map(allHabits.map(h => [h.id, calculateHabitStreak(h.id, allCompletions, h.frequencyPerWeek)]))

  // Weekly completion counts per habit (for this week's progress display)
  const thisWeekStart = getWeekStart(today)
  const weeklyCompletionCounts = new Map<string, number>()
  for (const c of allCompletions) {
    if (c.completedDate >= thisWeekStart) {
      weeklyCompletionCounts.set(c.habitId, (weeklyCompletionCounts.get(c.habitId) ?? 0) + 1)
    }
  }

  // Weekly summary (last 7 days)
  const weekStart = getLast7Days()[0]
  const weekHabitPts = allCompletions
    .filter(c => c.completedDate >= weekStart)
    .reduce((s, c) => s + c.pointsEarned, 0)
  const weekHabitCount = allCompletions.filter(c => c.completedDate >= weekStart).length
  const weekTasksDone = allTasks.filter(t =>
    t.isCompleted && t.completedAt && t.completedAt.slice(0, 10) >= weekStart
  ).length
  const weekTaskPts = allTasks
    .filter(t => t.isCompleted && t.completedAt && t.completedAt.slice(0, 10) >= weekStart)
    .reduce((s, t) => s + t.points, 0)

  return (
    <div className="space-y-6 animate-fade-in">
      <StatsHeader
        stats={stats}
        todayAlreadyActive={todayAlreadyActive}
        habitsDone={completedHabits.length}
        habitsTotal={allHabits.length}
        mvdDone={mvdHabitIds.filter(id => completedHabitIds.has(id)).length}
        mvdTotal={mvdHabitIds.length}
      />

      <WeekStrip days={last7DaysStatus} />

      <StreakAtRisk currentStreak={stats.currentStreak} todayAlreadyActive={todayAlreadyActive} />

      <WeekSummary
        habitsCompleted={weekHabitCount}
        ptsEarned={weekHabitPts + weekTaskPts}
        tasksCompleted={weekTasksDone}
      />

      {pointsToday > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-lime-400/15 bg-lime-400/5 px-4 py-3">
          <KMark size="sm" />
          <p className="text-sm text-lime-200">
            <span className="font-semibold">+{pointsToday} kayd points</span> today
            {mvdComplete && (
              <span className="ml-2 text-emerald-400 font-medium">· MVD complete ✓</span>
            )}
          </p>
        </div>
      )}

      {/* Today's schedule — calendar events + Canvas deadlines */}
      {!mvdMode && (
        <Suspense fallback={<TodayScheduleSkeleton />}>
          <TodaySchedule />
        </Suspense>
      )}

      <Suspense>
        <MvdToggle />
      </Suspense>

      {/* Habits */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Daily Habits
            </h2>
            {mvdMode && (
              <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5">
                MVD only
              </span>
            )}
          </div>
          <span className="text-xs text-zinc-600">{completedHabits.length} / {allHabits.length}</span>
        </div>
        <div className="space-y-2">
          {pendingHabits.map(h => {
            const idx = allHabits.findIndex(a => a.id === h.id)
            return (
              <HabitItem key={h.id} habit={h} completedToday={false}
                streakDays={habitStreaks.get(h.id) ?? 0}
                weeklyCount={weeklyCompletionCounts.get(h.id) ?? 0}
                isFirst={idx === 0} isLast={idx === allHabits.length - 1} />
            )
          })}
          {completedHabits.map(h => {
            const idx = allHabits.findIndex(a => a.id === h.id)
            return (
              <HabitItem key={h.id} habit={h} completedToday={true}
                streakDays={habitStreaks.get(h.id) ?? 0}
                weeklyCount={weeklyCompletionCounts.get(h.id) ?? 0}
                isFirst={idx === 0} isLast={idx === allHabits.length - 1} />
            )
          })}
          {allHabits.length === 0 && (
            <p className="text-sm text-zinc-600 py-6 text-center">No habits yet. Add one below.</p>
          )}
        </div>
      </section>

      {/* Scheduled tasks */}
      {!mvdMode && (
        <ScheduledSection
          allTasks={allScheduledTasks}
          pending={pendingScheduled}
          completed={completedScheduled}
          completedIds={[...completedScheduledIds]}
        />
      )}

      {/* Tasks */}
      {!mvdMode && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              One-Off Tasks
            </h2>
            {completedTasks.length > 0 && (
              <ClearCompletedButton count={completedTasks.filter(t => !t.completedAt?.startsWith(today)).length} />
            )}
          </div>
          <div className="space-y-2">
            {activeTasks.map(t => <TaskItem key={t.id} task={t} />)}
            {completedTasks.map(t => <TaskItem key={t.id} task={t} />)}
            {allTasks.length === 0 && (
              <p className="text-sm text-zinc-600 py-6 text-center">No tasks yet. Add one below.</p>
            )}
          </div>
        </section>
      )}

      <DashboardActions />
    </div>
  )
}

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams
  return <DashboardContent mvdMode={params.mvd === '1'} />
}
