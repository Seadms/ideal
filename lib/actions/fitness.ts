'use server'

import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { nutritionEntries, nutritionGoals } from '@/lib/db/schema'
import { todayString } from '@/lib/utils'

export async function logNutritionEntry(data: {
  mealName: string
  calories: number
  protein: number
  carbs: number
  fats: number
}) {
  await db.insert(nutritionEntries).values({ id: randomUUID(), date: todayString(), ...data })
  revalidatePath('/gym')
}

export async function deleteNutritionEntry(id: string) {
  await db.delete(nutritionEntries).where(eq(nutritionEntries.id, id))
  revalidatePath('/gym')
}

/**
 * @deprecated Daily macro targets now live in `diet_goals` as the single source
 * of truth — use `updateDailyMacroTargets` in `lib/actions/diet.ts`. Kept only
 * so the legacy `nutrition_goals` table stays writable for old backups.
 */
export async function updateNutritionGoals(data: {
  caloriesGoal: number
  proteinGoal: number
  carbsGoal: number
  fatsGoal: number
}) {
  const existing = await db.select().from(nutritionGoals).where(eq(nutritionGoals.id, 1))
  if (existing.length > 0) {
    await db.update(nutritionGoals).set(data).where(eq(nutritionGoals.id, 1))
  } else {
    await db.insert(nutritionGoals).values({ id: 1, ...data })
  }
  revalidatePath('/gym')
}
