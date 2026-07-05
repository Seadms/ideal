import { NextResponse } from 'next/server'
import webpush from 'web-push'
import { db } from '@/lib/db'
import { pushSubscriptions, userStats, habits, habitCompletions } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { todayString } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return NextResponse.json({ sent: 0, reason: 'VAPID keys not configured' })
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? 'mailto:admin@example.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  )

  // Verify this is a legitimate Vercel cron call or an authorized request.
  // In production the secret is required — without this, an unset CRON_SECRET
  // would leave the endpoint publicly invocable instead of failing closed.
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (process.env.NODE_ENV === 'production' && !cronSecret) {
    return new NextResponse('CRON_SECRET not configured', { status: 503 })
  }
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const subs = await db.select().from(pushSubscriptions)
  if (subs.length === 0) {
    return NextResponse.json({ sent: 0, reason: 'no subscriptions' })
  }

  // Check if reminder is configured
  const statsRows = await db.select().from(userStats).where(eq(userStats.id, 1))
  const stats = statsRows[0]
  if (!stats?.reminderTime) {
    return NextResponse.json({ sent: 0, reason: 'reminder not configured' })
  }

  // Build a personalized message based on pending habits
  const today = todayString()
  const allHabits = await db.select().from(habits)
    .where(and(eq(habits.isActive, true), eq(habits.isMinimumViable, true)))
  const todayCompletions = await db.select().from(habitCompletions)
    .where(eq(habitCompletions.completedDate, today))
  const completedIds = new Set(todayCompletions.map(c => c.habitId))
  const pendingMvd = allHabits.filter(h => !completedIds.has(h.id))

  let body: string
  if (pendingMvd.length === 0 && allHabits.length > 0) {
    body = "MVD complete! Keep the streak alive."
  } else if (pendingMvd.length > 0) {
    body = `${pendingMvd.length} MVD habit${pendingMvd.length > 1 ? 's' : ''} still pending — don't break the streak.`
  } else {
    body = "Time to check your habits for today."
  }

  const payload = JSON.stringify({ title: 'ideal', body })

  let sent = 0
  const failed: string[] = []

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
      )
      sent++
    } catch (err: unknown) {
      const status = (err as { statusCode?: number }).statusCode
      if (status === 410 || status === 404) {
        // Subscription expired — clean it up
        failed.push(sub.endpoint)
      }
    }
  }

  // Remove expired subscriptions
  for (const endpoint of failed) {
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint))
  }

  return NextResponse.json({ sent, removed: failed.length })
}
