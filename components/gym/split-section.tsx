'use client'

import { useState, useTransition } from 'react'
import { logWorkoutSession } from '@/lib/actions/workout-split'
import type { SplitDay, SplitExercise, ExerciseLog } from '@/lib/db/schema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SplitManagerDialog } from './split-manager-dialog'
import { Dumbbell, Settings2, Minus, Plus, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

type DayWithExercises = SplitDay & { exercises: SplitExercise[] }
type ExValues = { sets: number | string; reps: number | string; weight: number | string; unit: string }

interface Props {
  days: DayWithExercises[]
  prevLogs: Record<string, ExerciseLog>
}

function initValues(days: DayWithExercises[]): Record<string, ExValues> {
  const out: Record<string, ExValues> = {}
  for (const day of days) {
    for (const ex of day.exercises) {
      out[ex.id] = { sets: ex.defaultSets, reps: ex.defaultReps, weight: ex.defaultWeight, unit: ex.defaultUnit }
    }
  }
  return out
}

export function SplitSection({ days, prevLogs }: Props) {
  const [isPending, startTransition] = useTransition()
  const [activeDayId, setActiveDayId] = useState<string | null>(days[0]?.id ?? null)
  const [manageOpen, setManageOpen] = useState(false)
  const [logged, setLogged] = useState(false)
  const [exerciseValues, setExerciseValues] = useState<Record<string, ExValues>>(() => initValues(days))

  const activeDay = days.find(d => d.id === activeDayId) ?? null

  const getVals = (ex: SplitExercise): ExValues =>
    exerciseValues[ex.id] ?? { sets: ex.defaultSets, reps: ex.defaultReps, weight: ex.defaultWeight, unit: ex.defaultUnit }

  const setVal = (exId: string, patch: Partial<ExValues>) =>
    setExerciseValues(v => ({ ...v, [exId]: { ...getVals({ id: exId } as SplitExercise), ...v[exId], ...patch } }))

  const adjustWeight = (ex: SplitExercise, delta: number) => {
    const w = Number(getVals(ex).weight) || 0
    setExerciseValues(v => ({ ...v, [ex.id]: { ...getVals(ex), ...v[ex.id], weight: Math.max(0, Math.round((w + delta) * 10) / 10) } }))
  }

  const handleDaySelect = (dayId: string) => {
    setActiveDayId(dayId)
    setLogged(false)
    const day = days.find(d => d.id === dayId)
    if (!day) return
    setExerciseValues(v => {
      const next = { ...v }
      for (const ex of day.exercises) {
        if (!next[ex.id]) {
          next[ex.id] = { sets: ex.defaultSets, reps: ex.defaultReps, weight: ex.defaultWeight, unit: ex.defaultUnit }
        }
      }
      return next
    })
  }

  const handleLogSession = () => {
    if (!activeDay || activeDay.exercises.length === 0) return
    const entries = activeDay.exercises.map(ex => {
      const v = { ...getVals(ex), ...exerciseValues[ex.id] }
      return {
        exerciseId: ex.id,
        sets: Number(v.sets) || 1,
        reps: Number(v.reps) || 1,
        weight: Number(v.weight) || 0,
        unit: v.unit,
      }
    })
    startTransition(async () => {
      await logWorkoutSession(entries)
      setLogged(true)
      setTimeout(() => setLogged(false), 3000)
    })
  }

  return (
    <>
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Dumbbell size={14} className="text-indigo-400" />
            <h2 className="text-sm font-semibold text-zinc-200">Workout Split</h2>
          </div>
          <button
            onClick={() => setManageOpen(true)}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <Settings2 size={12} /> Manage
          </button>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-4">
          {days.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-xs text-zinc-600 mb-3">No split configured yet.</p>
              <button
                onClick={() => setManageOpen(true)}
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                + Create your workout split
              </button>
            </div>
          ) : (
            <>
              {/* Day chips */}
              <div className="flex flex-wrap gap-1.5">
                {days.map(day => (
                  <button
                    key={day.id}
                    onClick={() => handleDaySelect(day.id)}
                    className={cn(
                      'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                      activeDayId === day.id
                        ? 'bg-indigo-600 text-white'
                        : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200',
                    )}
                  >
                    {day.name}
                  </button>
                ))}
              </div>

              {/* Active day */}
              {activeDay && (
                <div className="space-y-3">
                  {activeDay.exercises.length === 0 ? (
                    <p className="text-xs text-zinc-600 text-center py-4">
                      No exercises in {activeDay.name}. Click Manage to add some.
                    </p>
                  ) : (
                    <>
                      <div className="divide-y divide-zinc-800/60 -mx-4">
                        {activeDay.exercises.map(ex => {
                          const vals = { ...getVals(ex), ...exerciseValues[ex.id] }
                          const prev = prevLogs[ex.id]
                          return (
                            <div key={ex.id} className="px-4 py-3 space-y-2.5">
                              <div>
                                <p className="text-sm font-medium text-zinc-200">{ex.name}</p>
                                {prev ? (
                                  <p className="text-[10px] text-zinc-600 mt-0.5">
                                    prev: {prev.sets}×{prev.reps} @ {prev.weight} {prev.unit}
                                  </p>
                                ) : (
                                  <p className="text-[10px] text-zinc-700 mt-0.5">no previous session</p>
                                )}
                              </div>
                              <div className="flex items-end gap-2">
                                {/* Sets */}
                                <div>
                                  <p className="text-[9px] text-zinc-600 mb-1">Sets</p>
                                  <Input
                                    type="number" min={1} max={20}
                                    value={vals.sets}
                                    onChange={e => setVal(ex.id, { sets: e.target.value })}
                                    className="w-12 h-7 text-xs text-center py-0 px-1"
                                  />
                                </div>
                                <span className="text-zinc-700 pb-1.5">×</span>
                                {/* Reps */}
                                <div>
                                  <p className="text-[9px] text-zinc-600 mb-1">Reps</p>
                                  <Input
                                    type="number" min={1} max={100}
                                    value={vals.reps}
                                    onChange={e => setVal(ex.id, { reps: e.target.value })}
                                    className="w-12 h-7 text-xs text-center py-0 px-1"
                                  />
                                </div>
                                <span className="text-zinc-700 pb-1.5">@</span>
                                {/* Weight with +/- */}
                                <div className="flex-1">
                                  <p className="text-[9px] text-zinc-600 mb-1">Weight ({vals.unit})</p>
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => adjustWeight(ex, -2.5)}
                                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 transition-colors"
                                    >
                                      <Minus size={10} />
                                    </button>
                                    <Input
                                      type="number" min={0} step={2.5}
                                      value={vals.weight}
                                      onChange={e => setVal(ex.id, { weight: e.target.value })}
                                      className="w-16 h-7 text-xs text-center py-0 px-1"
                                    />
                                    <button
                                      onClick={() => adjustWeight(ex, 2.5)}
                                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 transition-colors"
                                    >
                                      <Plus size={10} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      <Button
                        onClick={handleLogSession}
                        disabled={isPending || logged}
                        size="sm"
                        className={cn(
                          'w-full transition-all',
                          logged && 'bg-emerald-600 hover:bg-emerald-600 border-emerald-600',
                        )}
                      >
                        {logged ? <><Check size={13} /> Session Logged</> : 'Log Session'}
                      </Button>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <SplitManagerDialog open={manageOpen} onClose={() => setManageOpen(false)} days={days} />
    </>
  )
}
