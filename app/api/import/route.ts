import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  habits, tasks, rewards, rewardRedemptions, userStats, habitCompletions,
  bonusTaskSessions, bonusTaskPool, scheduledTasks, scheduledTaskCompletions,
  splitDays, splitExercises, exerciseLogs, exerciseSetLogs, nutritionGoals,
  nutritionEntries, dietGoals, dietMeals, dietRules, waterLogs,
  bodyweightLogs, benchmarkLogs, progressPhotos,
} from '@/lib/db/schema'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return new NextResponse('No file provided', { status: 400 })

    const arrayBuffer = await file.arrayBuffer()
    const isJson = file.name.endsWith('.json') || file.type === 'application/json'

    // Local .db import (only when not using Turso)
    if (!isJson && !process.env.TURSO_DATABASE_URL) {
      const bytes = new Uint8Array(arrayBuffer)
      const magic = Array.from(bytes.slice(0, 15)).map(b => String.fromCharCode(b)).join('')
      if (magic !== 'SQLite format 3') {
        return new NextResponse('Not a valid SQLite database file', { status: 400 })
      }
      const path = require('path') as typeof import('path')
      const fs = require('fs') as typeof import('fs')
      const dataDir = path.join(process.cwd(), 'data')
      const dbPath = path.join(dataDir, 'life.db')
      if (fs.existsSync(dbPath)) {
        const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
        fs.copyFileSync(dbPath, path.join(dataDir, `life.db.pre-import-${stamp}`))
      }
      fs.writeFileSync(dbPath, Buffer.from(arrayBuffer))
      return new NextResponse('OK', { status: 200 })
    }

    if (!isJson) {
      return new NextResponse('Use a .json backup file in cloud mode', { status: 400 })
    }

    // JSON import — works in both local and cloud mode
    const text = new TextDecoder().decode(arrayBuffer)
    const backup = JSON.parse(text)
    if (!Array.isArray(backup.habits)) {
      return new NextResponse('Invalid backup format — expected a .json exported from ideal', { status: 400 })
    }

    // Wipe + restore atomically: a malformed row aborts the whole import and
    // rolls back, so a bad backup can never leave the DB half-wiped.
    await db.transaction(async (tx) => {
      // Wipe existing data in FK-safe order
      await tx.delete(bonusTaskSessions)
      await tx.delete(bonusTaskPool)
      await tx.delete(habitCompletions)
      await tx.delete(rewardRedemptions)
      await tx.delete(scheduledTaskCompletions)
      await tx.delete(scheduledTasks)
      await tx.delete(exerciseSetLogs)
      await tx.delete(exerciseLogs)
      await tx.delete(splitExercises)
      await tx.delete(splitDays)
      await tx.delete(nutritionGoals)
      await tx.delete(nutritionEntries)
      await tx.delete(waterLogs)
      await tx.delete(dietRules)
      await tx.delete(dietMeals)
      await tx.delete(dietGoals)
      await tx.delete(bodyweightLogs)
      await tx.delete(benchmarkLogs)
      await tx.delete(progressPhotos)
      await tx.delete(habits)
      await tx.delete(tasks)
      await tx.delete(rewards)
      await tx.delete(userStats)

      if (backup.habits?.length)                      await tx.insert(habits).values(backup.habits)
      if (backup.tasks?.length)                       await tx.insert(tasks).values(backup.tasks)
      if (backup.rewards?.length)                     await tx.insert(rewards).values(backup.rewards)
      if (backup.userStats?.length)                   await tx.insert(userStats).values(backup.userStats)
      if (backup.habitCompletions?.length)            await tx.insert(habitCompletions).values(backup.habitCompletions)
      if (backup.rewardRedemptions?.length)           await tx.insert(rewardRedemptions).values(backup.rewardRedemptions)
      if (backup.bonusTaskPool?.length)               await tx.insert(bonusTaskPool).values(backup.bonusTaskPool)
      if (backup.bonusTaskSessions?.length)           await tx.insert(bonusTaskSessions).values(backup.bonusTaskSessions)
      if (backup.scheduledTasks?.length)              await tx.insert(scheduledTasks).values(backup.scheduledTasks)
      if (backup.scheduledTaskCompletions?.length)    await tx.insert(scheduledTaskCompletions).values(backup.scheduledTaskCompletions)
      if (backup.splitDays?.length)                   await tx.insert(splitDays).values(backup.splitDays)
      if (backup.splitExercises?.length)              await tx.insert(splitExercises).values(backup.splitExercises)
      if (backup.exerciseLogs?.length)                await tx.insert(exerciseLogs).values(backup.exerciseLogs)
      if (backup.exerciseSetLogs?.length)             await tx.insert(exerciseSetLogs).values(backup.exerciseSetLogs)
      if (backup.nutritionGoals?.length)              await tx.insert(nutritionGoals).values(backup.nutritionGoals)
      if (backup.nutritionEntries?.length)            await tx.insert(nutritionEntries).values(backup.nutritionEntries)
      if (backup.dietGoals?.length)                   await tx.insert(dietGoals).values(backup.dietGoals)
      if (backup.dietMeals?.length)                   await tx.insert(dietMeals).values(backup.dietMeals)
      if (backup.dietRules?.length)                   await tx.insert(dietRules).values(backup.dietRules)
      if (backup.waterLogs?.length)                   await tx.insert(waterLogs).values(backup.waterLogs)
      if (backup.bodyweightLogs?.length)              await tx.insert(bodyweightLogs).values(backup.bodyweightLogs)
      if (backup.benchmarkLogs?.length)               await tx.insert(benchmarkLogs).values(backup.benchmarkLogs)
      if (backup.progressPhotos?.length)              await tx.insert(progressPhotos).values(backup.progressPhotos)
    })

    return new NextResponse('OK', { status: 200 })
  } catch (err) {
    console.error('Import error:', err)
    return new NextResponse('Import failed', { status: 500 })
  }
}
