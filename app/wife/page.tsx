import { eq } from 'drizzle-orm'
import { db, initDb } from '@/lib/db'
import { rewards, rewardClaims } from '@/lib/db/schema'
import { clearSpentRewards } from '@/lib/actions/rewards'
import type { Metadata } from 'next'
import { WifeClient } from '@/components/wife/wife-client'

export const dynamic = 'force-dynamic'

// Own manifest so iOS "Add to Home Screen" installs this page (start_url
// /wife), not the main app — keeps her icon on her page and past the gate.
export const metadata: Metadata = {
  manifest: '/wife.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'For Daniel' },
}

export default async function WifePage() {
  await initDb()
  await clearSpentRewards()
  const [storeRewards, pending] = await Promise.all([
    db.select().from(rewards).where(eq(rewards.source, 'wife')),
    db.select().from(rewardClaims).where(eq(rewardClaims.status, 'pending')),
  ])
  return (
    <WifeClient
      rewards={storeRewards.map(r => ({ id: r.id, title: r.title, cost: r.cost, maxRedemptions: r.maxRedemptions, timesRedeemed: r.timesRedeemed }))}
      claims={pending.map(c => ({ id: c.id, title: c.title, cost: c.cost }))}
      vapidPublicKey={process.env.VAPID_PUBLIC_KEY ?? ''}
    />
  )
}
