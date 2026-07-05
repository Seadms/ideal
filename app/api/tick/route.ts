// ── Assistant tick ────────────────────────────────────────────────────────────
// Hit every 5–15 minutes by an external pinger (cron-job.org — Vercel Hobby
// crons only run daily). Each tick checks what's due and fires at most one
// push per notification key, deduped through sent_notifications:
//
//   1. Morning briefing at the configured time (AI day plan)
//   2. Calendar event reminders, `event_lead_minutes` before start
//   3. Canvas assignment reminders at `assignment_alert_hours` out and a
//      final call 2 hours before the deadline
//
// Auth: `Authorization: Bearer <CRON_SECRET>` or `?key=<CRON_SECRET>`.

import { NextResponse } from 'next/server'
import { eq, lt, sql } from 'drizzle-orm'
import { db, initDb } from '@/lib/db'
import { userStats, sentNotifications } from '@/lib/db/schema'
import { sendPushToAll, claimNotification, pushConfigured } from '@/lib/push-server'
import { getCalendarEvents, calendarConfigured } from '@/lib/calendar'
import { getPlannerItems, canvasConfigured, cleanCourseName } from '@/lib/canvas'
import { getDayData, composeBriefing } from '@/lib/assistant'
import { todayString, hmInAppTz, timeInAppTz } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function hmToMinutes(hm: string): number {
  const [h, m] = hm.split(':').map(Number)
  return h * 60 + m
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const secret = process.env.CRON_SECRET
  if (process.env.NODE_ENV === 'production' && !secret) {
    return new NextResponse('CRON_SECRET not configured', { status: 503 })
  }
  const provided = request.headers.get('authorization')?.replace('Bearer ', '') ?? url.searchParams.get('key')
  if (secret && provided !== secret) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  if (!pushConfigured()) return NextResponse.json({ ok: false, reason: 'VAPID not configured' })
  await initDb()

  const statsRows = await db.select().from(userStats).where(eq(userStats.id, 1))
  const stats = statsRows[0]
  if (!stats) return NextResponse.json({ ok: false, reason: 'no user stats yet' })

  const now = new Date()
  const today = todayString()
  const fired: string[] = []

  // ── 1. Morning briefing ─────────────────────────────────────────────────────
  // 90-minute grace window so one missed tick doesn't swallow the briefing.
  if (stats.briefingTime) {
    const nowMin = hmToMinutes(hmInAppTz(now))
    const target = hmToMinutes(stats.briefingTime)
    if (nowMin >= target && nowMin <= target + 90) {
      if (await claimNotification(`briefing-${today}`)) {
        const data = await getDayData({ fresh: true })
        const body = await composeBriefing(data)
        await sendPushToAll({ title: 'Your day, prepared ☀️', body, url: '/' })
        fired.push('briefing')

        // Piggyback ledger cleanup on the once-a-day path
        await db.delete(sentNotifications)
          .where(lt(sentNotifications.sentAt, sql`datetime('now', '-30 days')`))
      }
    }
  }

  // ── 2. Calendar event lead-time reminders ───────────────────────────────────
  if (calendarConfigured()) {
    const lead = stats.eventLeadMinutes ?? 30
    const horizon = new Date(now.getTime() + (lead + 5) * 60_000)
    const events = await getCalendarEvents(now, horizon, { fresh: true })
    for (const ev of events) {
      if (ev.allDay) continue
      const minsAway = Math.round((ev.start.getTime() - now.getTime()) / 60_000)
      if (minsAway <= 0 || minsAway > lead) continue
      if (await claimNotification(`event-${ev.id}`)) {
        await sendPushToAll({
          title: `${ev.title} — ${timeInAppTz(ev.start)}`,
          body: `Starts in ${minsAway} min${ev.location ? ` · ${ev.location}` : ''}`,
          url: '/',
        })
        fired.push(`event:${ev.title}`)
      }
    }
  }

  // ── 3. Canvas assignment deadline reminders ─────────────────────────────────
  if (canvasConfigured()) {
    const alertHours = stats.assignmentAlertHours ?? 24
    const items = await getPlannerItems(3, { fresh: true })
    for (const item of items) {
      if (item.submitted || !item.dueAt) continue
      const due = new Date(item.dueAt)
      const hoursAway = (due.getTime() - now.getTime()) / 3600_000
      if (hoursAway <= 0) continue
      const course = item.courseName ? cleanCourseName(item.courseName) : 'Canvas'

      if (hoursAway <= 2) {
        if (await claimNotification(`assign-${item.id}-final`)) {
          await sendPushToAll({
            title: `⚠️ Due in ${Math.max(1, Math.round(hoursAway * 60))} min: ${item.title}`,
            body: `${course} · due ${timeInAppTz(due)}. Submit it now.`,
            url: '/school',
          })
          fired.push(`assign-final:${item.title}`)
        }
      } else if (hoursAway <= alertHours) {
        if (await claimNotification(`assign-${item.id}-due`)) {
          await sendPushToAll({
            title: `Due ${hoursAway < 20 ? 'today' : 'tomorrow'}: ${item.title}`,
            body: `${course} · due ${timeInAppTz(due)}${item.pointsPossible ? ` · ${item.pointsPossible} pts` : ''}`,
            url: '/school',
          })
          fired.push(`assign:${item.title}`)
        }
      }
    }
  }

  return NextResponse.json({ ok: true, fired, at: now.toISOString() })
}
