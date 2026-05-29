import { asc, eq } from 'drizzle-orm'
import { db, initDb } from '@/lib/db'
import { dietGoals, dietMeals, dietRules, waterLogs } from '@/lib/db/schema'
import type { DietGoals } from '@/lib/db/schema'
import { todayString } from '@/lib/utils'
import { WaterTracker } from '@/components/diet/water-tracker'
import { MacroGoals } from '@/components/diet/macro-goals'
import { MealPlan } from '@/components/diet/meal-plan'
import { DietRules } from '@/components/diet/diet-rules'

export const dynamic = 'force-dynamic'

const DEFAULTS: DietGoals = {
  id: 1,
  trainingCalories: 2000, trainingProtein: 160, trainingCarbs: 180, trainingFat: 55,
  restCalories: 1700, restProtein: 160, restCarbs: 100, restFat: 55,
  waterGoalMl: 2750,
}

export default async function DietPage() {
  await initDb()
  const today = todayString()

  const [goalsRows, meals, rules, water] = await Promise.all([
    db.select().from(dietGoals),
    db.select().from(dietMeals).orderBy(asc(dietMeals.mealOrder)),
    db.select().from(dietRules).orderBy(asc(dietRules.ruleOrder)),
    db.select().from(waterLogs).where(eq(waterLogs.date, today)).orderBy(asc(waterLogs.createdAt)),
  ])

  const goals = goalsRows[0] ?? DEFAULTS

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-lg font-semibold text-zinc-100">Diet</h1>
        <p className="text-xs text-zinc-500 mt-0.5">Ethereal Split — 16–20 week recomp · target 10–13% body fat</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-6">
          <WaterTracker logs={water} goalMl={goals.waterGoalMl} />
          <MacroGoals goals={goals} />
        </div>
        <MealPlan meals={meals} />
      </div>

      <DietRules rules={rules} />
    </div>
  )
}
