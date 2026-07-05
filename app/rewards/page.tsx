import { desc, eq } from 'drizzle-orm'
import { db, initDb } from '@/lib/db'
import { rewards, rewardRedemptions, userStats } from '@/lib/db/schema'
import { formatPoints } from '@/lib/utils'
import { RewardCard } from '@/components/rewards/reward-card'
import { RewardsActions } from '@/components/rewards/rewards-actions'
import { RedemptionHistory } from '@/components/rewards/redemption-history'
import { Zap, Gift } from 'lucide-react'

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
    <div className="space-y-7 animate-fade-in">
      <div>
        <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">Rewards Store</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Spend your points on things that make life worth grinding for.
        </p>
      </div>

      {/* Balance */}
      <div className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900/60 px-5 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-lime-400/10 border border-lime-400/15">
          <Zap size={18} className="text-lime-300" />
        </div>
        <div>
          <p className="text-xs text-zinc-500">Current balance</p>
          <p className="font-display text-2xl font-bold text-lime-300 tabular-nums leading-none mt-0.5">
            {formatPoints(currentPoints)} pts
          </p>
        </div>
        {affordable.length > 0 && (
          <div className="ml-auto text-right">
            <p className="text-xs text-zinc-500">You can afford</p>
            <p className="text-sm font-medium text-emerald-400">
              {affordable.length} reward{affordable.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
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
