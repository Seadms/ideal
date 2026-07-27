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
  const path = require('path') as typeof import('path')
  const fs = require('fs') as typeof import('fs')
  const dataDir = path.join(process.cwd(), 'data')
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
  return createClient({ url: `file:${path.join(dataDir, 'life.db')}` })
}

export const client = buildClient()
export const db = drizzle(client, { schema })

// Memoize so the (idempotent) schema setup + seeds run once per warm server
// instance instead of on every force-dynamic request. A failed init clears the
// cache so the next request can retry rather than being stuck on a rejection.
let initPromise: Promise<void> | null = null

export function initDb(): Promise<void> {
  if (!initPromise) {
    initPromise = doInitDb().catch(err => { initPromise = null; throw err })
  }
  return initPromise
}

async function doInitDb() {
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
    `CREATE TABLE IF NOT EXISTS reward_claims (
      id TEXT PRIMARY KEY,
      reward_id TEXT,
      title TEXT NOT NULL,
      cost INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      resolved_at TEXT
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
    `CREATE TABLE IF NOT EXISTS sent_notifications (
      key TEXT PRIMARY KEY,
      sent_at TEXT NOT NULL DEFAULT (datetime('now'))
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
      exercise_type TEXT NOT NULL DEFAULT 'strength',
      target TEXT,
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
    `CREATE TABLE IF NOT EXISTS exercise_set_logs (
      id TEXT PRIMARY KEY,
      exercise_id TEXT NOT NULL,
      date TEXT NOT NULL,
      set_number INTEGER NOT NULL,
      reps INTEGER NOT NULL,
      weight REAL NOT NULL DEFAULT 0,
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
    `CREATE TABLE IF NOT EXISTS bodyweight_logs (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      weight REAL NOT NULL,
      unit TEXT NOT NULL DEFAULT 'lbs',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS benchmark_logs (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      key TEXT NOT NULL,
      value REAL NOT NULL,
      label TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS progress_photos (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      pose TEXT NOT NULL,
      image_data TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
  ], 'write')

  const migrations = [
    `ALTER TABLE habits ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE habits ADD COLUMN frequency_per_week INTEGER NOT NULL DEFAULT 7`,
    `ALTER TABLE user_stats ADD COLUMN reminder_time TEXT`,
    `ALTER TABLE user_stats ADD COLUMN streak_freeze_count INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE user_stats ADD COLUMN briefing_time TEXT`,
    `ALTER TABLE user_stats ADD COLUMN event_lead_minutes INTEGER NOT NULL DEFAULT 30`,
    `ALTER TABLE user_stats ADD COLUMN assignment_alert_hours INTEGER NOT NULL DEFAULT 24`,
    `ALTER TABLE tasks ADD COLUMN source TEXT NOT NULL DEFAULT 'self'`,
    `ALTER TABLE rewards ADD COLUMN source TEXT NOT NULL DEFAULT 'self'`,
    `ALTER TABLE rewards ADD COLUMN max_redemptions INTEGER`,
    `ALTER TABLE rewards ADD COLUMN sold_out_at TEXT`,
    `ALTER TABLE user_stats ADD COLUMN good_boy_points INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE push_subscriptions ADD COLUMN owner TEXT NOT NULL DEFAULT 'self'`,
    // The split is 5 days, so the gym habit can't be a 7-day daily or rest days
    // would make a perfect day unreachable. Only nudges the untouched default.
    `UPDATE habits SET frequency_per_week = 5 WHERE title = 'Hit PPLUL gym split' AND frequency_per_week = 7`,
    `UPDATE habits SET description = 'Push / Pull / Legs / Upper / Lower — follow the current rotation' WHERE title = 'Hit PPLUL gym split'`,
    `ALTER TABLE split_exercises ADD COLUMN exercise_type TEXT NOT NULL DEFAULT 'strength'`,
    `ALTER TABLE split_exercises ADD COLUMN target TEXT`,
    `UPDATE split_exercises SET exercise_type = 'cardio' WHERE name LIKE '%Cardio%'`,
    // Nutrition → fixed cut targets (2300 / 180P / 235C / 70F). Seed the row if
    // missing and migrate the prior seeded defaults (2500 original, 2000 recomp)
    // up to the new plan. User-customised values (any other number) are left alone.
    `INSERT OR IGNORE INTO nutrition_goals (id, calories_goal, protein_goal, carbs_goal, fats_goal) VALUES (1, 2300, 180, 235, 70)`,
    // Every point-award action no-ops silently without the singleton stats row,
    // and a JSON import with an empty userStats array can leave it missing.
    `INSERT OR IGNORE INTO user_stats (id) VALUES (1)`,
    `UPDATE nutrition_goals SET calories_goal = 2300, protein_goal = 180, carbs_goal = 235, fats_goal = 70 WHERE id = 1 AND calories_goal IN (2000, 2500)`,
    // Diet goals → same fixed targets for training & rest, water 3.5 L. Only
    // migrate rows still holding the prior recomp defaults.
    `UPDATE diet_goals SET training_calories = 2300, training_protein = 180, training_carbs = 235, training_fat = 70, rest_calories = 2300, rest_protein = 180, rest_carbs = 235, rest_fat = 70, water_goal_ml = 3500 WHERE id = 1 AND training_calories = 2000 AND rest_calories = 1700`,
    // Emoji purge: seeded exercise targets used the star emoji (U+2B50, via
    // char(11088)) for priority lifts — swap for the monochrome ★ glyph in
    // already-seeded rows.
    `UPDATE split_exercises SET target = REPLACE(target, char(11088), '★') WHERE target LIKE '%' || char(11088) || '%'`,
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
  await seedMobilityHabitIfNeeded()
}

// ── Seed: Daily mobility habit ────────────────────────────────────────────────
// One-time insert so the mobility block (Gym page) feeds the streak and points.

async function seedMobilityHabitIfNeeded() {
  const existing = await client.execute(
    "SELECT id FROM habits WHERE title = 'Mobility routine' LIMIT 1",
  )
  if (existing.rows.length > 0) return
  const maxRow = await client.execute(
    'SELECT COALESCE(MAX(sort_order), 0) AS m FROM habits WHERE is_active = 1',
  )
  const sortOrder = Number(maxRow.rows[0]?.m ?? 0) + 1
  await client.execute({
    sql: `INSERT INTO habits (id, title, description, points, category, frequency_per_week, sort_order)
          VALUES (?, 'Mobility routine', 'About 10 min: squat hold, couch stretch, hangs. Checklist on the Gym page', 30, 'fitness', 7, ?)`,
    args: [randomUUID(), sortOrder],
  })
}

// ── Seed: Max Aesthetics Split — 5-Day Gym PPLUL ─────────────────────────────
// Built for the V-taper look: side delts hit 3×/week and lat width 3×/week (the
// two levers that actually widen the frame), upper chest prioritised over flat
// pressing, and weighted ab work so the midsection reads defined once lean.
// Hip thrusts and RDLs are non-negotiable: glutes and posterior-chain hip drive
// carry over directly to bed, and zone-2 covers the cardiovascular side.
//
// One-time replacement: bumping SPLIT_MARKER triggers a one-time swap of any older
// split for this one. Existing exercise_logs (workout history) are preserved.
// Progression rule for every lift: at the TOP of the rep range with clean form,
// add weight next session (smallest jump available), then work back up the range.

const SPLIT_MARKER = 'Push — Chest / Delts / Triceps'

async function seedSplitIfNeeded() {
  const rows = await client.execute('SELECT id, name FROM split_days')
  const existing = rows.rows
  // Already on the current split — nothing to do.
  if (existing.some(r => r.name === SPLIT_MARKER)) return
  // An older split exists — clear its days/exercises (keep logged history).
  if (existing.length > 0) {
    await client.execute('DELETE FROM split_exercises')
    await client.execute('DELETE FROM split_days')
  }

  type Ex = { name: string; sets: number; reps: number; weight: number; type?: string; target?: string }
  const days: { name: string; order: number; exercises: Ex[] }[] = [
    {
      name: 'Push — Chest / Delts / Triceps', order: 1,
      exercises: [
        { name: 'Incline Barbell Bench Press',            sets: 4, reps: 8,  weight: 0, target: '4 × 6–10 · ★ upper chest — the shelf that reads on a lean frame' },
        { name: 'Flat Dumbbell Press',                    sets: 3, reps: 10, weight: 0, target: '3 × 8–12 · chest thickness' },
        { name: 'Cable Fly / Pec Deck',                   sets: 3, reps: 14, weight: 0, target: '3 × 12–20 · stretch under load, squeeze at the top' },
        { name: 'Seated Dumbbell Shoulder Press',         sets: 3, reps: 10, weight: 0, target: '3 × 8–12 · front delts' },
        { name: 'Cable Lateral Raises',                   sets: 4, reps: 15, weight: 0, target: '4 × 12–20 · ★ shoulder width — go light, no swinging' },
        { name: 'Overhead Cable Triceps Extension',       sets: 3, reps: 12, weight: 0, target: '3 × 10–15 · long head = arm size' },
        { name: 'Rope Pushdown',                          sets: 3, reps: 13, weight: 0, target: '3 × 12–15' },
      ],
    },
    {
      name: 'Pull — Back / Rear Delts / Biceps', order: 2,
      exercises: [
        { name: 'Weighted Pull-ups / Lat Pulldown',       sets: 4, reps: 9,  weight: 0, target: '4 × 6–12 · ★ back width' },
        { name: 'Chest-Supported Row',                    sets: 4, reps: 10, weight: 0, target: '4 × 8–12 · back thickness, no torso English' },
        { name: 'Straight-Arm Pulldown',                  sets: 3, reps: 13, weight: 0, target: '3 × 12–15 · lats without the biceps' },
        { name: 'Cable Face Pulls',                       sets: 3, reps: 18, weight: 0, target: '3 × 15–20 · rear delts + posture' },
        { name: 'Incline Dumbbell Curls',                 sets: 3, reps: 10, weight: 0, target: '3 × 8–12 · biceps peak under stretch' },
        { name: 'Cable Hammer Curls',                     sets: 3, reps: 12, weight: 0, target: '3 × 10–15 · arm thickness' },
      ],
    },
    {
      name: 'Legs — Quads / Glutes / Hamstrings', order: 3,
      exercises: [
        { name: 'Barbell Back Squat',                     sets: 4, reps: 6,  weight: 0, target: '4 × 5–8 · whole-body driver, keep it heavy and clean' },
        { name: 'Romanian Deadlift',                      sets: 3, reps: 10, weight: 0, target: '3 × 8–12 · ★ hamstrings + glutes · hinge, feel the stretch' },
        { name: 'Leg Press',                              sets: 3, reps: 12, weight: 0, target: '3 × 10–15 · quad volume without spinal load' },
        { name: 'Bulgarian Split Squat',                  sets: 3, reps: 10, weight: 0, target: '3 × 8–12 per leg · glutes + single-leg balance' },
        { name: 'Seated Leg Curl',                        sets: 3, reps: 12, weight: 0, target: '3 × 10–15 · hamstrings' },
        { name: 'Standing Calf Raise',                    sets: 4, reps: 12, weight: 0, target: '4 × 10–15 · pause at the bottom' },
      ],
    },
    {
      name: 'Upper — Delts / Back Width / Arms', order: 4,
      exercises: [
        { name: 'Cable Lateral Raises',                   sets: 4, reps: 15, weight: 0, target: '4 × 12–20 · ★ shoulder width (2nd weekly hit)' },
        { name: 'Wide-Grip Lat Pulldown',                 sets: 4, reps: 11, weight: 0, target: '4 × 10–12 · ★ width, drive elbows down' },
        { name: 'Incline Dumbbell Press',                 sets: 3, reps: 10, weight: 0, target: '3 × 8–12 · upper chest again' },
        { name: 'Reverse Pec Deck',                       sets: 3, reps: 18, weight: 0, target: '3 × 15–20 · rear delts round out the shoulder' },
        { name: 'EZ-Bar Curl',                            sets: 3, reps: 10, weight: 0, target: '3 × 8–12' },
        { name: 'Skull Crushers',                         sets: 3, reps: 11, weight: 0, target: '3 × 10–12' },
      ],
    },
    {
      name: 'Lower + Core — Glutes / Abs / Conditioning', order: 5,
      exercises: [
        { name: 'Barbell Hip Thrust',                     sets: 4, reps: 10, weight: 0, target: '4 × 8–12 · ★ glutes + hip drive · full lockout, pause at top' },
        { name: 'Hack Squat / Leg Press',                 sets: 3, reps: 12, weight: 0, target: '3 × 10–15 · quads' },
        { name: 'Lying Leg Curl',                         sets: 3, reps: 12, weight: 0, target: '3 × 10–15 · hamstrings' },
        { name: 'Cable Crunch',                           sets: 4, reps: 13, weight: 0, target: '4 × 12–15 · ★ weighted abs — thickness is what shows at low body fat' },
        { name: 'Hanging Leg Raise',                      sets: 3, reps: 14, weight: 0, target: '3 × 10–20 · lower abs, no swinging' },
        { name: 'Zone 2 Cardio',                          sets: 1, reps: 25, weight: 0, type: 'cardio', target: '25 min · conversational pace · heart health + stamina' },
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
          (id, split_day_id, name, exercise_order, exercise_type, target, default_sets, default_reps, default_weight, default_unit)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [randomUUID(), dayId, ex.name, i + 1, ex.type ?? 'strength', ex.target ?? null, ex.sets, ex.reps, ex.weight, ex.type === 'cardio' ? 'min' : ex.type === 'hold' ? 'sec' : 'lbs'],
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
        VALUES (1, 2300, 180, 235, 70, 2300, 180, 235, 70, 3500)`,
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
      { cat: 'always',     text: '3.5–4 L water daily (4 L on training days)', ord: 1 },
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
