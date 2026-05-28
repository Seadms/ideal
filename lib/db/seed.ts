import { db, initDb } from './index'
import { habits, tasks, rewards, userStats } from './schema'
import { eq } from 'drizzle-orm'
import { randomUUID } from 'crypto'

export async function seedDatabase() {
  await initDb()

  // Idempotent — only seeds if tables are empty
  const existingHabits = await db.select().from(habits)
  if (existingHabits.length > 0) return

  await db.insert(habits).values([
    {
      id: randomUUID(),
      title: 'Hit PPLUL gym split',
      description: 'Push / Pull / Legs / Upper / Lower — follow the current rotation',
      points: 100,
      isMinimumViable: false,
      category: 'fitness',
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
      points: 100,
      isMinimumViable: false,
      category: 'coding',
    },
    {
      id: randomUUID(),
      title: 'Push database optimisation for web app',
      description: 'Profile slow queries and add indexes or caching layer',
      points: 200,
      isMinimumViable: false,
      category: 'project',
    },
  ])

  await db.insert(rewards).values([
    {
      id: randomUUID(),
      title: 'Guilt-free rotting / zero-productivity day',
      description: 'A full day of games, TV, and doing absolutely nothing — no guilt allowed',
      cost: 500,
      category: 'rest',
    },
    {
      id: randomUUID(),
      title: 'Order 6 pc Crispy Tender Meal (well done, extra seasoning)',
      description: 'You earned it. Extra seasoning, well done, no compromises',
      cost: 150,
      category: 'food',
    },
    {
      id: randomUUID(),
      title: 'Buy a new LEGO set',
      description: "Pick any set you've been eyeing — building counts as a reward activity",
      cost: 1500,
      category: 'hobby',
    },
    {
      id: randomUUID(),
      title: 'Purchase a new Vivienne Westwood ring',
      description: 'The big one. You deserve something beautiful for the long grind',
      cost: 5000,
      category: 'luxury',
    },
  ])

  const existing = await db.select().from(userStats).where(eq(userStats.id, 1))
  if (existing.length === 0) {
    await db.insert(userStats).values({ id: 1 })
  }
}
