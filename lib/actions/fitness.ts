'use server'

import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { workoutEntries, nutritionEntries } from '@/lib/db/schema'
import { todayString } from '@/lib/utils'

export async function logWorkoutEntry(data: {
  exerciseName: string
  sets: number
  reps: number
  weight: number
  unit: string
}) {
  await db.insert(workoutEntries).values({ id: randomUUID(), date: todayString(), ...data })
  revalidatePath('/gym')
}

export async function deleteWorkoutEntry(id: string) {
  await db.delete(workoutEntries).where(eq(workoutEntries.id, id))
  revalidatePath('/gym')
}

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
