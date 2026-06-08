import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { randomUUID } from 'crypto'
import * as schema from './schema'

const tursoUrl = process.env.TURSO_DATABASE_URL
const tursoToken = process.env.TURSO_AUTH_TOKEN

function buildClient() {
  if (tursoUrl) {
    return createClient({ url: tursoUrl, authToken: tursoToken })
  }
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
    `CREATE TABLE IF NOT EXISTS split_days (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      day_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS split_exercises (
      id TEXT PRIMARY KEY,
      split_day_id TEXT NOT NULL,
      name TEXT NOT NULL,
      exercise_order INTEGER NOT NULL DEFAULT 0,
      default_sets INTEGER NOT NULL DEFAULT 3,
      default_reps INTEGER NOT NULL DEFAULT 8,
      default_weight REAL NOT NULL DEFAULT 0,
      default_unit TEXT NOT NULL DEFAULT 'lbs',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS exercise_logs (
      id TEXT PRIMARY KEY,
      exercise_id TEXT NOT NULL,
      date TEXT NOT NULL,
      sets INTEGER NOT NULL,
      reps INTEGER NOT NULL,
      weight REAL NOT NULL,
      unit TEXT NOT NULL DEFAULT 'lbs',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS nutrition_goals (
      id INTEGER PRIMARY KEY DEFAULT 1,
      calories_goal INTEGER NOT NULL DEFAULT 2500,
      protein_goal INTEGER NOT NULL DEFAULT 180,
      carbs_goal INTEGER NOT NULL DEFAULT 280,
      fats_goal INTEGER NOT NULL DEFAULT 70
    )`,
    `CREATE TABLE IF NOT EXISTS nutrition_entries (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      meal_name TEXT NOT NULL,
      calories INTEGER NOT NULL DEFAULT 0,
      protein REAL NOT NULL DEFAULT 0,
      carbs REAL NOT NULL DEFAULT 0,
      fats REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS diet_goals (
      id INTEGER PRIMARY KEY DEFAULT 1,
      training_calories INTEGER NOT NULL DEFAULT 2000,
      training_protein INTEGER NOT NULL DEFAULT 160,
      training_carbs INTEGER NOT NULL DEFAULT 180,
      training_fat INTEGER NOT NULL DEFAULT 55,
      rest_calories INTEGER NOT NULL DEFAULT 1700,
      rest_protein INTEGER NOT NULL DEFAULT 160,
      rest_carbs INTEGER NOT NULL DEFAULT 100,
      rest_fat INTEGER NOT NULL DEFAULT 55,
      water_goal_ml INTEGER NOT NULL DEFAULT 2750
    )`,
    `CREATE TABLE IF NOT EXISTS diet_meals (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      time_window TEXT,
      calories INTEGER NOT NULL DEFAULT 0,
      protein INTEGER NOT NULL DEFAULT 0,
      carbs INTEGER NOT NULL DEFAULT 0,
      fat INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      meal_order INTEGER NOT NULL DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS diet_rules (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      text TEXT NOT NULL,
      rule_order INTEGER NOT NULL DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS water_logs (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      amount_ml INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
  ], 'write')

  const migrations = [
    `ALTER TABLE habits ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE habits ADD COLUMN frequency_per_week INTEGER NOT NULL DEFAULT 7`,
    `ALTER TABLE user_stats ADD COLUMN reminder_time TEXT`,
    `ALTER TABLE user_stats ADD COLUMN streak_freeze_count INTEGER NOT NULL DEFAULT 0`,
    // Sync nutrition_goals to match Ethereal Split diet plan targets
    `INSERT OR IGNORE INTO nutrition_goals (id, calories_goal, protein_goal, carbs_goal, fats_goal) VALUES (1, 2000, 160, 180, 55)`,
    `UPDATE nutrition_goals SET calories_goal = 2000, protein_goal = 160, carbs_goal = 180, fats_goal = 55 WHERE id = 1 AND calories_goal = 2500`,
    `ALTER TABLE split_exercises ADD COLUMN exercise_type TEXT NOT NULL DEFAULT 'strength'`,
    `UPDATE split_exercises SET exercise_type = 'cardio' WHERE name LIKE '%Cardio%'`,
  ]
  for (const stmt of migrations) {
    try { await client.execute(stmt) } catch { /* column already exists */ }
  }

  await client.execute(
    `UPDATE habits SET sort_order = rowid WHERE sort_order = 0 AND is_active = 1`
  )

  await seedSplitIfNeeded()
  await seedDietIfEmpty()
  await seedHouseholdTasksIfNeeded()
}

// ── Seed: Home Calisthenics Split (Rings & Pull-up Bar) ───────────────────────
// One-time replacement: if the old gym split is present, swap it for the home
// calisthenics split. Existing exercise_logs (workout history) are preserved.

const HOME_SPLIT_MARKER = 'Width & Biceps (Vertical Pull)'

async function seedSplitIfNeeded() {
  const rows = await client.execute('SELECT id, name FROM split_days')
  const existing = rows.rows
  // Already on the home split — nothing to do.
  if (existing.some(r => r.name === HOME_SPLIT_MARKER)) return
  // An older split exists — clear its days/exercises (keep logged history).
  if (existing.length > 0) {
    await client.execute('DELETE FROM split_exercises')
    await client.execute('DELETE FROM split_days')
  }

  type Ex = { name: string; sets: number; reps: number; weight: number; type?: string }
  const days: { name: string; order: number; exercises: Ex[] }[] = [
    {
      // Vertical pull = lat width (the V-taper). Only the last set of each
      // pull-up goes to true failure; chin-ups trimmed to 3 sets to protect
      // grip/elbows for the rest of the day.
      name: 'Width & Biceps (Vertical Pull)', order: 1,
      exercises: [
        { name: 'Wide-Grip Pull-ups (last set to failure)', sets: 4, reps: 6,  weight: 0 },
        { name: 'Neutral-Grip Ring Pull-ups',               sets: 4, reps: 8,  weight: 0 },
        { name: 'Chin-ups',                                 sets: 3, reps: 8,  weight: 0 },
        { name: 'Ring Bicep Curls',                         sets: 4, reps: 12, weight: 0 },
      ],
    },
    {
      // Chest restored (ring dips + flyes) and a direct lateral-delt movement
      // added — side-delt width + a full chest are the front-on aesthetic.
      name: 'Chest, Shoulders & Triceps (Push)', order: 2,
      exercises: [
        { name: 'Ring Dips (chest lean)',          sets: 4, reps: 8,  weight: 0 },
        { name: 'Ring Chest Flyes',                sets: 4, reps: 12, weight: 0 },
        { name: 'Handstand / Pike Push-ups',       sets: 4, reps: 8,  weight: 0 },
        { name: 'Banded Lateral Raises',           sets: 4, reps: 15, weight: 0 },
        { name: 'Diamond Push-ups (to failure)',   sets: 4, reps: 12, weight: 0 },
      ],
    },
    {
      // Horizontal pull = back thickness; towel work builds forearms/grip.
      name: 'Back Thickness & Forearms (Horizontal Pull)', order: 3,
      exercises: [
        { name: 'Inverted Ring Rows',          sets: 4, reps: 12, weight: 0 },
        { name: 'One-Arm Ring Rows (per arm)', sets: 4, reps: 10, weight: 0 },
        { name: 'Towel Pull-ups',              sets: 4, reps: 6,  weight: 0 },
        { name: 'Towel Hangs (sec)',           sets: 3, reps: 30, weight: 0 },
      ],
    },
    {
      name: 'Legs & Core', order: 4,
      exercises: [
        { name: 'Pistol Squats (per leg)',          sets: 4, reps: 6,  weight: 0 },
        { name: 'Bulgarian Split Squats (per leg)', sets: 4, reps: 12, weight: 0 },
        { name: 'Explosive Switching Lunges',       sets: 4, reps: 20, weight: 0 },
        { name: 'Hollow Body Holds (sec)',          sets: 4, reps: 45, weight: 0 },
      ],
    },
    {
      // Second hit on the highest-visual-impact areas. Weighted pull-ups give
      // the progressive-overload top end bodyweight reps eventually lose.
      name: 'Aesthetic Finish (V-Taper & Core)', order: 5,
      exercises: [
        { name: 'Weighted Pull-ups (backpack)', sets: 4, reps: 6,  weight: 0 },
        { name: 'Ring Chest Flyes',             sets: 4, reps: 10, weight: 0 },
        { name: 'Ring Bicep Curls',             sets: 4, reps: 12, weight: 0 },
        { name: 'Dragon Flags',                 sets: 4, reps: 6,  weight: 0 },
      ],
    },
  ]

  for (const day of days) {
    const dayId = randomUUID()
    await client.execute({
      sql: 'INSERT INTO split_days (id, name, day_order) VALUES (?, ?, ?)',
      args: [dayId, day.name, day.order],
    })
    for (let i = 0; i < day.exercises.length; i++) {
      const ex = day.exercises[i]
      await client.execute({
        sql: `INSERT INTO split_exercises
          (id, split_day_id, name, exercise_order, exercise_type, default_sets, default_reps, default_weight, default_unit)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [randomUUID(), dayId, ex.name, i + 1, ex.type ?? 'strength', ex.sets, ex.reps, ex.weight, ex.type === 'cardio' ? 'min' : 'lbs'],
      })
    }
  }
}

// ── Seed: Diet ────────────────────────────────────────────────────────────────

async function seedDietIfEmpty() {
  const goalRows = await client.execute('SELECT id FROM diet_goals LIMIT 1')
  if (goalRows.rows.length === 0) {
    await client.execute({
      sql: `INSERT INTO diet_goals
        (id, training_calories, training_protein, training_carbs, training_fat,
         rest_calories, rest_protein, rest_carbs, rest_fat, water_goal_ml)
        VALUES (1, 2000, 160, 180, 55, 1700, 160, 100, 55, 2750)`,
      args: [],
    })
  }

  const mealRows = await client.execute('SELECT id FROM diet_meals LIMIT 1')
  if (mealRows.rows.length === 0) {
    const meals = [
      {
        name: 'Morning Protein Anchor', timeWindow: '7–8 AM',
        calories: 450, protein: 35, carbs: 32, fat: 14, order: 1,
        notes: '5 egg whites + 2 whole eggs scrambled\n½ cup oats with cinnamon\nBlack coffee',
      },
      {
        name: 'Lean Midday Refuel', timeWindow: '12 PM',
        calories: 500, protein: 47, carbs: 40, fat: 12, order: 2,
        notes: '150g grilled chicken breast (45g protein)\n¾ cup jasmine rice cooked (38g carbs)\nLarge salad with lemon + olive oil',
      },
      {
        name: 'Performance Primer', timeWindow: '3–4 PM',
        calories: 300, protein: 18, carbs: 38, fat: 8, order: 3,
        notes: '1 cup non-fat Greek yogurt (17g protein)\n1 banana + handful blueberries (35g carbs)',
      },
      {
        name: 'Recovery Window', timeWindow: '7–8 PM',
        calories: 500, protein: 42, carbs: 28, fat: 16, order: 4,
        notes: '150g salmon or lean ground beef (40g protein)\nMedium sweet potato (26g carbs)\nRoasted broccoli or asparagus',
      },
      {
        name: 'Slow-Burn Night Protein', timeWindow: '9–10 PM',
        calories: 250, protein: 26, carbs: 8, fat: 14, order: 5,
        notes: '1 cup cottage cheese or casein shake (25g protein)\nHandful of almonds',
      },
    ]
    for (const m of meals) {
      await client.execute({
        sql: `INSERT INTO diet_meals (id, name, time_window, calories, protein, carbs, fat, notes, meal_order)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [randomUUID(), m.name, m.timeWindow, m.calories, m.protein, m.carbs, m.fat, m.notes, m.order],
      })
    }

    const rules = [
      { cat: 'always',     text: '2.5–3L water daily',              ord: 1 },
      { cat: 'always',     text: 'Protein within 45 min post-lift', ord: 2 },
      { cat: 'always',     text: 'Sleep 7–9 hours',                 ord: 3 },
      { cat: 'always',     text: 'Zone 2 every lifting day',        ord: 4 },
      { cat: 'always',     text: 'Keep sodium under 1,500mg',       ord: 5 },
      { cat: 'never',      text: 'Dirty bulk',                      ord: 1 },
      { cat: 'never',      text: 'Alcohol',                         ord: 2 },
      { cat: 'never',      text: 'Eat under 1,500 kcal',            ord: 3 },
      { cat: 'never',      text: 'Skip sodium control',             ord: 4 },
      { cat: 'supplement', text: '5g creatine monohydrate daily',   ord: 1 },
    ]
    for (const r of rules) {
      await client.execute({
        sql: 'INSERT INTO diet_rules (id, category, text, rule_order) VALUES (?, ?, ?, ?)',
        args: [randomUUID(), r.cat, r.text, r.ord],
      })
    }
  }
}

// ── Seed: Household Scheduled Tasks ──────────────────────────────────────────

async function seedHouseholdTasksIfNeeded() {
  const existing = await client.execute('SELECT title FROM scheduled_tasks')
  const titles = new Set(existing.rows.map(r => r[0] as string))

  const ALL_DAYS = '0,1,2,3,4,5,6'
  const tasks = [
    // Daily
    { title: '5-minute bedroom reset',                   days: ALL_DAYS, points: 25 },
    { title: 'Do dishes',                                days: ALL_DAYS, points: 25 },
    { title: 'Scoop litter box & rinse/refill cat bowls', days: ALL_DAYS, points: 50 },
    // Weekly
    { title: 'Dust and vacuum master bedroom',           days: '1', points: 75 }, // Mon
    { title: 'Vacuum cat area and wipe kitchen counters', days: '2', points: 75 }, // Tue
    { title: 'Clothes laundry',                          days: '3', points: 75 }, // Wed
    { title: 'Clean bathroom (sink, bathtub, etc.)',     days: '4', points: 75 }, // Thu
    { title: 'Wash towels',                              days: '4', points: 50 }, // Thu
    { title: 'Wash sheets and pillowcases',              days: '5', points: 75 }, // Fri
    { title: 'Organize closet',                          days: '6', points: 75 }, // Sat
  ]

  for (const t of tasks) {
    if (titles.has(t.title)) continue
    await client.execute({
      sql: `INSERT INTO scheduled_tasks (id, title, category, points, recurrence_type, days_of_week, is_active)
            VALUES (?, ?, 'home', ?, 'weekly', ?, 1)`,
      args: [randomUUID(), t.title, t.points, t.days],
    })
  }
}
