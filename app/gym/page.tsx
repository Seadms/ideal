import { asc, eq } from 'drizzle-orm'
import { db, initDb } from '@/lib/db'
import { nutritionEntries, splitDays, splitExercises, exerciseLogs, dietGoals } from '@/lib/db/schema'
import type { ExerciseLog } from '@/lib/db/schema'
import { todayString } from '@/lib/utils'
import { SplitSection } from '@/components/gym/split-section'
import { NutritionLog } from '@/components/gym/nutrition-log'
import { ProgressionSection } from '@/components/gym/progression-section'
import { FacialExercises } from '@/components/gym/facial-exercises'
import { PageHeader } from '@/components/ui/page-header'

export const dynamic = 'force-dynamic'

export default async function GymPage() {
  await initDb()
  const today = todayString()

  const [days, exercises, allLogs, nutrition, dietGoalsRows] = await Promise.all([
    db.select().from(splitDays).orderBy(asc(splitDays.dayOrder)),
    db.select().from(splitExercises).orderBy(asc(splitExercises.exerciseOrder)),
    db.select().from(exerciseLogs).orderBy(asc(exerciseLogs.date)),
    db.select().from(nutritionEntries).where(eq(nutritionEntries.date, today)).orderBy(asc(nutritionEntries.createdAt)),
    db.select().from(dietGoals),
  ])

  // Group exercises under their split day
  const daysWithExercises = days.map(day => ({
    ...day,
    exercises: exercises.filter(ex => ex.splitDayId === day.id),
  }))

  // Full per-exercise history (ascending) for progression charts, plus the most
  // recent log before today for the "prev: …" hint in the logger.
  const logsByExercise: Record<string, ExerciseLog[]> = {}
  const prevLogs: Record<string, ExerciseLog> = {}
  for (const log of allLogs) {
    (logsByExercise[log.exerciseId] ??= []).push(log)
    if (log.date < today) prevLogs[log.exerciseId] = log // asc order → last assigned is most recent
  }

  // Daily macro targets come from diet_goals (single source of truth, shared
  // with the Diet page). Mapped into the shape the nutrition log expects.
  const dg = dietGoalsRows[0]
  const goals = {
    id: 1,
    caloriesGoal: dg?.trainingCalories ?? 2300,
    proteinGoal: dg?.trainingProtein ?? 180,
    carbsGoal: dg?.trainingCarbs ?? 235,
    fatsGoal: dg?.trainingFat ?? 70,
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Gym" ghost="Training" sub="Today's training and nutrition" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <SplitSection days={daysWithExercises} prevLogs={prevLogs} />
        <NutritionLog entries={nutrition} goals={goals} />
      </div>
      <ProgressionSection days={daysWithExercises} logsByExercise={logsByExercise} />
      <FacialExercises />
    </div>
  )
}
