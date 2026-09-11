import { db, initDb } from './index'
import { habits, tasks, userStats } from './schema'
import { eq } from 'drizzle-orm'
import { randomUUID } from 'crypto'

export async function seedDatabase() {
  await initDb()

  // Main data seed — only runs on a fresh DB. Keyed off the gym habit rather
  // than "any habit exists": initDb() seeds the mobility/steps habits first, so
  // a plain count is never zero and this block would never run.
  const existingHabits = await db.select().from(habits).where(eq(habits.title, 'Hit gym split'))
  if (existingHabits.length > 0) return

  await db.insert(habits).values([
    {
      id: randomUUID(),
      title: 'Hit gym split',
      description: 'Upper A / Lower A / Upper B / Lower B — follow the current rotation',
      points: 100,
      isMinimumViable: false,
      category: 'fitness',
      frequencyPerWeek: 4,
    },
    {
      id: randomUUID(),
      title: 'Clear to-do list',
      description: "Work through every item on today's list before midnight",
      points: 50,
      isMinimumViable: true,
      category: 'productivity',
    },
    {
      id: randomUUID(),
      title: 'Morning routine',
      description: 'Make bed, brush teeth, wash face — non-negotiable baseline',
      points: 30,
      isMinimumViable: true,
      category: 'self-care',
    },
    {
      id: randomUUID(),
      title: 'Plan tomorrow',
      description: 'Brain-dump tasks and set 3 priorities for the next day',
      points: 40,
      isMinimumViable: false,
      category: 'productivity',
    },
    {
      id: randomUUID(),
      title: 'Read for 20 min',
      description: 'Any book — fiction counts',
      points: 30,
      isMinimumViable: false,
      category: 'growth',
    },
  ])

  await db.insert(tasks).values([
    {
      id: randomUUID(),
      title: 'Write LeetCode solution',
      description: 'Pick a medium/hard problem, solve it, then review the optimal approach',
      isMinimumViable: false,
      category: 'coding',
    },
    {
      id: randomUUID(),
      title: 'Push database optimisation for web app',
      description: 'Profile slow queries and add indexes or caching layer',
      isMinimumViable: false,
      category: 'project',
    },
  ])

  const existing = await db.select().from(userStats).where(eq(userStats.id, 1))
  if (existing.length === 0) {
    await db.insert(userStats).values({ id: 1 })
  }
}
