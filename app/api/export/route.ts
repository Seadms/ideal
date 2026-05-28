import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { habits, tasks, rewards, rewardRedemptions, userStats, habitCompletions, bonusTaskSessions } from '@/lib/db/schema'

export async function GET() {
  // Local mode: serve the raw SQLite file
  if (!process.env.TURSO_DATABASE_URL) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const path = require('path') as typeof import('path')
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require('fs') as typeof import('fs')
      const dbPath = path.join(process.cwd(), 'data', 'life.db')
      if (fs.existsSync(dbPath)) {
        const buffer = fs.readFileSync(dbPath)
        const date = new Date().toISOString().split('T')[0]
        return new NextResponse(buffer, {
          headers: {
            'Content-Type': 'application/octet-stream',
            'Content-Disposition': `attachment; filename="ideal-backup-${date}.db"`,
          },
        })
      }
    } catch { /* fall through to JSON export */ }
  }

  // Cloud mode (or local fallback): export all tables as JSON
  const [
    habitsData, tasksData, rewardsData,
    redemptionsData, statsData, completionsData, bonusSessionsData,
  ] = await Promise.all([
    db.select().from(habits),
    db.select().from(tasks),
    db.select().from(rewards),
    db.select().from(rewardRedemptions),
    db.select().from(userStats),
    db.select().from(habitCompletions),
    db.select().from(bonusTaskSessions),
  ])

  const backup = {
    exportedAt: new Date().toISOString(),
    version: 1,
    habits: habitsData,
    tasks: tasksData,
    rewards: rewardsData,
    rewardRedemptions: redemptionsData,
    userStats: statsData,
    habitCompletions: completionsData,
    bonusTaskSessions: bonusSessionsData,
  }

  const date = new Date().toISOString().split('T')[0]
  return new NextResponse(JSON.stringify(backup, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="ideal-backup-${date}.json"`,
    },
  })
}
