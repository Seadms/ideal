import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { habits, tasks, rewards, rewardRedemptions, userStats, habitCompletions, bonusTaskSessions } from '@/lib/db/schema'

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
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const path = require('path') as typeof import('path')
      // eslint-disable-next-line @typescript-eslint/no-require-imports
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
    if (backup.version !== 1 || !Array.isArray(backup.habits)) {
      return new NextResponse('Invalid backup format — expected a .json exported from ideal', { status: 400 })
    }

    // Wipe existing data in FK-safe order, then restore
    await db.delete(bonusTaskSessions)
    await db.delete(habitCompletions)
    await db.delete(rewardRedemptions)
    await db.delete(habits)
    await db.delete(tasks)
    await db.delete(rewards)
    await db.delete(userStats)

    if (backup.habits?.length)              await db.insert(habits).values(backup.habits)
    if (backup.tasks?.length)              await db.insert(tasks).values(backup.tasks)
    if (backup.rewards?.length)            await db.insert(rewards).values(backup.rewards)
    if (backup.userStats?.length)          await db.insert(userStats).values(backup.userStats)
    if (backup.habitCompletions?.length)   await db.insert(habitCompletions).values(backup.habitCompletions)
    if (backup.rewardRedemptions?.length)  await db.insert(rewardRedemptions).values(backup.rewardRedemptions)
    if (backup.bonusTaskSessions?.length)  await db.insert(bonusTaskSessions).values(backup.bonusTaskSessions)

    return new NextResponse('OK', { status: 200 })
  } catch (err) {
    console.error('Import error:', err)
    return new NextResponse('Import failed', { status: 500 })
  }
}
