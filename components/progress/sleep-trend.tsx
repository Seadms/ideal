import type { SleepLog } from '@/lib/db/schema'
import { TrendChart } from './trend-chart'
import { Moon } from 'lucide-react'
import { cn } from '@/lib/utils'

// Read-only view of the last 30 days. Logging lives on the dashboard where
// it's one tap; this is where the pattern becomes visible.
export function SleepTrend({ logs }: { logs: SleepLog[] }) {
  const values = logs.map(l => l.hours)
  const avg = values.length
    ? Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 10) / 10
    : null
  const nightsUnder7 = values.filter(v => v < 7).length

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Moon size={14} className="text-indigo-400" />
        <h2 className="text-sm font-semibold text-zinc-200">Sleep</h2>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
        <div className="flex items-end justify-between">
          <div>
            <p className="font-display text-2xl font-bold tabular-nums leading-none text-zinc-100">
              {avg ?? '—'}
              {avg !== null && <span className="ml-1 text-sm font-medium text-zinc-500">h avg</span>}
            </p>
            <p className="mt-1 text-[10px] text-zinc-600">
              {values.length > 0 ? `last ${values.length} night${values.length === 1 ? '' : 's'}` : 'no entries yet'}
            </p>
          </div>
          {values.length > 0 && (
            <p className={cn(
              'text-xs tabular-nums',
              nightsUnder7 > values.length / 2 ? 'text-amber-400' : 'text-zinc-500',
            )}>
              {nightsUnder7} night{nightsUnder7 === 1 ? '' : 's'} under 7h
            </p>
          )}
        </div>

        {values.length > 1 ? (
          <TrendChart id="sleep" values={values} color="#818cf8" height={44} />
        ) : (
          <p className="py-3 text-center text-xs text-zinc-600">
            Log a few nights on the dashboard to see the pattern.
          </p>
        )}
      </div>
    </section>
  )
}
