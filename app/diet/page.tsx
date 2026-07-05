import { asc, eq } from 'drizzle-orm'
import { db, initDb } from '@/lib/db'
import { dietGoals, dietMeals, dietRules, waterLogs } from '@/lib/db/schema'
import type { DietGoals } from '@/lib/db/schema'
import { todayString } from '@/lib/utils'
import { WaterTracker } from '@/components/diet/water-tracker'
import { MacroGoals } from '@/components/diet/macro-goals'
import { MealPlan } from '@/components/diet/meal-plan'
import { DietRules } from '@/components/diet/diet-rules'
import { PageHeader } from '@/components/ui/page-header'

export const dynamic = 'force-dynamic'

const DEFAULTS: DietGoals = {
  id: 1,
  trainingCalories: 2300, trainingProtein: 180, trainingCarbs: 235, trainingFat: 70,
  restCalories: 2300, restProtein: 180, restCarbs: 235, restFat: 70,
  waterGoalMl: 3500,
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
    <div className="space-y-6">
      <div>
        <PageHeader title="Diet" ghost="Nutrition" sub="Cut + calisthenics recomp · lean, V-taper aesthetic" />
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
