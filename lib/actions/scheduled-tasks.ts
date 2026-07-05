'use server'

import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'
import { and, eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { scheduledTasks, scheduledTaskCompletions, userStats } from '@/lib/db/schema'
import { todayString, levelFromPoints } from '@/lib/utils'
import type { CompletionResult } from './habits'

export async function createScheduledTask(data: {
  title: string
  description?: string
  points: number
  category: string
  recurrenceType: 'once' | 'weekly'
  scheduledDate?: string
  daysOfWeek?: string
}) {
  await db.insert(scheduledTasks).values({ id: randomUUID(), ...data })
  revalidatePath('/')
}

export async function updateScheduledTask(id: string, data: Partial<{
  title: string
  description: string
  points: number
  category: string
  recurrenceType: 'once' | 'weekly'
  scheduledDate: string
  daysOfWeek: string
  isActive: boolean
}>) {
  await db.update(scheduledTasks).set(data).where(eq(scheduledTasks.id, id))
  revalidatePath('/')
}

export async function deleteScheduledTask(id: string) {
  await db.update(scheduledTasks).set({ isActive: false }).where(eq(scheduledTasks.id, id))
  revalidatePath('/')
}

export async function completeScheduledTask(taskId: string): Promise<CompletionResult> {
  const today = todayString()

  const taskRows = await db.select().from(scheduledTasks).where(eq(scheduledTasks.id, taskId))
  const task = taskRows[0]
  if (!task || !task.isActive) return { leveledUp: false, newLevel: 1, pointsEarned: 0 }

  // Prevent double-completion on the same day
  const existing = await db.select().from(scheduledTaskCompletions)
    .where(and(eq(scheduledTaskCompletions.taskId, taskId), eq(scheduledTaskCompletions.completedDate, today)))
  if (existing.length > 0) return { leveledUp: false, newLevel: 1, pointsEarned: 0 }

  const statsRows = await db.select().from(userStats).where(eq(userStats.id, 1))
  const stats = statsRows[0]
  if (!stats) return { leveledUp: false, newLevel: 1, pointsEarned: 0 }

  const oldLevel = levelFromPoints(stats.totalPointsEarned)

  await db.insert(scheduledTaskCompletions).values({
    id: randomUUID(), taskId, completedDate: today, pointsEarned: task.points,
  })
  await db.update(userStats).set({
    totalPointsEarned: sql`${userStats.totalPointsEarned} + ${task.points}`,
    currentPoints: sql`${userStats.currentPoints} + ${task.points}`,
  }).where(eq(userStats.id, 1))

  // One-time tasks disappear permanently after completion
  if (task.recurrenceType === 'once') {
    await db.update(scheduledTasks).set({ isActive: false }).where(eq(scheduledTasks.id, taskId))
  }

  const newLevel = levelFromPoints(stats.totalPointsEarned + task.points)
  revalidatePath('/')
  return { leveledUp: newLevel > oldLevel, newLevel, pointsEarned: task.points }
}

export async function uncompleteScheduledTask(taskId: string) {
  const today = todayString()
  const existing = await db.select().from(scheduledTaskCompletions)
    .where(and(eq(scheduledTaskCompletions.taskId, taskId), eq(scheduledTaskCompletions.completedDate, today)))
  const completion = existing[0]
  if (!completion) return

  await db.delete(scheduledTaskCompletions)
    .where(and(eq(scheduledTaskCompletions.taskId, taskId), eq(scheduledTaskCompletions.completedDate, today)))

  await db.update(userStats).set({
    totalPointsEarned: sql`${userStats.totalPointsEarned} - ${completion.pointsEarned}`,
    currentPoints: sql`${userStats.currentPoints} - ${completion.pointsEarned}`,
  }).where(eq(userStats.id, 1))

  // Completing a one-time task deactivates it — undoing the completion has to
  // bring it back, or the task disappears with no way to complete it again.
  const taskRows = await db.select().from(scheduledTasks).where(eq(scheduledTasks.id, taskId))
  if (taskRows[0]?.recurrenceType === 'once') {
    await db.update(scheduledTasks).set({ isActive: true }).where(eq(scheduledTasks.id, taskId))
  }
  revalidatePath('/')
}
