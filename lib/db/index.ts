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
      water_goal_ml INTEGER NOT NULL DEFAULT 4000
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
    `CREATE TABLE IF NOT EXISTS sleep_logs (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      hours REAL NOT NULL,
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
    // The split is 4 days, so the gym habit can't be a 7-day daily or rest days
    // would make a perfect day unreachable. Only nudges the untouched default.
    `UPDATE habits SET frequency_per_week = 4 WHERE title IN ('Hit PPLUL gym split', 'Hit gym split') AND frequency_per_week IN (5, 7)`,
    `UPDATE habits SET description = 'Upper A / Lower A / Upper B / Lower B — follow the current rotation' WHERE title IN ('Hit PPLUL gym split', 'Hit gym split')`,
    `UPDATE habits SET title = 'Hit gym split' WHERE title = 'Hit PPLUL gym split'`,
    `UPDATE habits SET description = 'About 13 min: ankles, hips, hamstrings, t-spine. Checklist on the Body page' WHERE title = 'Mobility routine'`,
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
    // Diet goals → same fixed targets for training & rest. Only migrate rows
    // still holding the prior recomp defaults.
    `UPDATE diet_goals SET training_calories = 2300, training_protein = 180, training_carbs = 235, training_fat = 70, rest_calories = 2300, rest_protein = 180, rest_carbs = 235, rest_fat = 70, water_goal_ml = 3500 WHERE id = 1 AND training_calories = 2000 AND rest_calories = 1700`,
    // Water goal → a flat 4 L (135 oz) every day, training or not. Only nudges
    // rows still on a seeded default; a hand-picked number is left alone.
    `UPDATE diet_goals SET water_goal_ml = 4000 WHERE id = 1 AND water_goal_ml IN (2750, 3500)`,
    `UPDATE diet_rules SET text = '135 oz water daily — a gallon plus a cup' WHERE text LIKE '%L water daily%'`,
    `UPDATE diet_meals SET notes = REPLACE(notes, '150g ', '5 oz ') WHERE notes LIKE '%150g %'`,
    `UPDATE habits SET description = REPLACE(description, 'on the Gym page', 'on the Body page') WHERE description LIKE '%on the Gym page%'`,
    // Emoji purge: seeded exercise targets used the star emoji (U+2B50, via
    // char(11088)) for priority lifts — swap for the monochrome ★ glyph in
    // already-seeded rows.
    `UPDATE split_exercises SET target = REPLACE(target, char(11088), '★') WHERE target LIKE '%' || char(11088) || '%'`,
    // 2026-09-11: Daniel's own rewards store is gone; only Kayd's remains.
    // Redemptions first — they reference the reward.
    `DELETE FROM reward_redemptions WHERE reward_id IN (SELECT id FROM rewards WHERE source != 'wife')`,
    `DELETE FROM rewards WHERE source != 'wife'`,
    // 2026-09-11: the standalone "sex optimization" habit was added by hand in
    // the live DB. Its work (hip thrusts, RDLs, loaded core, zone 2) already
    // lives in the split, so the habit was double-counting. Retire, don't delete —
    // completion history stays.
    `UPDATE habits SET is_active = 0 WHERE is_active = 1 AND LOWER(title) LIKE '%sex%'`,
    // Roller + mat arrived; the routine now opens with a roller pass.
    `UPDATE habits SET description = 'About 15 min: roller pass, then ankles, hips, hamstrings, t-spine. Checklist on the Body page' WHERE title = 'Mobility routine'`,
  ]
  for (const stmt of migrations) {
    try { await client.execute(stmt) } catch { /* column already exists */ }
  }

  await client.execute(
    `UPDATE habits SET sort_order = rowid WHERE sort_order = 0 AND is_active = 1`
  )

  await seedSplitIfNeeded()
  await seedDietIfNeeded()
  await seedHouseholdTasksIfNeeded()
  await seedHabitIfMissing(
    'Mobility routine',
    'About 15 min: roller pass, then ankles, hips, hamstrings, t-spine. Checklist on the Body page',
    7,
  )
  // Four gym days instead of five leaves a weekly deficit gap. Steps close it
  // without eating into lifting recovery the way more hard cardio would.
  await seedHabitIfMissing(
    '10k steps',
    'Daily walking floor. On the 3 non-gym days this is the whole fat-loss engine',
    7,
  )
  // Ten minutes is where the research shows attention and mood gains in
  // beginners; consistency beats duration, so the bar is low on purpose.
  await seedHabitIfMissing(
    'Meditate 10 min',
    'Same time every day. Timer on, eyes closed, follow the breath. Mind wanders, come back — that IS the rep',
    7, 'self-care',
  )
}

// ── Seed: Daily fitness habits ────────────────────────────────────────────────
// One-time inserts so the daily blocks feed the streak and the points economy.

async function seedHabitIfMissing(
  title: string, description: string, frequencyPerWeek: number,
  category = 'fitness',
) {
  const existing = await client.execute({
    sql: 'SELECT id FROM habits WHERE title = ? LIMIT 1',
    args: [title],
  })
  if (existing.rows.length > 0) return
  const maxRow = await client.execute(
    'SELECT COALESCE(MAX(sort_order), 0) AS m FROM habits WHERE is_active = 1',
  )
  const sortOrder = Number(maxRow.rows[0]?.m ?? 0) + 1
  await client.execute({
    sql: `INSERT INTO habits (id, title, description, category, frequency_per_week, sort_order)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [randomUUID(), title, description, category, frequencyPerWeek, sortOrder],
  })
}

// ── Seed: Max Aesthetics Split — 4-Day Upper/Lower, machine-first legs ────
// Four gym days, every muscle trained twice a week — the highest frequency that
// fits four sessions, and frequency is what holds muscle while cutting. Built for
// the V-taper: side delts and lat width each get two dedicated hits, upper chest
// is prioritised over flat pressing, and abs are trained under load so the
// midsection reads defined once lean.
//
// Equipment rules (Daniel, 2026-09-11): the bench is for chest and back only —
// leg days are all machines (leg press, hack squat, extensions, curls), and
// shoulder pressing is on the machine, never dumbbells. Glute and hip-hinge work
// stays non-negotiable (it carries over directly to bed), so the hip thrust and
// RDL survive as their machine versions rather than being dropped. Zone 2 closes
// both lower days; that plus the daily step habit is what keeps the deficit
// moving — the lifting protects the muscle, the deficit takes the fat.
//
// One-time replacement: bumping SPLIT_MARKER triggers a one-time swap of any older
// split for this one. Existing exercise_logs (workout history) are preserved.
// Progression rule for every lift: at the TOP of the rep range with clean form,
// add weight next session (smallest jump available), then work back up the range.

const SPLIT_MARKER = 'Lower A — Glutes / Hams / Abs'

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
      name: 'Upper A — Chest / Delts / Back Width', order: 1,
      exercises: [
        { name: 'Incline Barbell Bench Press',            sets: 4, reps: 8,  weight: 0, target: '4 × 6–10 · ★ upper chest — the shelf that reads on a lean frame' },
        { name: 'Weighted Pull-ups / Lat Pulldown',       sets: 4, reps: 9,  weight: 0, target: '4 × 6–12 · ★ back width' },
        { name: 'Machine Shoulder Press',                 sets: 3, reps: 10, weight: 0, target: '3 × 8–12 · front delts · set the seat so the handles start at chin height' },
        { name: 'Chest-Supported Row',                    sets: 3, reps: 10, weight: 0, target: '3 × 8–12 · back thickness, no torso English' },
        { name: 'Cable Lateral Raises',                   sets: 4, reps: 15, weight: 0, target: '4 × 12–20 · ★ shoulder width — go light, no swinging' },
        { name: 'Overhead Cable Triceps Extension',       sets: 3, reps: 12, weight: 0, target: '3 × 10–15 · long head = arm size' },
        { name: 'Machine Preacher Curl',                  sets: 3, reps: 10, weight: 0, target: '3 × 8–12 · biceps under stretch, full extension at the bottom' },
      ],
    },
    {
      name: 'Lower A — Glutes / Hams / Abs', order: 2,
      exercises: [
        { name: 'Machine Hip Thrust / Glute Drive',       sets: 4, reps: 10, weight: 0, target: '4 × 8–12 · ★ glutes + hip drive · full lockout, pause at top · no machine? cable pull-through' },
        { name: 'Smith Machine RDL',                      sets: 4, reps: 10, weight: 0, target: '4 × 8–12 · ★ hamstrings + glutes · hinge, feel the stretch, bar stays on the legs' },
        { name: 'Leg Press — feet high & wide',           sets: 3, reps: 12, weight: 0, target: '3 × 10–15 · glute/ham bias · sink deep, drive through the heels' },
        { name: 'Seated Leg Curl',                        sets: 3, reps: 12, weight: 0, target: '3 × 10–15 · hamstrings' },
        { name: 'Standing Calf Raise Machine',            sets: 4, reps: 12, weight: 0, target: '4 × 10–15 · pause at the bottom' },
        { name: 'Cable Crunch',                           sets: 4, reps: 13, weight: 0, target: '4 × 12–15 · ★ weighted abs — thickness is what shows at low body fat' },
        { name: 'Zone 2 Cardio',                          sets: 1, reps: 25, weight: 0, type: 'cardio', target: '25 min · conversational pace · heart health + stamina' },
      ],
    },
    {
      name: 'Upper B — Back / Chest / Arms', order: 3,
      exercises: [
        { name: 'Wide-Grip Lat Pulldown',                 sets: 4, reps: 11, weight: 0, target: '4 × 10–12 · ★ width, drive elbows down' },
        { name: 'Flat Dumbbell Press',                    sets: 4, reps: 10, weight: 0, target: '4 × 8–12 · chest thickness' },
        { name: 'Seated Cable Row',                       sets: 3, reps: 10, weight: 0, target: '3 × 8–12 · back thickness (2nd weekly hit)' },
        { name: 'Cable Lateral Raises',                   sets: 4, reps: 15, weight: 0, target: '4 × 12–20 · ★ shoulder width (2nd weekly hit)' },
        { name: 'Cable Fly / Pec Deck',                   sets: 3, reps: 14, weight: 0, target: '3 × 12–20 · stretch under load, squeeze at the top' },
        { name: 'Reverse Pec Deck / Face Pulls',          sets: 3, reps: 18, weight: 0, target: '3 × 15–20 · rear delts + posture' },
        { name: 'Cable Hammer Curls',                     sets: 3, reps: 12, weight: 0, target: '3 × 10–15 · arm thickness' },
        { name: 'Rope Pushdown',                          sets: 3, reps: 13, weight: 0, target: '3 × 12–15' },
      ],
    },
    {
      name: 'Lower B — Quads / Core / Conditioning', order: 4,
      exercises: [
        { name: 'Leg Press',                              sets: 4, reps: 8,  weight: 0, target: '4 × 6–10 · ★ the heavy driver · feet mid-platform, full depth, keep it clean' },
        { name: 'Hack Squat',                             sets: 3, reps: 12, weight: 0, target: '3 × 10–15 · quad volume without spinal load' },
        { name: 'Leg Extension',                          sets: 3, reps: 13, weight: 0, target: '3 × 12–15 · ★ quad sweep · squeeze hard at the top, slow on the way down' },
        { name: 'Lying Leg Curl',                         sets: 3, reps: 12, weight: 0, target: '3 × 10–15 · hamstrings (2nd weekly hit)' },
        { name: 'Seated Calf Raise',                      sets: 3, reps: 15, weight: 0, target: '3 × 12–20 · soleus, slow negatives' },
        { name: 'Hanging Leg Raise',                      sets: 4, reps: 14, weight: 0, target: '4 × 10–20 · ★ lower abs — the pouch area, no swinging' },
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
// 2,300 kcal / 180 g protein cut, unchanged. What changed on 2026-09-13 is the
// content: Daniel asked for the daily food anchors and the supplement stack,
// not recipes. Meals are "what goes in every day at this time"; rules carry
// the non-negotiables; supplements carry dose + timing, which is the part that
// actually decides whether a stack works.
//
// One-time replacement: bumping DIET_MARKER swaps any older meals/rules for
// these. Goals, water logs and nutrition entries are untouched.

const DIET_MARKER = 'Wake — Protein + Fruit'

async function seedDietIfNeeded() {
  const goalRows = await client.execute('SELECT id FROM diet_goals LIMIT 1')
  if (goalRows.rows.length === 0) {
    await client.execute({
      sql: `INSERT INTO diet_goals
        (id, training_calories, training_protein, training_carbs, training_fat,
         rest_calories, rest_protein, rest_carbs, rest_fat, water_goal_ml)
        VALUES (1, 2300, 180, 235, 70, 2300, 180, 235, 70, 4000)`,
      args: [],
    })
  }

  const current = await client.execute({ sql: 'SELECT id FROM diet_meals WHERE name = ? LIMIT 1', args: [DIET_MARKER] })
  if (current.rows.length > 0) return
  await client.execute('DELETE FROM diet_meals')
  await client.execute('DELETE FROM diet_rules')

  const meals = [
    {
      name: 'Wake — Protein + Fruit', timeWindow: '7–8 AM',
      calories: 450, protein: 40, carbs: 40, fat: 12, order: 1,
      notes: [
        '2 whole eggs + 4 whites, or 200 g Greek yogurt',
        'Berries, 1 cup — every single day',
        '½ cup oats or 1 slice sourdough',
        'Black coffee — that is your pre-workout, nothing else needed',
        'Supps with the food: D3 + K2, fish oil, multivitamin (fat-soluble, needs a meal)',
      ].join('\n'),
    },
    {
      name: 'Midday — Lean Protein + Greens', timeWindow: '12 PM',
      calories: 550, protein: 50, carbs: 45, fat: 14, order: 2,
      notes: [
        '6 oz chicken, turkey, lean beef, or white fish',
        '¾ cup rice, or a potato / sweet potato',
        'Big leafy salad (spinach, arugula, kale) + olive oil + lemon',
        'Something cruciferous: broccoli, Brussels sprouts, cabbage',
        'One piece of fruit — apple, orange, or kiwi',
      ].join('\n'),
    },
    {
      name: 'Pre-Train — Carbs + Fast Protein', timeWindow: '3–4 PM',
      calories: 320, protein: 25, carbs: 50, fat: 5, order: 3,
      notes: [
        'Banana + Greek yogurt, or a whey shake',
        'Rice cakes or 2–3 dates on a leg day',
        'Beetroot 30–60 min before lifting',
        'Creatine 5 g — timing does not matter, this is just the hook so it never gets missed',
      ].join('\n'),
    },
    {
      name: 'Dinner — Fatty Fish or Red Meat + Colour', timeWindow: '7–8 PM',
      calories: 660, protein: 45, carbs: 65, fat: 22, order: 4,
      notes: [
        'Salmon, sardines, or mackerel 3× a week; lean beef or chicken the other nights',
        'Potato, rice, or beans / lentils',
        'Two colours of vegetables: peppers, carrots, tomatoes, zucchini',
        '½ avocado or a drizzle of olive oil',
        'One fermented food: kimchi, sauerkraut, or kefir',
      ].join('\n'),
    },
    {
      name: 'Night — Slow Protein + Sleep Fruit', timeWindow: '9–10 PM',
      calories: 320, protein: 30, carbs: 25, fat: 12, order: 5,
      notes: [
        '1 cup cottage cheese or a casein shake',
        '2 kiwis or a bowl of tart cherries — both have real sleep evidence, and you love fruit',
        'A handful of almonds or walnuts',
        'Magnesium glycinate now. Ashwagandha now if you are keeping it',
      ].join('\n'),
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
    { cat: 'always', ord: 1,  text: '135 oz water daily — a gallon plus a cup' },
    { cat: 'always', ord: 2,  text: '180 g protein, spread over 5 feedings of 30–50 g' },
    { cat: 'always', ord: 3,  text: 'Fruit 3× a day — berries once, something with vitamin C once' },
    { cat: 'always', ord: 4,  text: 'Vegetables at every main meal: one leafy green, one cruciferous, two colours' },
    { cat: 'always', ord: 5,  text: 'Fatty fish 3× a week — salmon, sardines, mackerel' },
    { cat: 'always', ord: 6,  text: 'One fermented food a day — Greek yogurt, kefir, kimchi, sauerkraut' },
    { cat: 'always', ord: 7,  text: 'Protein within 45 min post-lift' },
    { cat: 'always', ord: 8,  text: 'Zone 2 every lifting day' },
    { cat: 'always', ord: 9,  text: 'Keep sodium under 1,500mg' },
    { cat: 'always', ord: 10, text: 'Sleep 7–9 hours' },
    { cat: 'never', ord: 1, text: 'Alcohol' },
    { cat: 'never', ord: 2, text: 'Eat under 1,500 kcal' },
    { cat: 'never', ord: 3, text: 'Dirty bulk' },
    { cat: 'never', ord: 4, text: 'Skip sodium control' },
    { cat: 'never', ord: 5, text: 'Juice or sugary drinks — eat the fruit, do not drink it' },
    { cat: 'never', ord: 6, text: 'Ultra-processed food as a staple — a treat is fine, a habit is not' },
    { cat: 'never', ord: 7, text: 'Fat burners, test boosters, BCAAs, proprietary pre-workouts — money for nothing' },
    { cat: 'supplement', ord: 1, text: 'Creatine monohydrate 5 g daily, any time' },
    { cat: 'supplement', ord: 2, text: 'Vitamin D3 2,000–4,000 IU + K2 (MK-7) 100 µg with breakfast — the one you were missing. Get a 25-OH-D blood test to set the dose' },
    { cat: 'supplement', ord: 3, text: 'Fish oil: enough to hit 2 g EPA+DHA combined — read the label, most capsules need 2–3. Skip on salmon days' },
    { cat: 'supplement', ord: 4, text: 'Magnesium glycinate 300–400 mg at night' },
    { cat: 'supplement', ord: 5, text: 'Men\'s multivitamin with breakfast — insurance, not a strategy' },
    { cat: 'supplement', ord: 6, text: 'Beetroot 30–60 min pre-lift — nitrates; helps zone 2 more than the lifts. Optional' },
    { cat: 'supplement', ord: 7, text: 'Ashwagandha (KSM-66) 300–600 mg at night — 8 weeks on, 4 off. Stop if you feel flat. Not essential' },
    { cat: 'supplement', ord: 8, text: 'Caffeine 100–200 mg pre-lift = black coffee. None after 2 PM' },
    { cat: 'supplement', ord: 9, text: 'Whey / casein — a tool for hitting 180 g when food falls short, not a supplement' },
  ]
  for (const r of rules) {
    await client.execute({
      sql: 'INSERT INTO diet_rules (id, category, text, rule_order) VALUES (?, ?, ?, ?)',
      args: [randomUUID(), r.cat, r.text, r.ord],
    })
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
