'use server'

import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { userStats } from '@/lib/db/schema'

export async function setReminderTime(time: string | null) {
  await db.update(userStats).set({ reminderTime: time }).where(eq(userStats.id, 1))
  revalidatePath('/settings')
  revalidatePath('/')
}
