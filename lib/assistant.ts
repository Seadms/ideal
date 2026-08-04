// ── Assistant: day data + morning briefing ────────────────────────────────────
// Pulls everything "today" from the calendar and the app's own habits/tasks
// into one structure, and composes the morning briefing push (Gemini when
// available, deterministic template otherwise).

import { GoogleGenerativeAI } from '@google/generative-ai'
import { and, desc, eq, gte } from 'drizzle-orm'
import { db } from '@/lib/db'
import { habits, habitCompletions, scheduledTasks, scheduledTaskCompletions, tasks, sleepLogs } from '@/lib/db/schema'
import { getCalendarEvents, calendarConfigured, type CalEvent } from '@/lib/calendar'
import { todayString, daysAgoString, timeInAppTz } from '@/lib/utils'

export interface DayData {
  todayEvents: CalEvent[]
  pendingHabitCount: number
  scheduledToday: string[]       // pending scheduled-task titles
  openTaskCount: number
  lastSleepHours: number | null  // last night, if logged
  sleepAvg7: number | null       // 7-day average
}

export async function getDayData(opts: { fresh?: boolean } = {}): Promise<DayData> {
  const now = new Date()
  const endOfWindow = new Date(now.getTime() + 24 * 3600_000)
  const today = todayString()
  const todayDow = new Date().getDay()

  const events = calendarConfigured()
    ? await getCalendarEvents(now, endOfWindow, opts)
    : []

  const todayEvents = events.filter(e => e.dayKey === today)

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

  // Sleep: last night's entry plus the 7-day average
  const recentSleep = await db.select().from(sleepLogs)
    .where(gte(sleepLogs.date, daysAgoString(6)))
    .orderBy(desc(sleepLogs.date))
  const lastSleepHours = recentSleep[0]?.hours ?? null
  const sleepAvg7 = recentSleep.length > 0
    ? Math.round((recentSleep.reduce((s, r) => s + r.hours, 0) / recentSleep.length) * 10) / 10
    : null

  return {
    todayEvents, pendingHabitCount, scheduledToday,
    openTaskCount: openTasks.length, lastSleepHours, sleepAvg7,
  }
}

function fallbackBriefing(d: DayData): string {
  const parts: string[] = []
  if (d.todayEvents.length > 0) {
    const first = d.todayEvents.find(e => !e.allDay)
    parts.push(`${d.todayEvents.length} event${d.todayEvents.length > 1 ? 's' : ''} today` +
      (first ? `, first at ${timeInAppTz(first.start)}` : ''))
  }
  if (d.lastSleepHours !== null && d.lastSleepHours < 7) {
    parts.push(`${d.lastSleepHours}h sleep, keep today easy on recovery`)
  }
  if (d.pendingHabitCount > 0) parts.push(`${d.pendingHabitCount} daily habit${d.pendingHabitCount > 1 ? 's' : ''} to hit`)
  if (d.scheduledToday.length > 0) parts.push(`${d.scheduledToday.length} chores on deck`)
  return parts.length > 0 ? parts.join(' · ') : 'Clear schedule today. Pick something great to build.'
}

export async function composeBriefing(d: DayData): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return fallbackBriefing(d)

  const eventLines = d.todayEvents.map(e =>
    `- ${e.allDay ? 'all day' : timeInAppTz(e.start)}: ${e.title}${e.location ? ` @ ${e.location}` : ''}`).join('\n')

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
    const prompt = `You are a sharp, encouraging personal assistant writing a MORNING BRIEFING push notification for a 21-year-old CS student who is cutting, lifting 5 days a week, and building side projects.

TODAY'S CALENDAR:
${eventLines || '(nothing scheduled)'}

LAST NIGHT'S SLEEP: ${d.lastSleepHours !== null ? `${d.lastSleepHours}h (7-day avg ${d.sleepAvg7}h)` : 'not logged'}
PENDING DAILY HABITS: ${d.pendingHabitCount}
OPEN TASKS: ${d.openTaskCount}
CHORES TODAY: ${d.scheduledToday.join(', ') || 'none'}

Write the briefing as 2-4 short sentences, max 320 characters total. Lead with the most time-critical thing. Be concrete with times. If sleep was under 7 hours, mention going easier or prioritising rest. No greetings, no emojis, no markdown, no bullet points, no em dashes.`

    const result = await model.generateContent(prompt)
    const text = result.response.text().trim()
    return text.length > 5 && text.length < 500 ? text : fallbackBriefing(d)
  } catch {
    return fallbackBriefing(d)
  }
}
