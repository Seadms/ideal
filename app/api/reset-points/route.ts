import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { userStats, bonusTaskSessions } from '@/lib/db/schema'
import { todayString } from '@/lib/utils'

// ONE-TIME USE — delete this file after running it once
export async function GET() {
  const today = todayString()

  // Reset all point counters to zero
  await db.update(userStats)
    .set({ totalPointsEarned: 0, totalPointsSpent: 0, currentPoints: 0 })
    .where(eq(userStats.id, 1))

  // Reset any accidentally completed bonus session today back to suggested
  await db.update(bonusTaskSessions)
    .set({ state: 'suggested', pointsEarned: null })
    .where(eq(bonusTaskSessions.date, today))

  return NextResponse.json({ ok: true, message: 'Points reset to 0. Delete /app/api/reset-points/route.ts now.' })
}
