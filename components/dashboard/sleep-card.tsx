'use client'

import { useState, useTransition } from 'react'
import { Moon } from 'lucide-react'
import { logSleep } from '@/lib/actions/progress'
import { cn } from '@/lib/utils'

// One-tap sleep logging. Friction is the whole game here: if this took a form
// and a save button it would go untracked, so it's a row of preset hours.
const PRESETS = [5, 6, 7, 8, 9, 10]

export function SleepCard({ hoursToday, avg7 }: { hoursToday: number | null; avg7: number | null }) {
  const [optimistic, setOptimistic] = useState<number | null>(hoursToday)
  const [isPending, startTransition] = useTransition()

  const pick = (h: number) => {
    setOptimistic(h)
    startTransition(async () => { await logSleep(h) })
  }

  const logged = optimistic !== null
  // 7h is the floor that matters for recovery, cut adherence, and focus.
  const short = logged && optimistic < 7

  return (
    <section className={cn(
      'rounded-xl border px-4 py-3 transition-colors',
      short ? 'border-amber-500/20 bg-amber-500/5' : 'border-zinc-800 bg-zinc-900/40',
      isPending && 'opacity-70',
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Moon size={13} className={short ? 'text-amber-400' : 'text-indigo-400'} />
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Sleep</span>
        </div>
        <span className="text-xs text-zinc-600">
          {logged
            ? <><span className={cn('font-medium', short ? 'text-amber-300' : 'text-zinc-300')}>{optimistic}h</span> last night</>
            : 'not logged'}
          {avg7 !== null && <span className="ml-2">· {avg7}h avg</span>}
        </span>
      </div>

      <div className="mt-2.5 flex gap-1.5">
        {PRESETS.map(h => (
          <button
            key={h}
            onClick={() => pick(h)}
            disabled={isPending}
            aria-label={`Log ${h} hours of sleep`}
            className={cn(
              'flex-1 rounded-lg py-2 font-display text-sm font-semibold tabular-nums transition-colors',
              optimistic === h
                ? 'bg-indigo-500/20 text-indigo-200 ring-1 ring-indigo-400/40'
                : 'bg-zinc-800/60 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200',
            )}
          >
            {h}
          </button>
        ))}
      </div>
    </section>
  )
}
