'use server'

import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'
import { eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { rewardClaims, rewardRedemptions, rewards, userStats } from '@/lib/db/schema'

export async function redeemReward(rewardId: string): Promise<{ success: boolean; error?: string }> {
  const rewardRows = await db.select().from(rewards).where(eq(rewards.id, rewardId))
  const reward = rewardRows[0]
  if (!reward || !reward.isAvailable) return { success: false, error: 'Reward not found' }

  const statsRows = await db.select().from(userStats).where(eq(userStats.id, 1))
  const stats = statsRows[0]
  if (!stats) return { success: false, error: 'Stats not found' }

  const isWife = reward.source === 'wife'
  if (reward.maxRedemptions && reward.timesRedeemed >= reward.maxRedemptions) {
    return { success: false, error: 'All used up' }
  }
  const balance = isWife ? stats.goodBoyPoints : stats.currentPoints
  if (balance < reward.cost) {
    return { success: false, error: `Need ${reward.cost - balance} more ${isWife ? 'good boy points' : 'points'}` }
  }

  // Wife rewards need her approval: reserve the points and file a pending
  // claim. Points are refunded if she declines (see declineClaim).
  if (isWife) {
    await db.update(userStats)
      .set({ goodBoyPoints: sql`${userStats.goodBoyPoints} - ${reward.cost}` })
      .where(eq(userStats.id, 1))
    await db.insert(rewardClaims).values({
      id: randomUUID(), rewardId, title: reward.title, cost: reward.cost,
    })
    const { sendPushToAll } = await import('@/lib/push-server')
    await sendPushToAll(
      { title: 'Daniel wants a reward', body: `${reward.title} — accept or decline`, url: '/wife' },
      'wife',
    )
    revalidatePath('/')
    revalidatePath('/rewards')
    revalidatePath('/wife')
    return { success: true }
  }

  // His own rewards redeem instantly.
  await db.insert(rewardRedemptions).values({ id: randomUUID(), rewardId, pointsSpent: reward.cost })
  await db.update(rewards)
    .set({ timesRedeemed: sql`${rewards.timesRedeemed} + 1` })
    .where(eq(rewards.id, rewardId))
  await db.update(userStats).set({
    totalPointsSpent: sql`${userStats.totalPointsSpent} + ${reward.cost}`,
    currentPoints: sql`${userStats.currentPoints} - ${reward.cost}`,
  }).where(eq(userStats.id, 1))

  revalidatePath('/')
  revalidatePath('/rewards')
  return { success: true }
}

// Kayd approves/denies a pending claim (from /wife).
export async function resolveClaim(claimId: string, decision: 'accept' | 'decline'): Promise<{ ok: boolean }> {
  const rows = await db.select().from(rewardClaims).where(eq(rewardClaims.id, claimId))
  const claim = rows[0]
  if (!claim || claim.status !== 'pending') return { ok: false }

  await db.update(rewardClaims)
    .set({ status: decision === 'accept' ? 'accepted' : 'declined', resolvedAt: new Date().toISOString() })
    .where(eq(rewardClaims.id, claimId))

  const { sendPushToAll } = await import('@/lib/push-server')
  if (decision === 'accept') {
    if (claim.rewardId) {
      await db.update(rewards).set({ timesRedeemed: sql`${rewards.timesRedeemed} + 1` }).where(eq(rewards.id, claim.rewardId))
    }
    await sendPushToAll({ title: 'Kayd accepted your reward', body: `${claim.title} — enjoy it`, url: '/rewards' }, 'self')
  } else {
    // Refund the reserved good-boy points.
    await db.update(userStats).set({ goodBoyPoints: sql`${userStats.goodBoyPoints} + ${claim.cost}` }).where(eq(userStats.id, 1))
    await sendPushToAll({ title: 'Kayd declined your reward', body: `${claim.title} — points refunded`, url: '/rewards' }, 'self')
  }

  revalidatePath('/')
  revalidatePath('/rewards')
  revalidatePath('/wife')
  return { ok: true }
}

// Public: the wife page stocks her store (untrusted input — clamp).
// maxRedemptions 0 (or missing) = unlimited.
export async function createWifeReward(title: string, cost: number, maxRedemptions = 0): Promise<{ ok: boolean }> {
  const clean = title.trim().slice(0, 120)
  if (!clean) return { ok: false }
  const c = Math.max(1, Math.min(9999, Math.round(cost) || 1))
  const max = Math.max(0, Math.min(999, Math.round(maxRedemptions) || 0)) || null
  await db.insert(rewards).values({ id: randomUUID(), title: clean, cost: c, maxRedemptions: max, category: 'social', source: 'wife' })
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
  maxRedemptions: number | null
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
