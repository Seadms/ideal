'use server'

import { eq } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import { db } from '@/lib/db'
import { pushSubscriptions } from '@/lib/db/schema'

export async function savePushSubscription(sub: {
  endpoint: string
  keys: { p256dh: string; auth: string }
}, owner: string = 'self') {
  // Upsert by endpoint — same device re-subscribing replaces the old record
  const existing = await db.select().from(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, sub.endpoint))

  if (existing.length > 0) {
    await db.update(pushSubscriptions)
      .set({ p256dh: sub.keys.p256dh, auth: sub.keys.auth, owner })
      .where(eq(pushSubscriptions.endpoint, sub.endpoint))
  } else {
    await db.insert(pushSubscriptions).values({
      id: randomUUID(),
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
      owner,
    })
  }
}

export async function removePushSubscription(endpoint: string) {
  await db.delete(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, endpoint))
}

