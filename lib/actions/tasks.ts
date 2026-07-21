'use server'

import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'
import { and, eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { tasks, userStats } from '@/lib/db/schema'
import { levelFromPoints, nowString, todayString } from '@/lib/utils'
import type { CompletionResult } from './habits'

export async function completeTask(taskId: string): Promise<CompletionResult> {
  const rows = await db.select().from(tasks).where(eq(tasks.id, taskId))
  const task = rows[0]
  if (!task || !task.isActive || task.isCompleted) return { leveledUp: false, newLevel: 1, pointsEarned: 0 }

  const statsRows = await db.select().from(userStats).where(eq(userStats.id, 1))
  const stats = statsRows[0]
  if (!stats) return { leveledUp: false, newLevel: 1, pointsEarned: 0 }

  const oldLevel = levelFromPoints(stats.totalPointsEarned)

  await db.update(tasks)
    .set({ isCompleted: true, completedAt: nowString() })
    .where(eq(tasks.id, taskId))
  await db.update(userStats).set({
    totalPointsEarned: sql`${userStats.totalPointsEarned} + ${task.points}`,
    currentPoints: sql`${userStats.currentPoints} + ${task.points}`,
  }).where(eq(userStats.id, 1))

  const newLevel = levelFromPoints(stats.totalPointsEarned + task.points)
  revalidatePath('/')
  return { leveledUp: newLevel > oldLevel, newLevel, pointsEarned: task.points }
}

export async function uncompleteTask(taskId: string) {
  const rows = await db.select().from(tasks).where(eq(tasks.id, taskId))
  const task = rows[0]
  if (!task || !task.isCompleted) return

  await db.update(tasks).set({ isCompleted: false, completedAt: null }).where(eq(tasks.id, taskId))

  // Exact atomic reversal of the award — clamping to 0 here would let
  // totalPointsEarned drift out of sync with totalPointsSpent and the level.
  await db.update(userStats).set({
    totalPointsEarned: sql`${userStats.totalPointsEarned} - ${task.points}`,
    currentPoints: sql`${userStats.currentPoints} - ${task.points}`,
  }).where(eq(userStats.id, 1))
  revalidatePath('/')
}

export async function clearCompletedTasks() {
  const today = todayString()
  // Soft-delete tasks completed before today
  const completed = await db.select()
    .from(tasks)
    .where(and(eq(tasks.isCompleted, true), eq(tasks.isActive, true)))
  for (const task of completed) {
    const completedDate = task.completedAt?.split('T')[0]
    if (completedDate && completedDate < today) {
      await db.update(tasks).set({ isActive: false }).where(eq(tasks.id, task.id))
    }
  }
  revalidatePath('/')
}

export async function createTask(data: {
  title: string; description?: string; points: number; isMinimumViable: boolean; category: string; dueDate?: string
}) {
  await db.insert(tasks).values({ id: randomUUID(), ...data })
  revalidatePath('/')
}

// Public: the wife page posts here (untrusted input — clamp title & points).
export async function createWifeTask(title: string, points: number): Promise<{ ok: boolean }> {
  const clean = title.trim().slice(0, 120)
  if (!clean) return { ok: false }
  const pts = Math.max(1, Math.min(500, Math.round(points) || 1))
  await db.insert(tasks).values({
    id: randomUUID(), title: clean, points: pts, category: 'social', source: 'wife', isMinimumViable: false,
  })
  const { sendPushToAll } = await import('@/lib/push-server')
  await sendPushToAll({ title: 'New task from your wife', body: `${clean} (+${pts} good boy points)`, url: '/' })
  revalidatePath('/')
  return { ok: true }
}

export async function updateTask(id: string, data: Partial<{
  title: string; description: string; points: number; isMinimumViable: boolean; category: string; dueDate: string; isActive: boolean
}>) {
  await db.update(tasks).set(data).where(eq(tasks.id, id))
  revalidatePath('/')
}

export async function deleteTask(id: string) {
  await db.update(tasks).set({ isActive: false }).where(eq(tasks.id, id))
  revalidatePath('/')
}
