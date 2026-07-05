import Link from 'next/link'
import { CalendarDays, GraduationCap, Settings2 } from 'lucide-react'
import { getCalendarEvents, calendarConfigured } from '@/lib/calendar'
import { getPlannerItems, canvasConfigured, cleanCourseName } from '@/lib/canvas'
import { todayString, dateInAppTz, timeInAppTz, cn } from '@/lib/utils'

interface Entry {
  key: string
  at: Date | null            // null = all-day, pinned to the top
  title: string
  sub: string | null
  kind: 'event' | 'due'
}

// Server component: assembles today's timeline from the calendar feed and
// Canvas due dates. Fetches are cached (revalidate 300) so this stays cheap.
export async function TodaySchedule() {
  const hasCalendar = calendarConfigured()
  const hasCanvas = canvasConfigured()

  if (!hasCalendar && !hasCanvas) {
    return (
      <Link href="/settings" className="flex items-center gap-3 rounded-xl border border-dashed border-zinc-800 px-4 py-3 text-zinc-500 hover:border-zinc-700 hover:text-zinc-400 transition-colors">
        <Settings2 className="h-4 w-4 shrink-0" />
        <p className="text-xs">Connect Canvas and your calendar to see your day here. Set up in Settings.</p>
      </Link>
    )
  }

  const now = new Date()
  const today = todayString()
  const dayEnd = new Date(now.getTime() + 24 * 3600_000)

  const [events, planner] = await Promise.all([
    hasCalendar ? getCalendarEvents(new Date(now.getTime() - 12 * 3600_000), dayEnd) : Promise.resolve([]),
    hasCanvas ? getPlannerItems(1) : Promise.resolve([]),
  ])

  const entries: Entry[] = [
    ...events
      .filter(e => dateInAppTz(e.start) === today)
      .map(e => ({
        key: e.id,
        at: e.allDay ? null : e.start,
        title: e.title,
        sub: e.location,
        kind: 'event' as const,
      })),
    ...planner
      .filter(i => !i.submitted && i.dueAt && dateInAppTz(new Date(i.dueAt)) === today)
      .map(i => ({
        key: i.id,
        at: new Date(i.dueAt!),
        title: i.title,
        sub: i.courseName ? cleanCourseName(i.courseName) : null,
        kind: 'due' as const,
      })),
  ].sort((a, b) => (a.at?.getTime() ?? 0) - (b.at?.getTime() ?? 0))

  if (entries.length === 0) {
    return (
      <section>
        <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Today</h2>
        <p className="text-sm text-zinc-600 rounded-xl border border-zinc-900 px-4 py-3">
          Nothing on the schedule. The day is yours.
        </p>
      </section>
    )
  }

  // Index of the first entry still ahead of now — the "now" rule renders above it.
  const nowIdx = entries.findIndex(e => e.at !== null && e.at > now)

  return (
    <section>
      <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Today</h2>
      <div className="rounded-xl border border-zinc-900 bg-zinc-900/30 px-4 py-3">
        <ol>
          {entries.map((e, i) => {
            const past = e.at !== null && e.at < now
            return (
              <li key={e.key}>
                {i === nowIdx && (
                  <div className="flex items-center gap-2 py-1" aria-label="current time">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                    <span className="h-px flex-1 bg-red-400/40" />
                    <span className="text-[10px] font-medium text-red-400/80 tabular-nums">{timeInAppTz(now)}</span>
                  </div>
                )}
                <div className={cn('flex items-baseline gap-3 py-1.5', past && 'opacity-40')}>
                  <span className="w-16 shrink-0 text-right text-xs tabular-nums text-zinc-500">
                    {e.at ? timeInAppTz(e.at) : 'all day'}
                  </span>
                  {e.kind === 'event'
                    ? <CalendarDays className="h-3.5 w-3.5 shrink-0 translate-y-0.5 text-sky-400/80" />
                    : <GraduationCap className="h-3.5 w-3.5 shrink-0 translate-y-0.5 text-violet-400/80" />}
                  <div className="min-w-0">
                    <p className={cn('text-sm truncate', past ? 'text-zinc-400' : 'text-zinc-200')}>
                      {e.kind === 'due' && <span className="text-violet-400 font-medium">Due: </span>}
                      {e.title}
                    </p>
                    {e.sub && <p className="text-xs text-zinc-600 truncate">{e.sub}</p>}
                  </div>
                </div>
              </li>
            )
          })}
          {nowIdx === -1 && (
            <div className="flex items-center gap-2 py-1" aria-label="current time">
              <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
              <span className="h-px flex-1 bg-red-400/40" />
              <span className="text-[10px] font-medium text-red-400/80 tabular-nums">{timeInAppTz(now)}</span>
            </div>
          )}
        </ol>
      </div>
    </section>
  )
}

export function TodayScheduleSkeleton() {
  return (
    <section>
      <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Today</h2>
      <div className="rounded-xl border border-zinc-900 bg-zinc-900/30 px-4 py-3 space-y-3">
        {[0, 1, 2].map(i => (
          <div key={i} className="flex items-center gap-3 animate-pulse">
            <span className="h-3 w-16 rounded bg-zinc-800/80" />
            <span className="h-3 w-3 rounded bg-zinc-800/80" />
            <span className="h-3 flex-1 max-w-[60%] rounded bg-zinc-800/80" />
          </div>
        ))}
      </div>
    </section>
  )
}
