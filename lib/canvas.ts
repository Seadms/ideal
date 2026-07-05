// ── Canvas LMS client ─────────────────────────────────────────────────────────
// Talks to the Canvas REST API with a personal access token (Account →
// Settings → New Access Token). Read-only: courses, planner items (assignments,
// quizzes, discussions with due dates), and missing submissions.
//
// All fetches use Next's data cache with a short revalidate window so page
// loads don't hammer Canvas; `fresh: true` bypasses it for the cron tick.

const BASE_URL = (process.env.CANVAS_BASE_URL ?? 'https://uncc.instructure.com').replace(/\/$/, '')
const TOKEN = process.env.CANVAS_API_TOKEN

export function canvasConfigured(): boolean {
  return !!TOKEN
}

export interface CanvasCourse {
  id: number
  name: string
  courseCode: string
}

export type PlannerItemType =
  | 'assignment' | 'quiz' | 'discussion_topic' | 'calendar_event'
  | 'announcement' | 'planner_note' | 'wiki_page' | 'assessment_request'

export interface CanvasItem {
  id: string             // '<type>-<plannable_id>' — stable dedupe key
  type: PlannerItemType
  title: string
  courseId: number | null
  courseName: string | null
  dueAt: string | null   // ISO 8601 UTC from Canvas
  pointsPossible: number | null
  htmlUrl: string | null
  submitted: boolean
}

export interface MissingSubmission {
  id: number
  name: string
  courseId: number
  dueAt: string | null
  pointsPossible: number | null
  htmlUrl: string | null
}

interface FetchOpts { fresh?: boolean }

async function canvasFetch<T>(path: string, opts: FetchOpts = {}): Promise<T[]> {
  if (!TOKEN) return []
  const results: T[] = []
  let url: string | null = `${BASE_URL}/api/v1${path}${path.includes('?') ? '&' : '?'}per_page=100`

  // Follow Link-header pagination, capped defensively.
  for (let page = 0; url && page < 5; page++) {
    const res: Response = await fetch(url, {
      headers: { Authorization: `Bearer ${TOKEN}` },
      ...(opts.fresh ? { cache: 'no-store' as const } : { next: { revalidate: 300 } }),
    })
    if (!res.ok) {
      console.error(`Canvas API ${res.status} for ${path}`)
      return results
    }
    const batch = (await res.json()) as T[]
    results.push(...Array.isArray(batch) ? batch : [])

    const link = res.headers.get('link') ?? ''
    const next = link.split(',').find(part => part.includes('rel="next"'))
    url = next ? (next.match(/<([^>]+)>/)?.[1] ?? null) : null
  }
  return results
}

export async function getCourses(opts: FetchOpts = {}): Promise<CanvasCourse[]> {
  interface Raw {
    id: number; name?: string; course_code?: string
    access_restricted_by_date?: boolean
    concluded?: boolean
    term?: { start_at?: string | null; end_at?: string | null } | null
  }
  const raw = await canvasFetch<Raw>(
    '/courses?enrollment_state=active&state[]=available&include[]=term&include[]=concluded', opts)
  const now = new Date().toISOString()
  return raw
    .filter(c =>
      !c.access_restricted_by_date && c.name &&
      // Canvas keeps finished courses "active" forever unless the instructor
      // concludes them — only real, in-term classes count. Courses without
      // term dates (orientation/resource pages in the Default Term) are noise.
      !c.concluded &&
      !!c.term?.end_at && c.term.end_at > now,
    )
    .map(c => ({ id: c.id, name: c.name!, courseCode: c.course_code ?? '' }))
}

// Course ids the student is actually taking right now — used to scope
// planner items and missing submissions to current classes.
async function currentCourseIds(opts: FetchOpts = {}): Promise<Set<number>> {
  return new Set((await getCourses(opts)).map(c => c.id))
}

// Planner items: everything Canvas shows in a student's to-do timeline.
export async function getPlannerItems(daysAhead = 14, opts: FetchOpts = {}): Promise<CanvasItem[]> {
  const start = new Date()
  start.setDate(start.getDate() - 1) // catch things due earlier today
  const end = new Date()
  end.setDate(end.getDate() + daysAhead)

  interface Raw {
    plannable_type: PlannerItemType
    plannable_id: number
    course_id?: number | null
    context_name?: string | null
    html_url?: string | null
    plannable?: {
      title?: string; name?: string; due_at?: string | null
      todo_date?: string | null; points_possible?: number | null
    }
    plannable_date?: string | null
    submissions?: { submitted?: boolean; graded?: boolean } | false
  }

  const [raw, courseIds] = await Promise.all([
    canvasFetch<Raw>(
      `/planner/items?start_date=${start.toISOString()}&end_date=${end.toISOString()}`, opts),
    currentCourseIds(opts),
  ])

  return raw
    .filter(i => i.plannable_type !== 'announcement') // due-date work only
    .filter(i => i.course_id == null || courseIds.has(i.course_id)) // current classes only
    .map(i => {
      const rawTitle = i.plannable?.title ?? i.plannable?.name ?? 'Untitled'
      return {
      id: `${i.plannable_type}-${i.plannable_id}`,
      type: i.plannable_type,
      // Course calendar events are often named with the full registrar string
      // ("202660-Summer 2026-ITSC-4155-080-…") — shorten to the course code.
      title: /^\d{6}-/.test(rawTitle) ? `${cleanCourseName(rawTitle)} class event` : rawTitle,
      courseId: i.course_id ?? null,
      courseName: i.context_name ?? null,
      dueAt: i.plannable?.due_at ?? i.plannable?.todo_date ?? i.plannable_date ?? null,
      pointsPossible: i.plannable?.points_possible ?? null,
      htmlUrl: i.html_url ? (i.html_url.startsWith('http') ? i.html_url : `${BASE_URL}${i.html_url}`) : null,
      submitted: typeof i.submissions === 'object' && !!i.submissions?.submitted,
      }
    })
    .sort((a, b) => (a.dueAt ?? '9999').localeCompare(b.dueAt ?? '9999'))
}

export async function getMissingSubmissions(opts: FetchOpts = {}): Promise<MissingSubmission[]> {
  interface Raw {
    id: number; name?: string; course_id: number
    due_at?: string | null; points_possible?: number | null; html_url?: string | null
  }
  const [raw, courseIds] = await Promise.all([
    canvasFetch<Raw>('/users/self/missing_submissions?filter[]=submittable', opts),
    currentCourseIds(opts),
  ])
  return raw.filter(a => courseIds.has(a.course_id)).map(a => ({
    id: a.id,
    name: a.name ?? 'Untitled',
    courseId: a.course_id,
    dueAt: a.due_at ?? null,
    pointsPossible: a.points_possible ?? null,
    htmlUrl: a.html_url ?? null,
  }))
}

// Strip the registrar noise from UNCC course names ("202680-Fall 2026-ITSC-4155-…").
export function cleanCourseName(name: string): string {
  const m = name.match(/([A-Z]{3,4})[- ](\d{4})/)
  if (m) return `${m[1]} ${m[2]}`
  return name.length > 28 ? name.slice(0, 28) + '…' : name
}
