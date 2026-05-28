import { db, initDb } from './index'
import { habits, tasks, rewards, userStats, bonusTaskPool } from './schema'
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

  // Bonus pool is seeded independently — users who already have habits still get it
  const existingBonus = await db.select().from(bonusTaskPool)
  if (existingBonus.length === 0) {
    await db.insert(bonusTaskPool).values([
      // Fitness
      { id: randomUUID(), title: 'Hit a quick hypertrophy workout', category: 'fitness', points: 60 },
      { id: randomUUID(), title: 'Go for a 20-minute walk outside', category: 'fitness', points: 40 },
      { id: randomUUID(), title: '10-minute stretch or mobility session', category: 'fitness', points: 30 },
      // Hobbies
      { id: randomUUID(), title: 'Practice guitar for 15 minutes', category: 'hobby', points: 50 },
      { id: randomUUID(), title: 'Solve a Rubik\'s cube', category: 'hobby', points: 40 },
      { id: randomUUID(), title: 'Play a game of chess', category: 'hobby', points: 45 },
      { id: randomUUID(), title: 'Build a section of your LEGO set', category: 'hobby', points: 60 },
      // Chores
      { id: randomUUID(), title: 'Scoop the cat\'s litter box', category: 'chore', points: 25 },
      { id: randomUUID(), title: 'Tidy up your desk or workspace', category: 'chore', points: 30 },
      { id: randomUUID(), title: 'Quick apartment clean (10 min)', category: 'chore', points: 35 },
      { id: randomUUID(), title: 'Take out the trash', category: 'chore', points: 20 },
      { id: randomUUID(), title: 'Wipe down kitchen surfaces', category: 'chore', points: 25 },
      // Growth
      { id: randomUUID(), title: 'Brainstorm new features for aio.tc', category: 'growth', points: 65 },
      { id: randomUUID(), title: 'Write in a journal for 10 minutes', category: 'growth', points: 35 },
      { id: randomUUID(), title: 'Watch a programming or design tutorial', category: 'growth', points: 50 },
      { id: randomUUID(), title: 'Read for 20 minutes', category: 'growth', points: 40 },
      // Creative
      { id: randomUUID(), title: 'Cook or bake something you haven\'t made before', category: 'creative', points: 65 },
      { id: randomUUID(), title: 'Draw or sketch something', category: 'creative', points: 40 },
      { id: randomUUID(), title: 'Make a nice surprise for Kayd', category: 'creative', points: 80 },
      // Social
      { id: randomUUID(), title: 'Call or message a friend or family member', category: 'social', points: 35 },
      { id: randomUUID(), title: 'Do something kind for someone today', category: 'social', points: 45 },
    ])
  }
}
