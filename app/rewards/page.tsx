import { desc, eq } from 'drizzle-orm'
import { db, initDb } from '@/lib/db'
import { rewards, rewardRedemptions, userStats } from '@/lib/db/schema'
import { formatPoints } from '@/lib/utils'
import { RewardCard } from '@/components/rewards/reward-card'
import { RewardsActions } from '@/components/rewards/rewards-actions'
import { RedemptionHistory } from '@/components/rewards/redemption-history'
import { Gift } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'

export const dynamic = 'force-dynamic'

export default async function RewardsPage() {
  await initDb()
  const allRewards = await db.select().from(rewards)
  const statsRows = await db.select().from(userStats).where(eq(userStats.id, 1))
  const currentPoints = statsRows[0]?.currentPoints ?? 0

  const available = allRewards.filter(r => r.isAvailable).sort((a, b) => a.cost - b.cost)
  const hidden = allRewards.filter(r => !r.isAvailable).sort((a, b) => a.cost - b.cost)
  const allSorted = [...available, ...hidden]
  const affordable = available.filter(r => r.cost <= currentPoints)

  // Redemption history with reward title via join
  const redemptions = await db
    .select({
      id: rewardRedemptions.id,
      rewardTitle: rewards.title,
      pointsSpent: rewardRedemptions.pointsSpent,
      redeemedAt: rewardRedemptions.redeemedAt,
    })
    .from(rewardRedemptions)
    .innerJoin(rewards, eq(rewardRedemptions.rewardId, rewards.id))
    .orderBy(desc(rewardRedemptions.redeemedAt))
    .limit(30)

  return (
    <div className="space-y-7">
      <div>
        <PageHeader title="Rewards" ghost="Store" sub="Spend your points on things that make life worth grinding for." />
      </div>

      {/* Balance */}
      <div className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/60 px-5 py-5">
        <div>
          <p className="text-xs uppercase tracking-wider text-zinc-500">Balance</p>
          <p className="mt-1.5 font-display text-3xl font-bold leading-none tabular-nums text-slate-300">
            {formatPoints(currentPoints)}
            <span className="ml-2 text-sm font-semibold text-zinc-500">points</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wider text-zinc-500">Affordable</p>
          <p className={`mt-1.5 font-display text-3xl font-bold leading-none tabular-nums ${affordable.length > 0 ? 'text-emerald-400' : 'text-zinc-600'}`}>
            {affordable.length}
            <span className="ml-2 text-sm font-semibold text-zinc-500">of {available.length}</span>
          </p>
        </div>
      </div>

      <RewardsActions />

      {allSorted.length === 0 ? (
        <div className="py-16 flex flex-col items-center gap-3">
          <Gift size={28} className="text-zinc-700" />
          <p className="text-sm text-zinc-500">No rewards yet. Add something to work towards.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {allSorted.map(reward => (
            <RewardCard key={reward.id} reward={reward} currentPoints={currentPoints} />
          ))}
        </div>
      )}

      <RedemptionHistory redemptions={redemptions} />
    </div>
  )
}
