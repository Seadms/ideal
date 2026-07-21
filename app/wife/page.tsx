import { eq } from 'drizzle-orm'
import { db, initDb } from '@/lib/db'
import { rewards } from '@/lib/db/schema'
import { WifeClient } from '@/components/wife/wife-client'

export const dynamic = 'force-dynamic'

export default async function WifePage() {
  await initDb()
  const storeRewards = await db.select().from(rewards)
    .where(eq(rewards.source, 'wife'))
  return (
    <WifeClient
      rewards={storeRewards.map(r => ({ id: r.id, title: r.title, cost: r.cost }))}
      vapidPublicKey={process.env.VAPID_PUBLIC_KEY ?? ''}
    />
  )
}
