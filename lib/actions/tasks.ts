'use server'

import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { tasks, userStats } from '@/lib/db/schema'
import { levelFromPoints, todayString } from '@/lib/utils'
import type { CompletionResult } from './habits'

export async function completeTask(taskId: string): Promise<CompletionResult> {
  const rows = await db.select().from(tasks).where(eq(tasks.id, taskId))
  const task = rows[0]
  if (!task || task.isCompleted) return { leveledUp: false, newLevel: 1, pointsEarned: 0 }

  const statsRows = await db.select().from(userStats).where(eq(userStats.id, 1))
  const stats = statsRows[0]
  if (!stats) return { leveledUp: false, newLevel: 1, pointsEarned: 0 }

  const oldLevel = levelFromPoints(stats.totalPointsEarned)

  await db.update(tasks)
    .set({ isCompleted: true, completedAt: new Date().toISOString() })
    .where(eq(tasks.id, taskId))
  await db.update(userStats).set({
    totalPointsEarned: stats.totalPointsEarned + task.points,
    currentPoints: stats.currentPoints + task.points,
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

  const statsRows = await db.select().from(userStats).where(eq(userStats.id, 1))
  const stats = statsRows[0]
  if (stats) {
    await db.update(userStats).set({
      totalPointsEarned: Math.max(0, stats.totalPointsEarned - task.points),
      currentPoints: Math.max(0, stats.currentPoints - task.points),
    }).where(eq(userStats.id, 1))
  }
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
