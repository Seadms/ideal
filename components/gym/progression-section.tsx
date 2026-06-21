'use client'

import { useState } from 'react'
import type { SplitDay, SplitExercise, ExerciseLog } from '@/lib/db/schema'
import { TrendChart } from '@/components/progress/trend-chart'
import { LineChart, ChevronDown, ChevronRight, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { formatDate, cn } from '@/lib/utils'

type DayWithExercises = SplitDay & { exercises: SplitExercise[] }

interface Props {
  days: DayWithExercises[]
  logsByExercise: Record<string, ExerciseLog[]>   // ascending by date
}

// The progressed variable differs by exercise type: load for weighted lifts,
// reps for bodyweight, duration for cardio/holds.
function metricFor(ex: SplitExercise, logs: ExerciseLog[]): { values: number[]; unit: string } {
  if (ex.exerciseType === 'cardio') return { values: logs.map(l => l.reps), unit: 'min' }
  if (ex.exerciseType === 'hold') return { values: logs.map(l => l.reps), unit: 'sec' }
  if (ex.exerciseType === 'facial') return { values: logs.map(l => l.reps), unit: 'reps' }
  const weighted = logs.some(l => l.weight > 0)
  return weighted
    ? { values: logs.map(l => l.weight), unit: logs[logs.length - 1]?.unit ?? 'lbs' }
    : { values: logs.map(l => l.reps), unit: 'reps' }
}

function sessionLabel(ex: SplitExercise, l: ExerciseLog): string {
  if (ex.exerciseType === 'cardio') return `${l.reps} min`
  if (ex.exerciseType === 'hold') return `${l.sets}×${l.reps} sec`
  if (ex.exerciseType === 'facial') return `${l.reps} reps`
  return `${l.sets}×${l.reps} @ ${l.weight} ${l.unit}`
}

function Delta({ value, unit }: { value: number; unit: string }) {
  const up = value > 0.05, down = value < -0.05
  const Icon = up ? TrendingUp : down ? TrendingDown : Minus
  // For training metrics, up = progress.
  return (
    <span className={cn('inline-flex items-center gap-0.5 tabular-nums', up ? 'text-emerald-400' : down ? 'text-rose-400' : 'text-zinc-500')}>
      <Icon size={11} />{value > 0 ? '+' : ''}{Math.round(value * 10) / 10} {unit}
    </span>
  )
}

export function ProgressionSection({ days, logsByExercise }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null)

  const daysWithData = days
    .map(day => ({ ...day, exercises: day.exercises.filter(ex => (logsByExercise[ex.id]?.length ?? 0) > 0) }))
    .filter(day => day.exercises.length > 0)

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <LineChart size={14} className="text-emerald-400" />
        <h2 className="text-sm font-semibold text-zinc-200">Progression</h2>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
        {daysWithData.length === 0 ? (
          <p className="text-xs text-zinc-600 text-center py-4">
            Log a few sessions and each exercise&apos;s trend will show up here.
          </p>
        ) : (
          <div className="space-y-4">
            {daysWithData.map(day => (
              <div key={day.id}>
                <p className="text-[10px] uppercase tracking-wider text-zinc-600 mb-1.5">{day.name}</p>
                <div className="rounded-lg border border-zinc-800/80 divide-y divide-zinc-800/60 overflow-hidden">
                  {day.exercises.map(ex => {
                    const logs = logsByExercise[ex.id] ?? []
                    const { values, unit } = metricFor(ex, logs)
                    const latest = values[values.length - 1]
                    const delta = values.length > 1 ? latest - values[0] : 0
                    const isOpen = expanded === ex.id

                    return (
                      <div key={ex.id}>
                        <button
                          onClick={() => setExpanded(isOpen ? null : ex.id)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-zinc-800/30 transition-colors"
                        >
                          {isOpen
                            ? <ChevronDown size={13} className="text-zinc-600 shrink-0" />
                            : <ChevronRight size={13} className="text-zinc-600 shrink-0" />}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-zinc-200 truncate">{ex.name}</p>
                            <p className="text-[10px] text-zinc-500 tabular-nums">
                              {latest} {unit}
                              <span className="text-zinc-700"> · {logs.length} {logs.length === 1 ? 'session' : 'sessions'}</span>
                            </p>
                          </div>
                          {values.length > 1 && (
                            <>
                              <div className="w-16 shrink-0"><TrendChart id={`prog-${ex.id}`} values={values} color="#34d399" height={28} /></div>
                              <span className="shrink-0 text-[10px]"><Delta value={delta} unit={unit} /></span>
                            </>
                          )}
                        </button>

                        {isOpen && (
                          <div className="px-3 pb-3 pt-1 space-y-2 bg-zinc-900/40">
                            {values.length > 1
                              ? <TrendChart id={`prog-lg-${ex.id}`} values={values} color="#34d399" height={72} />
                              : <p className="text-[10px] text-zinc-600">Log this exercise again to chart a trend.</p>}
                            <div className="space-y-0.5">
                              {[...logs].reverse().slice(0, 8).map(l => (
                                <div key={l.id} className="flex items-center justify-between text-[11px]">
                                  <span className="text-zinc-500">{formatDate(l.date)}</span>
                                  <span className="text-zinc-300 tabular-nums">{sessionLabel(ex, l)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
