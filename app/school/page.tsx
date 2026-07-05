import { ExternalLink, AlertTriangle, BookOpen } from 'lucide-react'
import { getCourses, getPlannerItems, getMissingSubmissions, canvasConfigured, cleanCourseName, type CanvasItem } from '@/lib/canvas'
import { todayString, shiftDays, dateInAppTz, timeInAppTz, formatDate, cn } from '@/lib/utils'
import { PageHeader } from '@/components/ui/page-header'

export const dynamic = 'force-dynamic'

// Stable accent per course so items are scannable without reading course names
const COURSE_COLORS = [
  'text-violet-400 bg-violet-500/10 border-violet-500/20',
  'text-sky-400 bg-sky-500/10 border-sky-500/20',
  'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  'text-amber-400 bg-amber-500/10 border-amber-500/20',
  'text-rose-400 bg-rose-500/10 border-rose-500/20',
  'text-teal-400 bg-teal-500/10 border-teal-500/20',
]

function courseColor(courseId: number | null): string {
  if (courseId === null) return COURSE_COLORS[0]
  return COURSE_COLORS[courseId % COURSE_COLORS.length]
}

function ItemRow({ item, urgent }: { item: CanvasItem; urgent?: boolean }) {
  const due = item.dueAt ? new Date(item.dueAt) : null
  return (
    <a
      href={item.htmlUrl ?? '#'}
      target="_blank" rel="noopener noreferrer"
      className={cn(
        'flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors group',
        urgent
          ? 'border-red-500/20 bg-red-500/5 hover:border-red-500/40'
          : 'border-zinc-900 bg-zinc-900/30 hover:border-zinc-700',
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm text-zinc-200 truncate">{item.title}</p>
        <div className="mt-1 flex items-center gap-2">
          {item.courseName && (
            <span className={cn('rounded-full border px-2 py-px text-[10px] font-medium', courseColor(item.courseId))}>
              {cleanCourseName(item.courseName)}
            </span>
          )}
          {due && (
            <span className="text-xs text-zinc-500 tabular-nums">
              {formatDate(dateInAppTz(due))} · {timeInAppTz(due)}
            </span>
          )}
          {item.pointsPossible != null && item.pointsPossible > 0 && (
            <span className="text-xs text-zinc-600">{item.pointsPossible} pts</span>
          )}
        </div>
      </div>
      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-zinc-700 group-hover:text-zinc-500 transition-colors" />
    </a>
  )
}

function Section({ label, count, children }: { label: string; count?: number; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{label}</h2>
        {count !== undefined && <span className="text-xs text-zinc-600">{count}</span>}
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  )
}

export default async function SchoolPage() {
  if (!canvasConfigured()) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader title="School" ghost="Canvas" sub="Canvas courses and deadlines" />
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 px-5 py-6 space-y-4">
          <div className="flex items-center gap-3">
            <BookOpen className="h-5 w-5 text-violet-400" />
            <p className="text-sm font-medium text-zinc-200">Connect Canvas to see your classes here</p>
          </div>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-zinc-400">
            <li>Open <span className="text-zinc-200">uncc.instructure.com</span> → Account → Settings</li>
            <li>Scroll to Approved Integrations and choose <span className="text-zinc-200">+ New Access Token</span></li>
            <li>Copy the token into <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-300">CANVAS_API_TOKEN</code> in <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-300">.env.local</code> (and in Vercel → Project → Environment Variables)</li>
            <li>Restart the app. Courses, assignments, and deadline reminders switch on automatically</li>
          </ol>
        </div>
      </div>
    )
  }

  const [courses, planner, missing] = await Promise.all([
    getCourses(), getPlannerItems(14), getMissingSubmissions(),
  ])

  const today = todayString()
  const tomorrow = shiftDays(today, 1)
  const weekEnd = shiftDays(today, 7)

  const open = planner.filter(i => !i.submitted && i.dueAt)
  const dueToday = open.filter(i => dateInAppTz(new Date(i.dueAt!)) === today)
  const dueTomorrow = open.filter(i => dateInAppTz(new Date(i.dueAt!)) === tomorrow)
  const dueWeek = open.filter(i => {
    const d = dateInAppTz(new Date(i.dueAt!))
    return d > tomorrow && d <= weekEnd
  })
  const dueLater = open.filter(i => dateInAppTz(new Date(i.dueAt!)) > weekEnd)

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="School"
        ghost="Canvas"
        sub={`${courses.length} active course${courses.length === 1 ? '' : 's'} · ${open.length} open item${open.length === 1 ? '' : 's'}`}
      />

      {courses.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {courses.map(c => (
            <span key={c.id} className={cn('rounded-full border px-2.5 py-1 text-xs font-medium', courseColor(c.id))}>
              {cleanCourseName(c.courseCode || c.name)}
            </span>
          ))}
        </div>
      )}

      {missing.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
            <h2 className="text-xs font-semibold text-red-400 uppercase tracking-wider">Missing submissions</h2>
          </div>
          <div className="space-y-2">
            {missing.map(m => (
              <ItemRow key={m.id} urgent item={{
                id: `missing-${m.id}`, type: 'assignment', title: m.name,
                courseId: m.courseId, courseName: courses.find(c => c.id === m.courseId)?.name ?? null,
                dueAt: m.dueAt, pointsPossible: m.pointsPossible, htmlUrl: m.htmlUrl, submitted: false,
              }} />
            ))}
          </div>
        </section>
      )}

      {dueToday.length > 0 && (
        <Section label="Due today" count={dueToday.length}>
          {dueToday.map(i => <ItemRow key={i.id} item={i} urgent />)}
        </Section>
      )}
      {dueTomorrow.length > 0 && (
        <Section label="Due tomorrow" count={dueTomorrow.length}>
          {dueTomorrow.map(i => <ItemRow key={i.id} item={i} />)}
        </Section>
      )}
      {dueWeek.length > 0 && (
        <Section label="This week" count={dueWeek.length}>
          {dueWeek.map(i => <ItemRow key={i.id} item={i} />)}
        </Section>
      )}
      {dueLater.length > 0 && (
        <Section label="Later" count={dueLater.length}>
          {dueLater.map(i => <ItemRow key={i.id} item={i} />)}
        </Section>
      )}

      {open.length === 0 && missing.length === 0 && (
        <p className="rounded-xl border border-zinc-900 px-4 py-6 text-center text-sm text-zinc-600">
          Nothing due in the next two weeks. All caught up.
        </p>
      )}
    </div>
  )
}
