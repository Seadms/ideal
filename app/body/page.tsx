import Link from 'next/link'
import { initDb } from '@/lib/db'
import { PageHeader } from '@/components/ui/page-header'
import { TrainingView } from '@/components/body/training-view'
import { NutritionView } from '@/components/body/nutrition-view'
import { ProgressView } from '@/components/body/progress-view'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const TABS = [
  { key: 'training',  label: 'Training',  ghost: 'Gym',     sub: "Today's split, mobility, and the daily nutrition log" },
  { key: 'nutrition', label: 'Nutrition', ghost: 'Diet',    sub: 'Cut targets, meal plan, water, and the rules' },
  { key: 'progress',  label: 'Progress',  ghost: 'Recomp',  sub: 'Weight, sleep, strength, and photos over time' },
] as const

type TabKey = (typeof TABS)[number]['key']

interface PageProps {
  searchParams: Promise<{ tab?: string }>
}

// One "Body" tab with three segments. Only the active segment's data is
// fetched, so this stays as cheap as the three separate pages it replaced.
export default async function BodyPage({ searchParams }: PageProps) {
  await initDb()
  const { tab } = await searchParams
  const active: TabKey = TABS.some(t => t.key === tab) ? (tab as TabKey) : 'training'
  const meta = TABS.find(t => t.key === active)!

  return (
    <div className="space-y-6">
      <PageHeader title="Body" ghost={meta.ghost} sub={meta.sub} />

      <nav className="flex gap-1 rounded-xl border border-zinc-800 bg-zinc-900/40 p-1" aria-label="Body sections">
        {TABS.map(t => {
          const isActive = t.key === active
          return (
            <Link
              key={t.key}
              href={t.key === 'training' ? '/body' : `/body?tab=${t.key}`}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex-1 rounded-lg py-2 text-center text-xs font-medium transition-colors',
                isActive
                  ? 'bg-zinc-100 text-zinc-950'
                  : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200',
              )}
            >
              {t.label}
            </Link>
          )
        })}
      </nav>

      {active === 'training' && <TrainingView />}
      {active === 'nutrition' && <NutritionView />}
      {active === 'progress' && <ProgressView />}
    </div>
  )
}
