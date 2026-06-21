'use server'

import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { bodyweightLogs, benchmarkLogs, progressPhotos } from '@/lib/db/schema'
import { todayString } from '@/lib/utils'

// ── Bodyweight ────────────────────────────────────────────────────────────────

// One entry per day — re-logging today overwrites it.
export async function logBodyweight(weight: number, unit: string = 'lbs') {
  if (!Number.isFinite(weight) || weight <= 0) return
  const date = todayString()
  const existing = await db.select({ id: bodyweightLogs.id }).from(bodyweightLogs)
    .where(eq(bodyweightLogs.date, date))
  if (existing.length > 0) {
    await db.update(bodyweightLogs).set({ weight, unit }).where(eq(bodyweightLogs.id, existing[0].id))
  } else {
    await db.insert(bodyweightLogs).values({ id: randomUUID(), date, weight, unit })
  }
  revalidatePath('/progress')
}

export async function deleteBodyweightLog(id: string) {
  await db.delete(bodyweightLogs).where(eq(bodyweightLogs.id, id))
  revalidatePath('/progress')
}

// ── Benchmarks ────────────────────────────────────────────────────────────────

// Records a new measurement dated today (one per benchmark per day — re-logging
// overwrites). `value` is reps for numeric benchmarks or the 0-based stage index.
export async function logBenchmark(key: string, value: number, label?: string | null) {
  if (!key || !Number.isFinite(value)) return
  const date = todayString()
  const existing = await db.select({ id: benchmarkLogs.id }).from(benchmarkLogs)
    .where(and(eq(benchmarkLogs.key, key), eq(benchmarkLogs.date, date)))
  if (existing.length > 0) {
    await db.update(benchmarkLogs).set({ value, label: label ?? null }).where(eq(benchmarkLogs.id, existing[0].id))
  } else {
    await db.insert(benchmarkLogs).values({ id: randomUUID(), date, key, value, label: label ?? null })
  }
  revalidatePath('/progress')
}

export async function deleteBenchmarkLog(id: string) {
  await db.delete(benchmarkLogs).where(eq(benchmarkLogs.id, id))
  revalidatePath('/progress')
}

// ── Progress photos ───────────────────────────────────────────────────────────

// imageData is a client-compressed JPEG data URL. Replaces an existing photo for
// the same date + pose so a week's set stays to three.
export async function addProgressPhoto(pose: string, imageData: string, date?: string) {
  if (!pose || !imageData?.startsWith('data:image/')) return
  const d = date || todayString()
  const existing = await db.select({ id: progressPhotos.id }).from(progressPhotos)
    .where(and(eq(progressPhotos.date, d), eq(progressPhotos.pose, pose)))
  if (existing.length > 0) {
    await db.update(progressPhotos).set({ imageData }).where(eq(progressPhotos.id, existing[0].id))
  } else {
    await db.insert(progressPhotos).values({ id: randomUUID(), date: d, pose, imageData })
  }
  revalidatePath('/progress')
}

export async function deleteProgressPhoto(id: string) {
  await db.delete(progressPhotos).where(eq(progressPhotos.id, id))
  revalidatePath('/progress')
}
