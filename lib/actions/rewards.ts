'use server'

import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'
import { eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { rewardRedemptions, rewards, userStats } from '@/lib/db/schema'

export async function redeemReward(rewardId: string): Promise<{ success: boolean; error?: string }> {
  const rewardRows = await db.select().from(rewards).where(eq(rewards.id, rewardId))
  const reward = rewardRows[0]
  if (!reward || !reward.isAvailable) return { success: false, error: 'Reward not found' }

  const statsRows = await db.select().from(userStats).where(eq(userStats.id, 1))
  const stats = statsRows[0]
  if (!stats) return { success: false, error: 'Stats not found' }

  const isWife = reward.source === 'wife'
  const balance = isWife ? stats.goodBoyPoints : stats.currentPoints
  if (balance < reward.cost) {
    return { success: false, error: `Need ${reward.cost - balance} more ${isWife ? 'good boy points' : 'points'}` }
  }

  await db.insert(rewardRedemptions).values({
    id: randomUUID(),
    rewardId,
    pointsSpent: reward.cost,
  })

  await db.update(rewards)
    .set({ timesRedeemed: sql`${rewards.timesRedeemed} + 1` })
    .where(eq(rewards.id, rewardId))

  await db.update(userStats).set(
    isWife
      ? { goodBoyPoints: sql`${userStats.goodBoyPoints} - ${reward.cost}` }
      : {
          totalPointsSpent: sql`${userStats.totalPointsSpent} + ${reward.cost}`,
          currentPoints: sql`${userStats.currentPoints} - ${reward.cost}`,
        },
  ).where(eq(userStats.id, 1))

  // Ping Kayd's phone when he cashes in from her store.
  if (isWife) {
    const { sendPushToAll } = await import('@/lib/push-server')
    await sendPushToAll(
      { title: 'Daniel claimed a reward', body: `${reward.title} (-${reward.cost} good boy points)` },
      'wife',
    )
  }

  revalidatePath('/')
  revalidatePath('/rewards')
  return { success: true }
}

// Public: the wife page stocks her store (untrusted input — clamp).
export async function createWifeReward(title: string, cost: number): Promise<{ ok: boolean }> {
  const clean = title.trim().slice(0, 120)
  if (!clean) return { ok: false }
  const c = Math.max(1, Math.min(9999, Math.round(cost) || 1))
  await db.insert(rewards).values({ id: randomUUID(), title: clean, cost: c, category: 'social', source: 'wife' })
  revalidatePath('/rewards')
  revalidatePath('/wife')
  return { ok: true }
}

export async function createReward(data: {
  title: string
  description?: string
  cost: number
  category: string
}) {
  await db.insert(rewards).values({ id: randomUUID(), ...data })
  revalidatePath('/rewards')
}

export async function updateReward(id: string, data: Partial<{
  title: string
  description: string
  cost: number
  category: string
  isAvailable: boolean
}>) {
  await db.update(rewards).set(data).where(eq(rewards.id, id))
  revalidatePath('/rewards')
  revalidatePath('/wife')
}

export async function deleteReward(id: string) {
  // Redemptions reference the reward (FK) — clear them first or the delete
  // throws under enforced foreign keys. History for a removed reward isn't
  // shown anyway (the rewards page inner-joins on existing rewards).
  await db.delete(rewardRedemptions).where(eq(rewardRedemptions.rewardId, id))
  await db.delete(rewards).where(eq(rewards.id, id))
  revalidatePath('/rewards')
  revalidatePath('/wife')
}
