import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import * as schema from './schema'

// Production: set TURSO_DATABASE_URL + TURSO_AUTH_TOKEN → remote Turso DB
// Development: falls back to local SQLite file at data/life.db
const tursoUrl = process.env.TURSO_DATABASE_URL
const tursoToken = process.env.TURSO_AUTH_TOKEN

function buildClient() {
  if (tursoUrl) {
    return createClient({ url: tursoUrl, authToken: tursoToken })
  }
  // Local development only — path/fs are Node.js built-ins, always available
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const path = require('path') as typeof import('path')
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fs = require('fs') as typeof import('fs')
  const dataDir = path.join(process.cwd(), 'data')
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
  return createClient({ url: `file:${path.join(dataDir, 'life.db')}` })
}

export const client = buildClient()
export const db = drizzle(client, { schema })

export async function initDb() {
  await client.batch([
    `CREATE TABLE IF NOT EXISTS habits (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      points INTEGER NOT NULL DEFAULT 50,
      is_minimum_viable INTEGER NOT NULL DEFAULT 0,
      category TEXT NOT NULL DEFAULT 'general',
      is_active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      frequency_per_week INTEGER NOT NULL DEFAULT 7,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      points INTEGER NOT NULL DEFAULT 100,
      is_minimum_viable INTEGER NOT NULL DEFAULT 0,
      category TEXT NOT NULL DEFAULT 'general',
      is_completed INTEGER NOT NULL DEFAULT 0,
      completed_at TEXT,
      due_date TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS habit_completions (
      id TEXT PRIMARY KEY,
      habit_id TEXT NOT NULL REFERENCES habits(id),
      completed_date TEXT NOT NULL,
      points_earned INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS rewards (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      cost INTEGER NOT NULL,
      category TEXT NOT NULL DEFAULT 'general',
      is_available INTEGER NOT NULL DEFAULT 1,
      times_redeemed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS reward_redemptions (
      id TEXT PRIMARY KEY,
      reward_id TEXT NOT NULL REFERENCES rewards(id),
      redeemed_at TEXT NOT NULL DEFAULT (datetime('now')),
      points_spent INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS user_stats (
      id INTEGER PRIMARY KEY DEFAULT 1,
      total_points_earned INTEGER NOT NULL DEFAULT 0,
      total_points_spent INTEGER NOT NULL DEFAULT 0,
      current_points INTEGER NOT NULL DEFAULT 0,
      current_streak INTEGER NOT NULL DEFAULT 0,
      longest_streak INTEGER NOT NULL DEFAULT 0,
      last_active_date TEXT,
      reminder_time TEXT,
      streak_freeze_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS push_subscriptions (
      id TEXT PRIMARY KEY,
      endpoint TEXT NOT NULL,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS scheduled_tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      points INTEGER NOT NULL DEFAULT 75,
      category TEXT NOT NULL DEFAULT 'general',
      recurrence_type TEXT NOT NULL DEFAULT 'once',
      scheduled_date TEXT,
      days_of_week TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS scheduled_task_completions (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      completed_date TEXT NOT NULL,
      points_earned INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS bonus_task_pool (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'general',
      points INTEGER NOT NULL DEFAULT 50,
      is_active INTEGER NOT NULL DEFAULT 1
    )`,
    `CREATE TABLE IF NOT EXISTS bonus_task_sessions (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      date TEXT NOT NULL,
      state TEXT NOT NULL DEFAULT 'suggested',
      points_earned INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
  ], 'write')

  const migrations = [
    `ALTER TABLE habits ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE habits ADD COLUMN frequency_per_week INTEGER NOT NULL DEFAULT 7`,
    `ALTER TABLE user_stats ADD COLUMN reminder_time TEXT`,
    `ALTER TABLE user_stats ADD COLUMN streak_freeze_count INTEGER NOT NULL DEFAULT 0`,
  ]
  for (const stmt of migrations) {
    try { await client.execute(stmt) } catch { /* column already exists */ }
  }

  await client.execute(
    `UPDATE habits SET sort_order = rowid WHERE sort_order = 0 AND is_active = 1`
  )
}
