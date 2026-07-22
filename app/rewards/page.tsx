import { desc, eq } from 'drizzle-orm'
import { db, initDb } from '@/lib/db'
import { rewards, rewardRedemptions, rewardClaims, userStats } from '@/lib/db/schema'
import { formatPoints } from '@/lib/utils'
import { RewardCard } from '@/components/rewards/reward-card'
import { RewardsActions } from '@/components/rewards/rewards-actions'
import { RedemptionHistory } from '@/components/rewards/redemption-history'
import { Gift, Heart } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'

export const dynamic = 'force-dynamic'

export default async function RewardsPage() {
  await initDb()
  const allRewards = await db.select().from(rewards)
  const statsRows = await db.select().from(userStats).where(eq(userStats.id, 1))
  const currentPoints = statsRows[0]?.currentPoints ?? 0
  const goodBoyPoints = statsRows[0]?.goodBoyPoints ?? 0
  const pendingClaims = await db.select().from(rewardClaims).where(eq(rewardClaims.status, 'pending'))

  const byCost = (a: { cost: number }, b: { cost: number }) => a.cost - b.cost
  const selfRewards = allRewards.filter(r => r.source !== 'wife')
  const wifeRewards = allRewards.filter(r => r.source === 'wife').sort(byCost)

  const available = selfRewards.filter(r => r.isAvailable).sort(byCost)
  const hidden = selfRewards.filter(r => !r.isAvailable).sort(byCost)
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

      {/* Balances: points + good-boy points */}
      <div className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/60 px-5 py-5">
        <div>
          <p className="text-xs uppercase tracking-wider text-zinc-500">Points</p>
          <p className="mt-1.5 font-display text-3xl font-bold leading-none tabular-nums text-slate-300">
            {formatPoints(currentPoints)}
          </p>
        </div>
        <div className="text-right">
          <p className="flex items-center justify-end gap-1 text-xs uppercase tracking-wider text-zinc-500">
            <Heart className="h-3 w-3 fill-sky-300 text-sky-300" /> Good boy
          </p>
          <p className="mt-1.5 font-display text-3xl font-bold leading-none tabular-nums text-sky-300">
            {formatPoints(goodBoyPoints)}
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

      {/* Awaiting Kayd's approval */}
      {pendingClaims.length > 0 && (
        <section className="space-y-2 pt-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-sky-300">Awaiting Kayd</h2>
          {pendingClaims.map(c => (
            <div key={c.id} className="flex items-center justify-between rounded-xl border border-sky-500/20 bg-sky-500/5 px-4 py-3">
              <span className="text-sm text-zinc-200">{c.title}</span>
              <span className="text-xs text-sky-300">{c.cost} good boy pts · pending</span>
            </div>
          ))}
        </section>
      )}

      {/* Wife Store — spends good-boy points */}
      {wifeRewards.length > 0 && (
        <section className="space-y-4 pt-2">
          <div className="flex items-center gap-1.5">
            <Heart className="h-3.5 w-3.5 fill-sky-300 text-sky-300" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-sky-300">Wife Store</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {wifeRewards.map(reward => (
              <RewardCard key={reward.id} reward={reward} currentPoints={goodBoyPoints} unit="good boy pts" readonly />
            ))}
          </div>
        </section>
      )}

      <RedemptionHistory redemptions={redemptions} />
    </div>
  )
}
