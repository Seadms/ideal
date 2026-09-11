import { eq } from 'drizzle-orm'
import { db, initDb } from '@/lib/db'
import { rewards, rewardClaims, userStats } from '@/lib/db/schema'
import { formatPoints } from '@/lib/utils'
import { RewardCard } from '@/components/rewards/reward-card'
import { Gift, Heart } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { clearSpentRewards } from '@/lib/actions/rewards'

export const dynamic = 'force-dynamic'

export default async function RewardsPage() {
  await initDb()
  await clearSpentRewards()
  const statsRows = await db.select().from(userStats).where(eq(userStats.id, 1))
  const goodBoyPoints = statsRows[0]?.goodBoyPoints ?? 0
  const pendingClaims = await db.select().from(rewardClaims).where(eq(rewardClaims.status, 'pending'))
  const wifeRewards = (await db.select().from(rewards).where(eq(rewards.source, 'wife')))
    .sort((a, b) => a.cost - b.cost)

  return (
    <div className="space-y-7">
      <div>
        <PageHeader title="Rewards" ghost="Store" sub="Kayd's store. Spend the good boy points she gives you." />
      </div>

      {/* Balance */}
      <div className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/60 px-5 py-5">
        <p className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-zinc-500">
          <Heart className="h-3 w-3 fill-sky-300 text-sky-300" /> Good boy points
        </p>
        <p className="font-display text-3xl font-bold leading-none tabular-nums text-sky-300">
          {formatPoints(goodBoyPoints)}
        </p>
      </div>

      {/* Awaiting Kayd's approval */}
      {pendingClaims.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-sky-300">Awaiting Kayd</h2>
          {pendingClaims.map(c => (
            <div key={c.id} className="flex items-center justify-between rounded-xl border border-sky-500/20 bg-sky-500/5 px-4 py-3">
              <span className="text-sm text-zinc-200">{c.title}</span>
              <span className="text-xs text-sky-300">{c.cost} good boy pts · pending</span>
            </div>
          ))}
        </section>
      )}

      {/* Wife Store */}
      {wifeRewards.length === 0 ? (
        <div className="py-16 flex flex-col items-center gap-3">
          <Gift size={28} className="text-zinc-700" />
          <p className="text-sm text-zinc-500">Kayd hasn't stocked the store yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {wifeRewards.map(reward => (
            <RewardCard key={reward.id} reward={reward} goodBoyPoints={goodBoyPoints} />
          ))}
        </div>
      )}
    </div>
  )
}
