import { asc, desc, eq, lt } from 'drizzle-orm'
import { db, initDb } from '@/lib/db'
import { nutritionEntries, splitDays, splitExercises, exerciseLogs, nutritionGoals } from '@/lib/db/schema'
import type { ExerciseLog } from '@/lib/db/schema'
import { todayString } from '@/lib/utils'
import { SplitSection } from '@/components/gym/split-section'
import { NutritionLog } from '@/components/gym/nutrition-log'
import { FacialExercises } from '@/components/gym/facial-exercises'

export const dynamic = 'force-dynamic'

export default async function GymPage() {
  await initDb()
  const today = todayString()

  const [days, exercises, allPrevLogs, nutrition, goalsRows] = await Promise.all([
    db.select().from(splitDays).orderBy(asc(splitDays.dayOrder)),
    db.select().from(splitExercises).orderBy(asc(splitExercises.exerciseOrder)),
    db.select().from(exerciseLogs).where(lt(exerciseLogs.date, today)).orderBy(desc(exerciseLogs.date)),
    db.select().from(nutritionEntries).where(eq(nutritionEntries.date, today)).orderBy(asc(nutritionEntries.createdAt)),
    db.select().from(nutritionGoals),
  ])

  // Group exercises under their split day
  const daysWithExercises = days.map(day => ({
    ...day,
    exercises: exercises.filter(ex => ex.splitDayId === day.id),
  }))

  // Most recent log per exercise (date < today)
  const prevLogs: Record<string, ExerciseLog> = {}
  for (const log of allPrevLogs) {
    if (!prevLogs[log.exerciseId]) prevLogs[log.exerciseId] = log
  }

  const goals = goalsRows[0] ?? { id: 1, caloriesGoal: 2500, proteinGoal: 180, carbsGoal: 280, fatsGoal: 70 }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-lg font-semibold text-zinc-100">Gym</h1>
        <p className="text-xs text-zinc-500 mt-0.5">Today's training &amp; nutrition</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <SplitSection days={daysWithExercises} prevLogs={prevLogs} />
        <NutritionLog entries={nutrition} goals={goals} />
      </div>
      <FacialExercises />
    </div>
  )
}
