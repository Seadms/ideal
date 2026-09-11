'use server'

import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { scheduledTasks, scheduledTaskCompletions } from '@/lib/db/schema'
import { todayString } from '@/lib/utils'

export async function createScheduledTask(data: {
  title: string
  description?: string
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

export async function completeScheduledTask(taskId: string) {
  const today = todayString()

  const taskRows = await db.select().from(scheduledTasks).where(eq(scheduledTasks.id, taskId))
  const task = taskRows[0]
  if (!task || !task.isActive) return

  // Prevent double-completion on the same day
  const existing = await db.select().from(scheduledTaskCompletions)
    .where(and(eq(scheduledTaskCompletions.taskId, taskId), eq(scheduledTaskCompletions.completedDate, today)))
  if (existing.length > 0) return

  await db.insert(scheduledTaskCompletions).values({
    id: randomUUID(), taskId, completedDate: today, pointsEarned: 0,
  })

  // One-time tasks disappear permanently after completion
  if (task.recurrenceType === 'once') {
    await db.update(scheduledTasks).set({ isActive: false }).where(eq(scheduledTasks.id, taskId))
  }

  revalidatePath('/')
}

export async function uncompleteScheduledTask(taskId: string) {
  const today = todayString()
  const existing = await db.select().from(scheduledTaskCompletions)
    .where(and(eq(scheduledTaskCompletions.taskId, taskId), eq(scheduledTaskCompletions.completedDate, today)))
  if (existing.length === 0) return

  await db.delete(scheduledTaskCompletions)
    .where(and(eq(scheduledTaskCompletions.taskId, taskId), eq(scheduledTaskCompletions.completedDate, today)))

  // Completing a one-time task deactivates it — undoing the completion has to
  // bring it back, or the task disappears with no way to complete it again.
  const taskRows = await db.select().from(scheduledTasks).where(eq(scheduledTasks.id, taskId))
  if (taskRows[0]?.recurrenceType === 'once') {
    await db.update(scheduledTasks).set({ isActive: true }).where(eq(scheduledTasks.id, taskId))
  }
  revalidatePath('/')
}
