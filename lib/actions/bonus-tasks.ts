'use server'

import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'
import { eq } from 'drizzle-orm'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { db } from '@/lib/db'
import { bonusTaskPool, bonusTaskSessions, userStats } from '@/lib/db/schema'
import type { BonusTaskPoolItem, BonusTaskSession } from '@/lib/db/schema'
import { todayString, levelFromPoints } from '@/lib/utils'
import type { CompletionResult } from './habits'

export type BonusSessionWithTask = { session: BonusTaskSession; task: BonusTaskPoolItem }

// ── User profile — injected into every Gemini prompt ─────────────────────────

const USER_PROFILE = `
You are generating bonus tasks for a specific person. Here is everything about them:

IDENTITY & CAREER:
- 21 years old, Computer Science student at UNC Charlotte
- Graduating with a Bachelor's this summer, then completing a Master's 3 semesters later
- Works as a Sales Associate at Best Buy ($17/hr, earned "Hall of Fame" award)
- Actively applying for tech internships and better jobs
- Technical co-founder of a TCG card-scanning app called aio.tc
- Also works on game development projects

HOME LIFE:
- Lives with his girlfriend Kayd and their pet cat
- Deeply values being an amazing boyfriend and takes pride in the "house husband" role
- Wants tasks that keep the apartment clean, manage chores, and do thoughtful things for Kayd

FITNESS:
- Runs a 5-day PPLUL (Push/Pull/Legs/Upper/Lower) hypertrophy split
- Goal: build a beautiful, ethereal physique — struggles with consistency
- Needs low-friction, quick fitness nudges to keep momentum

SKILLS TO BUILD:
- Guitar (wants to get significantly better)
- Rubik's cube (wants to solve it faster and more consistently)
- Chess (wants to study openings and improve strategically)
- General fluid intelligence — reading books, puzzles, learning new things
- Meditation (just starting out, wants to build the habit)

PROJECTS:
- aio.tc: TCG scanning app he co-founded — always thinking about features
- Game development projects
- Interview prep (coding challenges, CS fundamentals)

CORE MOTIVATION:
He wants to become great — not just good. Greater than life. Every task should feel like a step toward becoming the best version of himself: sharp mind, strong body, loving partner, successful founder.
`.trim()

// ── Gemini task generation ────────────────────────────────────────────────────

const VALID_CATEGORIES = ['fitness', 'hobby', 'chore', 'growth', 'creative', 'social', 'coding', 'productivity', 'self-care']

async function callGemini(): Promise<{ title: string; category: string; points: number } | null> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return null

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

    const prompt = `${USER_PROFILE}

TASK: Generate exactly ONE spontaneous bonus task for this person right now.

Rules:
- Must be specific and actionable — not vague ("do something productive")
- Completable in under 60 minutes
- Feels meaningful, not filler
- Rotate across all areas of his life — don't always pick fitness or always pick chores
- Occasionally surprise him with something creative or thoughtful for Kayd
- For meditation, keep it beginner-friendly (e.g. "5-minute guided breathing session")
- Title must be under 65 characters

Return ONLY a valid JSON object, no markdown, no explanation:
{"title": "...", "category": "...", "points": ...}

Category must be one of: ${VALID_CATEGORIES.join(', ')}
Points guide: 20-35 = quick/easy (under 10 min), 40-65 = medium effort (15-30 min), 70-100 = solid effort (30-60 min)`

    const result = await model.generateContent(prompt)
    const text = result.response.text().trim().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(text)

    if (typeof parsed.title !== 'string' || typeof parsed.points !== 'number') return null
    if (!VALID_CATEGORIES.includes(parsed.category)) parsed.category = 'general'
    parsed.points = Math.max(20, Math.min(100, Math.round(parsed.points)))

    return parsed
  } catch {
    return null
  }
}

// ── Session helpers ───────────────────────────────────────────────────────────

export async function getTodayBonusData(): Promise<BonusSessionWithTask | null> {
  const today = todayString()
  const sessions = await db.select().from(bonusTaskSessions)
    .where(eq(bonusTaskSessions.date, today))

  // Prefer in-progress sessions (suggested/accepted) over completed ones
  const active =
    sessions.find(s => s.state === 'suggested' || s.state === 'accepted') ??
    sessions.find(s => s.state === 'completed') ??
    null

  if (!active) return null
  const taskRows = await db.select().from(bonusTaskPool).where(eq(bonusTaskPool.id, active.taskId))
  const task = taskRows[0]
  if (!task) return null
  return { session: active, task }
}

// ── Core generator — tries AI first, falls back to static pool ────────────────

export async function generateBonusTask(): Promise<BonusSessionWithTask | null> {
  const today = todayString()

  // Try Gemini first
  const aiTask = await callGemini()

  let poolItem: BonusTaskPoolItem

  if (aiTask) {
    // Insert AI-generated task into the pool so sessions can reference it
    const newId = randomUUID()
    await db.insert(bonusTaskPool).values({
      id: newId,
      title: aiTask.title,
      category: aiTask.category,
      points: aiTask.points,
      isActive: false, // AI tasks don't go into the static rotation
    })
    const rows = await db.select().from(bonusTaskPool).where(eq(bonusTaskPool.id, newId))
    poolItem = rows[0]
  } else {
    // Fall back to static pool — pick one not tried today
    const allSessions = await db.select().from(bonusTaskSessions)
      .where(eq(bonusTaskSessions.date, today))
    const triedIds = new Set(allSessions.map(s => s.taskId))
    const pool = await db.select().from(bonusTaskPool).where(eq(bonusTaskPool.isActive, true))
    const available = pool.filter(t => !triedIds.has(t.id))
    if (available.length === 0) return null
    poolItem = available[Math.floor(Math.random() * available.length)]
  }

  const sessionId = randomUUID()
  await db.insert(bonusTaskSessions).values({
    id: sessionId, taskId: poolItem.id, date: today, state: 'suggested',
  })
  const sessionRows = await db.select().from(bonusTaskSessions)
    .where(eq(bonusTaskSessions.id, sessionId))

  revalidatePath('/')
  return { session: sessionRows[0], task: poolItem }
}

// ── State transitions ─────────────────────────────────────────────────────────

export async function acceptBonusTask(sessionId: string): Promise<void> {
  await db.update(bonusTaskSessions)
    .set({ state: 'accepted' })
    .where(eq(bonusTaskSessions.id, sessionId))
  revalidatePath('/')
}

export async function completeBonusTask(sessionId: string): Promise<CompletionResult> {
  const sessionRows = await db.select().from(bonusTaskSessions)
    .where(eq(bonusTaskSessions.id, sessionId))
  const session = sessionRows[0]
  if (!session || session.state === 'completed') return { leveledUp: false, newLevel: 1, pointsEarned: 0 }

  const taskRows = await db.select().from(bonusTaskPool).where(eq(bonusTaskPool.id, session.taskId))
  const task = taskRows[0]
  if (!task) return { leveledUp: false, newLevel: 1, pointsEarned: 0 }

  const statsRows = await db.select().from(userStats).where(eq(userStats.id, 1))
  const stats = statsRows[0]
  if (!stats) return { leveledUp: false, newLevel: 1, pointsEarned: 0 }

  const oldLevel = levelFromPoints(stats.totalPointsEarned)

  await db.update(bonusTaskSessions)
    .set({ state: 'completed', pointsEarned: task.points })
    .where(eq(bonusTaskSessions.id, sessionId))
  await db.update(userStats).set({
    totalPointsEarned: stats.totalPointsEarned + task.points,
    currentPoints: stats.currentPoints + task.points,
  }).where(eq(userStats.id, 1))

  const newLevel = levelFromPoints(stats.totalPointsEarned + task.points)
  revalidatePath('/')
  return { leveledUp: newLevel > oldLevel, newLevel, pointsEarned: task.points }
}

export async function rerollBonusTask(sessionId: string): Promise<BonusSessionWithTask | null> {
  await db.update(bonusTaskSessions)
    .set({ state: 'skipped' })
    .where(eq(bonusTaskSessions.id, sessionId))
  return generateBonusTask()
}
