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

export async function setAssistantPrefs(prefs: {
  briefingTime: string | null
  eventLeadMinutes: number
  assignmentAlertHours: number
}) {
  await db.update(userStats).set({
    briefingTime: prefs.briefingTime,
    eventLeadMinutes: Math.max(5, Math.min(180, Math.round(prefs.eventLeadMinutes))),
    assignmentAlertHours: Math.max(2, Math.min(72, Math.round(prefs.assignmentAlertHours))),
  }).where(eq(userStats.id, 1))
  revalidatePath('/settings')
}

// Sends the morning briefing right now — lets you sanity-check the whole
// pipeline (Canvas + calendar + Gemini + push) from the Settings page.
export async function sendTestBriefing(): Promise<{ sent: number; body: string }> {
  const { getDayData, composeBriefing } = await import('@/lib/assistant')
  const { sendPushToAll } = await import('@/lib/push-server')
  const data = await getDayData({ fresh: true })
  const body = await composeBriefing(data)
  const sent = await sendPushToAll({ title: 'Your day, prepared (test)', body, url: '/' })
  return { sent, body }
}
