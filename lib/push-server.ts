// Shared web-push sender — used by the daily habit cron and the assistant tick.
import webpush from 'web-push'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { pushSubscriptions, sentNotifications } from '@/lib/db/schema'

export function pushConfigured(): boolean {
  return !!process.env.VAPID_PUBLIC_KEY && !!process.env.VAPID_PRIVATE_KEY
}

// owner scopes delivery: 'self' = Daniel's devices (habits, deadlines,
// briefings), 'wife' = Kayd's devices (reward-claimed alerts).
export async function sendPushToAll(
  payload: { title: string; body: string; url?: string },
  owner: string = 'self',
): Promise<number> {
  if (!pushConfigured()) return 0
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? 'mailto:admin@example.com',
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  )

  const subs = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.owner, owner))
  const json = JSON.stringify(payload)
  let sent = 0
  const expired: string[] = []

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        json,
      )
      sent++
    } catch (err: unknown) {
      const status = (err as { statusCode?: number }).statusCode
      if (status === 410 || status === 404) expired.push(sub.endpoint)
    }
  }
  for (const endpoint of expired) {
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint))
  }
  return sent
}

// Claims a notification key. Returns true exactly once per key — the caller
// that wins the insert sends the push; every later tick is a no-op.
export async function claimNotification(key: string): Promise<boolean> {
  const res = await db.insert(sentNotifications).values({ key }).onConflictDoNothing()
  return (res.rowsAffected ?? 0) > 0
}
