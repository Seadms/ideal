// ── Assistant: day data + morning briefing ────────────────────────────────────
// Pulls everything "today" from Canvas, the calendar, and the app's own
// habits/tasks into one structure, and composes the morning briefing push
// (Gemini when available, deterministic template otherwise).

import { GoogleGenerativeAI } from '@google/generative-ai'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { habits, habitCompletions, scheduledTasks, scheduledTaskCompletions, tasks } from '@/lib/db/schema'
import { getCalendarEvents, calendarConfigured, type CalEvent } from '@/lib/calendar'
import { getPlannerItems, getMissingSubmissions, canvasConfigured, cleanCourseName, type CanvasItem, type MissingSubmission } from '@/lib/canvas'
import { todayString, timeInAppTz, dateInAppTz } from '@/lib/utils'

export interface DayData {
  todayEvents: CalEvent[]
  dueToday: CanvasItem[]
  dueSoon: CanvasItem[]          // after today, within 7 days
  missing: MissingSubmission[]
  pendingHabitCount: number
  scheduledToday: string[]       // pending scheduled-task titles
  openTaskCount: number
}

export async function getDayData(opts: { fresh?: boolean } = {}): Promise<DayData> {
  const now = new Date()
  const endOfWindow = new Date(now.getTime() + 24 * 3600_000)
  const today = todayString()
  const todayDow = new Date().getDay()

  const [events, planner, missing] = await Promise.all([
    calendarConfigured() ? getCalendarEvents(now, endOfWindow, opts) : Promise.resolve([]),
    canvasConfigured() ? getPlannerItems(7, opts) : Promise.resolve([]),
    canvasConfigured() ? getMissingSubmissions(opts) : Promise.resolve([]),
  ])

  const todayEvents = events.filter(e => dateInAppTz(e.start) === today)

  const unsubmitted = planner.filter(i => !i.submitted && i.dueAt)
  const dueToday = unsubmitted.filter(i => dateInAppTz(new Date(i.dueAt!)) === today)
  const dueSoon = unsubmitted.filter(i => {
    const d = dateInAppTz(new Date(i.dueAt!))
    return d > today
  })

  // Pending daily habits (weekly-quota habits aren't required daily)
  const dailyHabits = await db.select().from(habits)
    .where(and(eq(habits.isActive, true), eq(habits.frequencyPerWeek, 7)))
  const doneToday = await db.select().from(habitCompletions)
    .where(eq(habitCompletions.completedDate, today))
  const doneIds = new Set(doneToday.map(c => c.habitId))
  const pendingHabitCount = dailyHabits.filter(h => !doneIds.has(h.id)).length

  // Today's pending scheduled tasks
  const allScheduled = await db.select().from(scheduledTasks).where(eq(scheduledTasks.isActive, true))
  const schedDone = await db.select().from(scheduledTaskCompletions)
    .where(eq(scheduledTaskCompletions.completedDate, today))
  const schedDoneIds = new Set(schedDone.map(c => c.taskId))
  const scheduledToday = allScheduled.filter(t => {
    if (schedDoneIds.has(t.id)) return false
    if (t.recurrenceType === 'once') return !!t.scheduledDate && t.scheduledDate <= today
    const days = (t.daysOfWeek ?? '').split(',').map(Number)
    return days.includes(todayDow)
  }).map(t => t.title)

  const openTasks = await db.select().from(tasks)
    .where(and(eq(tasks.isActive, true), eq(tasks.isCompleted, false)))

  return { todayEvents, dueToday, dueSoon, missing, pendingHabitCount, scheduledToday, openTaskCount: openTasks.length }
}

function fallbackBriefing(d: DayData): string {
  const parts: string[] = []
  if (d.todayEvents.length > 0) {
    const first = d.todayEvents.find(e => !e.allDay)
    parts.push(`${d.todayEvents.length} event${d.todayEvents.length > 1 ? 's' : ''} today` +
      (first ? `, first at ${timeInAppTz(first.start)}` : ''))
  }
  if (d.dueToday.length > 0) {
    parts.push(`${d.dueToday.length} Canvas item${d.dueToday.length > 1 ? 's' : ''} due today`)
  }
  if (d.missing.length > 0) parts.push(`${d.missing.length} missing submission${d.missing.length > 1 ? 's' : ''}`)
  if (d.pendingHabitCount > 0) parts.push(`${d.pendingHabitCount} daily habit${d.pendingHabitCount > 1 ? 's' : ''} to hit`)
  if (d.scheduledToday.length > 0) parts.push(`${d.scheduledToday.length} chores on deck`)
  return parts.length > 0 ? parts.join(' · ') : 'Clear schedule today. Pick something great to build.'
}

export async function composeBriefing(d: DayData): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return fallbackBriefing(d)

  const eventLines = d.todayEvents.map(e =>
    `- ${e.allDay ? 'all day' : timeInAppTz(e.start)}: ${e.title}${e.location ? ` @ ${e.location}` : ''}`).join('\n')
  const dueLines = d.dueToday.map(i =>
    `- ${i.title} (${i.courseName ? cleanCourseName(i.courseName) : 'Canvas'}, due ${timeInAppTz(new Date(i.dueAt!))})`).join('\n')
  const soonLines = d.dueSoon.slice(0, 5).map(i =>
    `- ${i.title} (${i.courseName ? cleanCourseName(i.courseName) : 'Canvas'}, ${new Date(i.dueAt!).toLocaleDateString('en-US', { weekday: 'short' })})`).join('\n')

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
    const prompt = `You are a sharp, encouraging personal assistant writing a MORNING BRIEFING push notification for a CS student at UNC Charlotte.

TODAY'S CALENDAR:
${eventLines || '(nothing scheduled)'}

CANVAS DUE TODAY:
${dueLines || '(nothing due today)'}

DUE LATER THIS WEEK:
${soonLines || '(nothing)'}

MISSING SUBMISSIONS: ${d.missing.length}
PENDING DAILY HABITS: ${d.pendingHabitCount}
CHORES TODAY: ${d.scheduledToday.join(', ') || 'none'}

Write the briefing as 2-4 short sentences, max 320 characters total. Lead with the most time-critical thing. Be concrete with times and course names. No greetings, no emojis, no markdown, no bullet points, no em dashes. If there are missing submissions, mention them firmly.`

    const result = await model.generateContent(prompt)
    const text = result.response.text().trim()
    return text.length > 5 && text.length < 500 ? text : fallbackBriefing(d)
  } catch {
    return fallbackBriefing(d)
  }
}
