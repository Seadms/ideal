'use server'

import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'
import { and, eq, max } from 'drizzle-orm'
import { db } from '@/lib/db'
import { splitDays, splitExercises, exerciseLogs } from '@/lib/db/schema'
import { todayString } from '@/lib/utils'

// ── Split Days ────────────────────────────────────────────────────────────────

export async function createSplitDay(name: string) {
  if (!name.trim()) return
  const rows = await db.select({ m: max(splitDays.dayOrder) }).from(splitDays)
  const order = (rows[0]?.m ?? 0) + 1
  await db.insert(splitDays).values({ id: randomUUID(), name: name.trim(), dayOrder: order })
  revalidatePath('/gym')
}

export async function updateSplitDay(id: string, name: string) {
  if (!name.trim()) return
  await db.update(splitDays).set({ name: name.trim() }).where(eq(splitDays.id, id))
  revalidatePath('/gym')
}

export async function deleteSplitDay(id: string) {
  const exercises = await db.select({ id: splitExercises.id }).from(splitExercises)
    .where(eq(splitExercises.splitDayId, id))
  for (const ex of exercises) {
    await db.delete(exerciseLogs).where(eq(exerciseLogs.exerciseId, ex.id))
  }
  await db.delete(splitExercises).where(eq(splitExercises.splitDayId, id))
  await db.delete(splitDays).where(eq(splitDays.id, id))
  revalidatePath('/gym')
}

// ── Split Exercises ───────────────────────────────────────────────────────────

export async function addSplitExercise(data: {
  splitDayId: string
  name: string
  defaultSets: number
  defaultReps: number
  defaultWeight: number
  defaultUnit: string
}) {
  if (!data.name.trim()) return
  const rows = await db.select({ m: max(splitExercises.exerciseOrder) }).from(splitExercises)
    .where(eq(splitExercises.splitDayId, data.splitDayId))
  const order = (rows[0]?.m ?? 0) + 1
  await db.insert(splitExercises).values({ id: randomUUID(), ...data, name: data.name.trim(), exerciseOrder: order })
  revalidatePath('/gym')
}

export async function updateSplitExercise(id: string, data: Partial<{
  name: string
  defaultSets: number
  defaultReps: number
  defaultWeight: number
  defaultUnit: string
}>) {
  await db.update(splitExercises).set(data).where(eq(splitExercises.id, id))
  revalidatePath('/gym')
}

export async function deleteSplitExercise(id: string) {
  await db.delete(exerciseLogs).where(eq(exerciseLogs.exerciseId, id))
  await db.delete(splitExercises).where(eq(splitExercises.id, id))
  revalidatePath('/gym')
}

// ── Session Logging ───────────────────────────────────────────────────────────

export async function logWorkoutSession(entries: {
  exerciseId: string
  sets: number
  reps: number
  weight: number
  unit: string
}[]) {
  const today = todayString()
  for (const entry of entries) {
    // Upsert today's log
    const existing = await db.select().from(exerciseLogs)
      .where(and(eq(exerciseLogs.exerciseId, entry.exerciseId), eq(exerciseLogs.date, today)))
    if (existing.length > 0) {
      await db.update(exerciseLogs)
        .set({ sets: entry.sets, reps: entry.reps, weight: entry.weight, unit: entry.unit })
        .where(eq(exerciseLogs.id, existing[0].id))
    } else {
      await db.insert(exerciseLogs).values({ id: randomUUID(), date: today, ...entry })
    }
    // Update defaults so next session pre-fills with these values
    await db.update(splitExercises)
      .set({ defaultSets: entry.sets, defaultReps: entry.reps, defaultWeight: entry.weight, defaultUnit: entry.unit })
      .where(eq(splitExercises.id, entry.exerciseId))
  }
  revalidatePath('/gym')
}
