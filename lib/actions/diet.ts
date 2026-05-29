'use server'

import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'
import { eq, max } from 'drizzle-orm'
import { db } from '@/lib/db'
import { dietGoals, dietMeals, dietRules, waterLogs } from '@/lib/db/schema'
import { todayString } from '@/lib/utils'

export async function upsertDietGoals(data: {
  trainingCalories: number; trainingProtein: number; trainingCarbs: number; trainingFat: number;
  restCalories: number; restProtein: number; restCarbs: number; restFat: number;
  waterGoalMl: number;
}) {
  const existing = await db.select().from(dietGoals).where(eq(dietGoals.id, 1))
  if (existing.length > 0) {
    await db.update(dietGoals).set(data).where(eq(dietGoals.id, 1))
  } else {
    await db.insert(dietGoals).values({ id: 1, ...data })
  }
  revalidatePath('/diet')
}

export async function updateDietMeal(id: string, data: {
  name?: string
  timeWindow?: string | null
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
  notes?: string | null
}) {
  await db.update(dietMeals).set(data).where(eq(dietMeals.id, id))
  revalidatePath('/diet')
}

export async function addDietRule(category: string, text: string) {
  if (!text.trim()) return
  const rows = await db.select({ m: max(dietRules.ruleOrder) }).from(dietRules)
    .where(eq(dietRules.category, category))
  const order = (rows[0]?.m ?? 0) + 1
  await db.insert(dietRules).values({ id: randomUUID(), category, text: text.trim(), ruleOrder: order })
  revalidatePath('/diet')
}

export async function updateDietRule(id: string, text: string) {
  if (!text.trim()) return
  await db.update(dietRules).set({ text: text.trim() }).where(eq(dietRules.id, id))
  revalidatePath('/diet')
}

export async function deleteDietRule(id: string) {
  await db.delete(dietRules).where(eq(dietRules.id, id))
  revalidatePath('/diet')
}

export async function logWater(amountMl: number) {
  if (amountMl <= 0) return
  await db.insert(waterLogs).values({ id: randomUUID(), date: todayString(), amountMl })
  revalidatePath('/diet')
}

export async function deleteWaterLog(id: string) {
  await db.delete(waterLogs).where(eq(waterLogs.id, id))
  revalidatePath('/diet')
}
