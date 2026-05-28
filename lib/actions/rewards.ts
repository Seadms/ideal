'use server'

import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { rewardRedemptions, rewards, userStats } from '@/lib/db/schema'

export async function redeemReward(rewardId: string): Promise<{ success: boolean; error?: string }> {
  const rewardRows = await db.select().from(rewards).where(eq(rewards.id, rewardId))
  const reward = rewardRows[0]
  if (!reward || !reward.isAvailable) return { success: false, error: 'Reward not found' }

  const statsRows = await db.select().from(userStats).where(eq(userStats.id, 1))
  const stats = statsRows[0]
  if (!stats) return { success: false, error: 'Stats not found' }

  if (stats.currentPoints < reward.cost) {
    return { success: false, error: `Need ${reward.cost - stats.currentPoints} more points` }
  }

  await db.insert(rewardRedemptions).values({
    id: randomUUID(),
    rewardId,
    pointsSpent: reward.cost,
  })

  await db.update(rewards)
    .set({ timesRedeemed: reward.timesRedeemed + 1 })
    .where(eq(rewards.id, rewardId))

  await db.update(userStats).set({
    totalPointsSpent: stats.totalPointsSpent + reward.cost,
    currentPoints: stats.currentPoints - reward.cost,
  }).where(eq(userStats.id, 1))

  revalidatePath('/')
  revalidatePath('/rewards')
  return { success: true }
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
}

export async function deleteReward(id: string) {
  await db.delete(rewards).where(eq(rewards.id, id))
  revalidatePath('/rewards')
}
