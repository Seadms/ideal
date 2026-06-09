import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  habits, tasks, rewards, rewardRedemptions, userStats, habitCompletions,
  bonusTaskSessions, bonusTaskPool, scheduledTasks, scheduledTaskCompletions,
  splitDays, splitExercises, exerciseLogs, nutritionGoals,
  dietGoals, dietMeals, dietRules, waterLogs,
} from '@/lib/db/schema'

export async function GET() {
  // Local mode: serve the raw SQLite file
  if (!process.env.TURSO_DATABASE_URL) {
    try {
      const path = require('path') as typeof import('path')
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
    redemptionsData, statsData, completionsData, bonusSessionsData, bonusPoolData,
    scheduledTasksData, scheduledCompletionsData,
    splitDaysData, splitExercisesData, exerciseLogsData, nutritionGoalsData,
    dietGoalsData, dietMealsData, dietRulesData, waterLogsData,
  ] = await Promise.all([
    db.select().from(habits),
    db.select().from(tasks),
    db.select().from(rewards),
    db.select().from(rewardRedemptions),
    db.select().from(userStats),
    db.select().from(habitCompletions),
    db.select().from(bonusTaskSessions),
    db.select().from(bonusTaskPool),
    db.select().from(scheduledTasks),
    db.select().from(scheduledTaskCompletions),
    db.select().from(splitDays),
    db.select().from(splitExercises),
    db.select().from(exerciseLogs),
    db.select().from(nutritionGoals),
    db.select().from(dietGoals),
    db.select().from(dietMeals),
    db.select().from(dietRules),
    db.select().from(waterLogs),
  ])

  const backup = {
    exportedAt: new Date().toISOString(),
    version: 2,
    habits: habitsData,
    tasks: tasksData,
    rewards: rewardsData,
    rewardRedemptions: redemptionsData,
    userStats: statsData,
    habitCompletions: completionsData,
    bonusTaskSessions: bonusSessionsData,
    bonusTaskPool: bonusPoolData,
    scheduledTasks: scheduledTasksData,
    scheduledTaskCompletions: scheduledCompletionsData,
    splitDays: splitDaysData,
    splitExercises: splitExercisesData,
    exerciseLogs: exerciseLogsData,
    nutritionGoals: nutritionGoalsData,
    dietGoals: dietGoalsData,
    dietMeals: dietMealsData,
    dietRules: dietRulesData,
    waterLogs: waterLogsData,
  }

  const date = new Date().toISOString().split('T')[0]
  return new NextResponse(JSON.stringify(backup, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="ideal-backup-${date}.json"`,
    },
  })
}
