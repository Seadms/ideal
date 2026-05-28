'use server'

import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'
import { and, asc, eq, max } from 'drizzle-orm'
import { db } from '@/lib/db'
import { habitCompletions, habits, userStats } from '@/lib/db/schema'
import { todayString, yesterdayString, levelFromPoints } from '@/lib/utils'

export interface CompletionResult {
  leveledUp: boolean
  newLevel: number
  pointsEarned: number
}

async function refreshStreak() {
  const rows = await db.select().from(userStats).where(eq(userStats.id, 1))
  const stats = rows[0]
  if (!stats) return
  const yesterday = yesterdayString()
  if (stats.lastActiveDate && stats.lastActiveDate < yesterday) {
    await db.update(userStats).set({ currentStreak: 0 }).where(eq(userStats.id, 1))
  }
}

async function checkAndUpdateStreakForToday() {
  const today = todayString()
  const mvdHabits = await db.select()
    .from(habits)
    .where(and(eq(habits.isMinimumViable, true), eq(habits.isActive, true)))
  if (mvdHabits.length === 0) return

  const completedToday = await db.select()
    .from(habitCompletions)
    .where(eq(habitCompletions.completedDate, today))

  const completedIds = new Set(completedToday.map(c => c.habitId))
  if (!mvdHabits.every(h => completedIds.has(h.id))) return

  const rows = await db.select().from(userStats).where(eq(userStats.id, 1))
  const stats = rows[0]
  if (!stats || stats.lastActiveDate === today) return

  const yesterday = yesterdayString()
  const newStreak = stats.lastActiveDate === yesterday ? stats.currentStreak + 1 : 1
  await db.update(userStats)
    .set({ currentStreak: newStreak, longestStreak: Math.max(newStreak, stats.longestStreak), lastActiveDate: today })
    .where(eq(userStats.id, 1))
}

export async function completeHabit(habitId: string): Promise<CompletionResult> {
  const today = todayString()
  const existing = await db.select()
    .from(habitCompletions)
    .where(and(eq(habitCompletions.habitId, habitId), eq(habitCompletions.completedDate, today)))
  if (existing.length > 0) return { leveledUp: false, newLevel: 1, pointsEarned: 0 }

  const habitRows = await db.select().from(habits).where(eq(habits.id, habitId))
  const habit = habitRows[0]
  if (!habit) return { leveledUp: false, newLevel: 1, pointsEarned: 0 }

  const statsRows = await db.select().from(userStats).where(eq(userStats.id, 1))
  const stats = statsRows[0]
  if (!stats) return { leveledUp: false, newLevel: 1, pointsEarned: 0 }

  const oldLevel = levelFromPoints(stats.totalPointsEarned)

  await db.insert(habitCompletions).values({
    id: randomUUID(), habitId, completedDate: today, pointsEarned: habit.points,
  })
  await db.update(userStats).set({
    totalPointsEarned: stats.totalPointsEarned + habit.points,
    currentPoints: stats.currentPoints + habit.points,
  }).where(eq(userStats.id, 1))

  const newLevel = levelFromPoints(stats.totalPointsEarned + habit.points)
  await checkAndUpdateStreakForToday()
  revalidatePath('/')
  return { leveledUp: newLevel > oldLevel, newLevel, pointsEarned: habit.points }
}

export async function uncompleteHabit(habitId: string) {
  const today = todayString()
  const existing = await db.select()
    .from(habitCompletions)
    .where(and(eq(habitCompletions.habitId, habitId), eq(habitCompletions.completedDate, today)))
  const completion = existing[0]
  if (!completion) return

  await db.delete(habitCompletions)
    .where(and(eq(habitCompletions.habitId, habitId), eq(habitCompletions.completedDate, today)))

  const statsRows = await db.select().from(userStats).where(eq(userStats.id, 1))
  const stats = statsRows[0]
  if (stats) {
    await db.update(userStats).set({
      totalPointsEarned: Math.max(0, stats.totalPointsEarned - completion.pointsEarned),
      currentPoints: Math.max(0, stats.currentPoints - completion.pointsEarned),
    }).where(eq(userStats.id, 1))
  }
  revalidatePath('/')
}

export async function freezeStreak() {
  const today = todayString()
  const rows = await db.select().from(userStats).where(eq(userStats.id, 1))
  const stats = rows[0]
  if (!stats || stats.lastActiveDate === today) return

  const yesterday = yesterdayString()
  const newStreak = stats.lastActiveDate === yesterday ? stats.currentStreak + 1 : 1
  await db.update(userStats).set({
    lastActiveDate: today,
    currentStreak: newStreak,
    longestStreak: Math.max(newStreak, stats.longestStreak),
    streakFreezeCount: stats.streakFreezeCount + 1,
  }).where(eq(userStats.id, 1))

  revalidatePath('/')
}

export async function createHabit(data: {
  title: string; description?: string; points: number; isMinimumViable: boolean; category: string; frequencyPerWeek?: number
}) {
  const maxRows = await db.select({ m: max(habits.sortOrder) }).from(habits).where(eq(habits.isActive, true))
  const sortOrder = (maxRows[0]?.m ?? 0) + 1
  await db.insert(habits).values({ id: randomUUID(), ...data, frequencyPerWeek: data.frequencyPerWeek ?? 7, sortOrder })
  revalidatePath('/')
}

export async function updateHabit(id: string, data: Partial<{
  title: string; description: string; points: number; isMinimumViable: boolean; category: string; isActive: boolean; frequencyPerWeek: number
}>) {
  await db.update(habits).set(data).where(eq(habits.id, id))
  revalidatePath('/')
}

export async function deleteHabit(id: string) {
  await db.update(habits).set({ isActive: false }).where(eq(habits.id, id))
  revalidatePath('/')
}

export async function moveHabit(habitId: string, direction: 'up' | 'down') {
  const allHabits = await db.select()
    .from(habits)
    .where(eq(habits.isActive, true))
    .orderBy(asc(habits.sortOrder))

  const idx = allHabits.findIndex(h => h.id === habitId)
  if (idx < 0) return
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1
  if (swapIdx < 0 || swapIdx >= allHabits.length) return

  const a = allHabits[idx]
  const b = allHabits[swapIdx]
  await db.update(habits).set({ sortOrder: b.sortOrder }).where(eq(habits.id, a.id))
  await db.update(habits).set({ sortOrder: a.sortOrder }).where(eq(habits.id, b.id))
  revalidatePath('/')
}

export async function checkStreakOnLoad() {
  await refreshStreak()
}
