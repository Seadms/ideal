import { asc, eq } from 'drizzle-orm'
import { db, initDb } from '@/lib/db'
import { workoutEntries, nutritionEntries } from '@/lib/db/schema'
import { todayString } from '@/lib/utils'
import { WorkoutLogger } from '@/components/gym/workout-logger'
import { NutritionLog } from '@/components/gym/nutrition-log'

export const dynamic = 'force-dynamic'

export default async function GymPage() {
  await initDb()
  const today = todayString()

  const [workout, nutrition] = await Promise.all([
    db.select().from(workoutEntries)
      .where(eq(workoutEntries.date, today))
      .orderBy(asc(workoutEntries.createdAt)),
    db.select().from(nutritionEntries)
      .where(eq(nutritionEntries.date, today))
      .orderBy(asc(nutritionEntries.createdAt)),
  ])

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-lg font-semibold text-zinc-100">Gym</h1>
        <p className="text-xs text-zinc-500 mt-0.5">Today's training &amp; nutrition</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <WorkoutLogger entries={workout} />
        <NutritionLog entries={nutrition} />
      </div>
    </div>
  )
}
