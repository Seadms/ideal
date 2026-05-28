import { sql } from 'drizzle-orm'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

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
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

export const rewardRedemptions = sqliteTable('reward_redemptions', {
  id: text('id').primaryKey(),
  rewardId: text('reward_id').notNull().references(() => rewards.id),
  redeemedAt: text('redeemed_at').notNull().default(sql`(datetime('now'))`),
  pointsSpent: integer('points_spent').notNull(),
})

export const userStats = sqliteTable('user_stats', {
  id: integer('id').primaryKey().default(1),
  totalPointsEarned: integer('total_points_earned').notNull().default(0),
  totalPointsSpent: integer('total_points_spent').notNull().default(0),
  currentPoints: integer('current_points').notNull().default(0),
  currentStreak: integer('current_streak').notNull().default(0),
  longestStreak: integer('longest_streak').notNull().default(0),
  lastActiveDate: text('last_active_date'),
  reminderTime: text('reminder_time'),        // "HH:MM" 24h or null
  streakFreezeCount: integer('streak_freeze_count').notNull().default(0),
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

export type Habit = typeof habits.$inferSelect
export type Task = typeof tasks.$inferSelect
export type Reward = typeof rewards.$inferSelect
export type HabitCompletion = typeof habitCompletions.$inferSelect
export type UserStats = typeof userStats.$inferSelect
export type BonusTaskPoolItem = typeof bonusTaskPool.$inferSelect
export type BonusTaskSession = typeof bonusTaskSessions.$inferSelect
