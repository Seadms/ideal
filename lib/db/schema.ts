import { sql } from 'drizzle-orm'
import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const habits = sqliteTable('habits', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  points: integer('points').notNull().default(50),
  isMinimumViable: integer('is_minimum_viable', { mode: 'boolean' }).notNull().default(false),
  category: text('category').notNull().default('general'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  frequencyPerWeek: integer('frequency_per_week').notNull().default(7),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  points: integer('points').notNull().default(100),
  isMinimumViable: integer('is_minimum_viable', { mode: 'boolean' }).notNull().default(false),
  category: text('category').notNull().default('general'),
  isCompleted: integer('is_completed', { mode: 'boolean' }).notNull().default(false),
  completedAt: text('completed_at'),
  dueDate: text('due_date'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  source: text('source').notNull().default('self'), // 'self' | 'wife'
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

export const habitCompletions = sqliteTable('habit_completions', {
  id: text('id').primaryKey(),
  habitId: text('habit_id').notNull().references(() => habits.id),
  completedDate: text('completed_date').notNull(),
  pointsEarned: integer('points_earned').notNull(),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

export const rewards = sqliteTable('rewards', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  cost: integer('cost').notNull(),
  category: text('category').notNull().default('general'),
  isAvailable: integer('is_available', { mode: 'boolean' }).notNull().default(true),
  timesRedeemed: integer('times_redeemed').notNull().default(0),
  maxRedemptions: integer('max_redemptions'), // null/0 = unlimited
  source: text('source').notNull().default('self'), // 'self' | 'wife'
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

export const rewardRedemptions = sqliteTable('reward_redemptions', {
  id: text('id').primaryKey(),
  rewardId: text('reward_id').notNull().references(() => rewards.id),
  redeemedAt: text('redeemed_at').notNull().default(sql`(datetime('now'))`),
  pointsSpent: integer('points_spent').notNull(),
})

// A redemption request awaiting Kayd's approval. Snapshots title/cost so it
// survives the reward being deleted; good-boy points are reserved (deducted)
// at request time and refunded on decline.
export const rewardClaims = sqliteTable('reward_claims', {
  id: text('id').primaryKey(),
  rewardId: text('reward_id'),
  title: text('title').notNull(),
  cost: integer('cost').notNull(),
  status: text('status').notNull().default('pending'), // 'pending' | 'accepted' | 'declined'
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  resolvedAt: text('resolved_at'),
})

export const userStats = sqliteTable('user_stats', {
  id: integer('id').primaryKey().default(1),
  totalPointsEarned: integer('total_points_earned').notNull().default(0),
  totalPointsSpent: integer('total_points_spent').notNull().default(0),
  currentPoints: integer('current_points').notNull().default(0),
  goodBoyPoints: integer('good_boy_points').notNull().default(0), // wife-store currency
  currentStreak: integer('current_streak').notNull().default(0),
  longestStreak: integer('longest_streak').notNull().default(0),
  lastActiveDate: text('last_active_date'),
  reminderTime: text('reminder_time'),        // "HH:MM" 24h or null
  streakFreezeCount: integer('streak_freeze_count').notNull().default(0),
  briefingTime: text('briefing_time'),        // "HH:MM" — morning briefing push, null = off
  eventLeadMinutes: integer('event_lead_minutes').notNull().default(30),
  assignmentAlertHours: integer('assignment_alert_hours').notNull().default(24),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

export const pushSubscriptions = sqliteTable('push_subscriptions', {
  id: text('id').primaryKey(),
  endpoint: text('endpoint').notNull(),
  p256dh: text('p256dh').notNull(),
  auth: text('auth').notNull(),
  owner: text('owner').notNull().default('self'), // 'self' (Daniel) | 'wife'
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

// Dedupe ledger for assistant pushes — one row per notification actually sent.
// `key` encodes what fired (e.g. 'briefing-2026-07-04', 'event-<uid>-<start>',
// 'assign-<id>-24h') so /api/tick can run every few minutes without repeats.
export const sentNotifications = sqliteTable('sent_notifications', {
  key: text('key').primaryKey(),
  sentAt: text('sent_at').notNull().default(sql`(datetime('now'))`),
})

export const scheduledTasks = sqliteTable('scheduled_tasks', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  points: integer('points').notNull().default(75),
  category: text('category').notNull().default('general'),
  recurrenceType: text('recurrence_type').notNull().default('once'), // 'once' | 'weekly'
  scheduledDate: text('scheduled_date'),   // YYYY-MM-DD — for 'once' type
  daysOfWeek: text('days_of_week'),        // '1,3,5' — for 'weekly' (0=Sun…6=Sat)
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

export const scheduledTaskCompletions = sqliteTable('scheduled_task_completions', {
  id: text('id').primaryKey(),
  taskId: text('task_id').notNull(),
  completedDate: text('completed_date').notNull(), // YYYY-MM-DD
  pointsEarned: integer('points_earned').notNull(),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

export const bonusTaskPool = sqliteTable('bonus_task_pool', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  category: text('category').notNull().default('general'),
  points: integer('points').notNull().default(50),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
})

// One row per suggestion per day; state drives the UI machine
export const bonusTaskSessions = sqliteTable('bonus_task_sessions', {
  id: text('id').primaryKey(),
  taskId: text('task_id').notNull(),
  date: text('date').notNull(), // YYYY-MM-DD
  state: text('state').notNull().default('suggested'), // 'suggested' | 'accepted' | 'completed' | 'skipped'
  pointsEarned: integer('points_earned'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

export const splitDays = sqliteTable('split_days', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  dayOrder: integer('day_order').notNull().default(0),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

export const splitExercises = sqliteTable('split_exercises', {
  id: text('id').primaryKey(),
  splitDayId: text('split_day_id').notNull(),
  name: text('name').notNull(),
  exerciseOrder: integer('exercise_order').notNull().default(0),
  exerciseType: text('exercise_type').notNull().default('strength'), // 'strength' | 'cardio' | 'facial' | 'hold'
  target: text('target'),            // prescription / progression hint, e.g. '3–4 × 6–12 · weighted'
  defaultSets: integer('default_sets').notNull().default(3),
  defaultReps: integer('default_reps').notNull().default(8),
  defaultWeight: real('default_weight').notNull().default(0),
  defaultUnit: text('default_unit').notNull().default('lbs'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

export const exerciseLogs = sqliteTable('exercise_logs', {
  id: text('id').primaryKey(),
  exerciseId: text('exercise_id').notNull(),
  date: text('date').notNull(),
  sets: integer('sets').notNull(),
  reps: integer('reps').notNull(),
  weight: real('weight').notNull(),
  unit: text('unit').notNull().default('lbs'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

// Optional per-set detail for a logged session. The summary row in
// `exercise_logs` is still written for prev-display and progression charts.
export const exerciseSetLogs = sqliteTable('exercise_set_logs', {
  id: text('id').primaryKey(),
  exerciseId: text('exercise_id').notNull(),
  date: text('date').notNull(),
  setNumber: integer('set_number').notNull(),
  reps: integer('reps').notNull(),
  weight: real('weight').notNull().default(0),
  unit: text('unit').notNull().default('lbs'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

export const nutritionGoals = sqliteTable('nutrition_goals', {
  id: integer('id').primaryKey().default(1),
  caloriesGoal: integer('calories_goal').notNull().default(2300),
  proteinGoal: integer('protein_goal').notNull().default(180),
  carbsGoal: integer('carbs_goal').notNull().default(235),
  fatsGoal: integer('fats_goal').notNull().default(70),
})

export const nutritionEntries = sqliteTable('nutrition_entries', {
  id: text('id').primaryKey(),
  date: text('date').notNull(),
  mealName: text('meal_name').notNull(),
  calories: integer('calories').notNull().default(0),
  protein: real('protein').notNull().default(0),
  carbs: real('carbs').notNull().default(0),
  fats: real('fats').notNull().default(0),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

export const dietGoals = sqliteTable('diet_goals', {
  id: integer('id').primaryKey().default(1),
  // Cut plan uses fixed daily targets — training and rest columns are kept equal.
  trainingCalories: integer('training_calories').notNull().default(2300),
  trainingProtein: integer('training_protein').notNull().default(180),
  trainingCarbs: integer('training_carbs').notNull().default(235),
  trainingFat: integer('training_fat').notNull().default(70),
  restCalories: integer('rest_calories').notNull().default(2300),
  restProtein: integer('rest_protein').notNull().default(180),
  restCarbs: integer('rest_carbs').notNull().default(235),
  restFat: integer('rest_fat').notNull().default(70),
  waterGoalMl: integer('water_goal_ml').notNull().default(3500),
})

export const dietMeals = sqliteTable('diet_meals', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  timeWindow: text('time_window'),
  calories: integer('calories').notNull().default(0),
  protein: integer('protein').notNull().default(0),
  carbs: integer('carbs').notNull().default(0),
  fat: integer('fat').notNull().default(0),
  notes: text('notes'),
  mealOrder: integer('meal_order').notNull().default(0),
})

export const dietRules = sqliteTable('diet_rules', {
  id: text('id').primaryKey(),
  category: text('category').notNull(),
  text: text('text').notNull(),
  ruleOrder: integer('rule_order').notNull().default(0),
})

export const waterLogs = sqliteTable('water_logs', {
  id: text('id').primaryKey(),
  date: text('date').notNull(),
  amountMl: integer('amount_ml').notNull(),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

// ── Progress tracking ─────────────────────────────────────────────────────────

// One entry per day (latest wins). 7-day rolling average is computed in the UI.
export const bodyweightLogs = sqliteTable('bodyweight_logs', {
  id: text('id').primaryKey(),
  date: text('date').notNull(),       // YYYY-MM-DD
  weight: real('weight').notNull(),
  unit: text('unit').notNull().default('lbs'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

// Strength/skill benchmarks. `value` is reps for numeric benchmarks or the
// 0-based stage index for staged ones; `label` holds the human stage name.
export const benchmarkLogs = sqliteTable('benchmark_logs', {
  id: text('id').primaryKey(),
  date: text('date').notNull(),       // YYYY-MM-DD
  key: text('key').notNull(),         // 'pull_ups' | 'ring_dips' | 'pistol_squat' | 'push_up'
  value: real('value').notNull(),
  label: text('label'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

// Weekly progress photos. Images are client-compressed JPEG data URLs.
export const progressPhotos = sqliteTable('progress_photos', {
  id: text('id').primaryKey(),
  date: text('date').notNull(),       // YYYY-MM-DD
  pose: text('pose').notNull(),       // 'front' | 'side' | 'back'
  imageData: text('image_data').notNull(),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

export type Habit = typeof habits.$inferSelect
export type Task = typeof tasks.$inferSelect
export type Reward = typeof rewards.$inferSelect
export type RewardClaim = typeof rewardClaims.$inferSelect
export type HabitCompletion = typeof habitCompletions.$inferSelect
export type UserStats = typeof userStats.$inferSelect
export type BonusTaskPoolItem = typeof bonusTaskPool.$inferSelect
export type BonusTaskSession = typeof bonusTaskSessions.$inferSelect
export type ScheduledTask = typeof scheduledTasks.$inferSelect
export type ScheduledTaskCompletion = typeof scheduledTaskCompletions.$inferSelect
export type NutritionEntry = typeof nutritionEntries.$inferSelect
export type SplitDay = typeof splitDays.$inferSelect
export type SplitExercise = typeof splitExercises.$inferSelect
export type ExerciseLog = typeof exerciseLogs.$inferSelect
export type ExerciseSetLog = typeof exerciseSetLogs.$inferSelect
export type NutritionGoals = typeof nutritionGoals.$inferSelect
export type DietGoals = typeof dietGoals.$inferSelect
export type DietMeal = typeof dietMeals.$inferSelect
export type DietRule = typeof dietRules.$inferSelect
export type WaterLog = typeof waterLogs.$inferSelect
export type BodyweightLog = typeof bodyweightLogs.$inferSelect
export type BenchmarkLog = typeof benchmarkLogs.$inferSelect
export type ProgressPhoto = typeof progressPhotos.$inferSelect
