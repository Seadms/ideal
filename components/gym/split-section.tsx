'use client'

import { useState, useTransition } from 'react'
import { logWorkoutSession } from '@/lib/actions/workout-split'
import type { SplitDay, SplitExercise, ExerciseLog } from '@/lib/db/schema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SplitManagerDialog } from './split-manager-dialog'
import { RestTimer } from './rest-timer'
import { Dumbbell, Settings2, Minus, Plus, Check, X } from 'lucide-react'
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
  // Opt-in per-set logging (strength only)
  const [perSet, setPerSet] = useState<Record<string, boolean>>({})
  const [setRows, setSetRows] = useState<Record<string, { reps: string; weight: string }[]>>({})

  const activeDay = days.find(d => d.id === activeDayId) ?? null

  const getVals = (ex: SplitExercise): ExValues =>
    exerciseValues[ex.id] ?? { sets: ex.defaultSets, reps: ex.defaultReps, weight: ex.defaultWeight, unit: ex.defaultUnit }

  const setVal = (exId: string, patch: Partial<ExValues>) =>
    setExerciseValues(v => ({ ...v, [exId]: { ...getVals({ id: exId } as SplitExercise), ...v[exId], ...patch } }))

  const adjustWeight = (ex: SplitExercise, delta: number) => {
    const w = Number(getVals(ex).weight) || 0
    setExerciseValues(v => ({ ...v, [ex.id]: { ...getVals(ex), ...v[ex.id], weight: Math.max(0, Math.round((w + delta) * 10) / 10) } }))
  }

  // ── Per-set logging helpers ─────────────────────────────────────────────────
  const togglePerSet = (ex: SplitExercise) => {
    setPerSet(p => {
      const next = !p[ex.id]
      if (next) {
        setSetRows(r => {
          if (r[ex.id]?.length) return r
          const v = getVals(ex)
          const n = Math.min(12, Math.max(1, Number(v.sets) || 1))
          return { ...r, [ex.id]: Array.from({ length: n }, () => ({ reps: String(v.reps), weight: String(v.weight) })) }
        })
      }
      return { ...p, [ex.id]: next }
    })
  }
  const setRowVal = (exId: string, idx: number, patch: Partial<{ reps: string; weight: string }>) =>
    setSetRows(r => {
      const rows = [...(r[exId] ?? [])]
      rows[idx] = { ...rows[idx], ...patch }
      return { ...r, [exId]: rows }
    })
  const addSetRow = (exId: string) =>
    setSetRows(r => {
      const rows = r[exId] ?? []
      const last = rows[rows.length - 1] ?? { reps: '8', weight: '0' }
      return { ...r, [exId]: [...rows, { ...last }] }
    })
  const removeSetRow = (exId: string, idx: number) =>
    setSetRows(r => {
      const rows = (r[exId] ?? []).filter((_, i) => i !== idx)
      return { ...r, [exId]: rows.length ? rows : [{ reps: '8', weight: '0' }] }
    })

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
      if (ex.exerciseType === 'cardio') {
        return { exerciseId: ex.id, sets: 1, reps: Number(v.reps) || 0, weight: 0, unit: 'min' }
      }
      if (ex.exerciseType === 'facial') {
        return { exerciseId: ex.id, sets: 1, reps: Number(v.reps) || 0, weight: 0, unit: 'reps' }
      }
      if (ex.exerciseType === 'hold') {
        return { exerciseId: ex.id, sets: Number(v.sets) || 1, reps: Number(v.reps) || 0, weight: 0, unit: 'sec' }
      }
      // Strength — per-set mode derives the summary (top set) from the rows.
      if (perSet[ex.id] && setRows[ex.id]?.length) {
        const details = setRows[ex.id].map(r => ({ reps: Number(r.reps) || 0, weight: Number(r.weight) || 0 }))
        return {
          exerciseId: ex.id,
          sets: details.length,
          reps: Math.max(0, ...details.map(d => d.reps)),
          weight: Math.max(0, ...details.map(d => d.weight)),
          unit: v.unit,
          setDetails: details,
        }
      }
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

  const prevLabel = (ex: SplitExercise, prev: ExerciseLog) => {
    if (ex.exerciseType === 'cardio') return `prev: ${prev.reps} min`
    if (ex.exerciseType === 'facial') return `prev: ${prev.reps} reps`
    if (ex.exerciseType === 'hold') return `prev: ${prev.sets}×${prev.reps} sec`
    return `prev: ${prev.sets}×${prev.reps} @ ${prev.weight} ${prev.unit}`
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

              {/* Program notes */}
              <div className="rounded-lg bg-zinc-800/40 px-3 py-2 text-[10px] leading-relaxed text-zinc-500">
                <span className="text-zinc-400">Overload:</span> at the top of a rep range, advance the variation or add load.
                <span className="text-zinc-400"> · Conditioning:</span> 2×/wk zone-2, 20–40 min.
                <span className="text-zinc-400"> · Mobility:</span> 5 min daily.
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
                      <RestTimer />
                      <div className="divide-y divide-zinc-800/60 -mx-4">
                        {activeDay.exercises.map(ex => {
                          const vals = { ...getVals(ex), ...exerciseValues[ex.id] }
                          const prev = prevLogs[ex.id]
                          return (
                            <div key={ex.id} className="px-4 py-3 space-y-2.5">
                              <div>
                                <p className="text-sm font-medium text-zinc-200">{ex.name}</p>
                                {ex.target && (
                                  <p className="text-[10px] text-indigo-400/80 mt-0.5">{ex.target}</p>
                                )}
                                {prev ? (
                                  <p className="text-[10px] text-zinc-600 mt-0.5">{prevLabel(ex, prev)}</p>
                                ) : (
                                  <p className="text-[10px] text-zinc-700 mt-0.5">no previous session</p>
                                )}
                              </div>

                              {ex.exerciseType === 'strength' && (
                                <div className="space-y-2">
                                  <div className="flex justify-end">
                                    <button
                                      onClick={() => togglePerSet(ex)}
                                      className="text-[10px] text-zinc-600 hover:text-zinc-300 transition-colors"
                                    >
                                      {perSet[ex.id] ? '↩ quick log' : 'log per set →'}
                                    </button>
                                  </div>

                                  {!perSet[ex.id] ? (
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
                                  ) : (
                                    <div className="space-y-1.5">
                                      {(setRows[ex.id] ?? []).map((row, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                          <span className="text-[10px] text-zinc-600 w-9 shrink-0">Set {i + 1}</span>
                                          <Input
                                            type="number" min={0} max={100}
                                            value={row.reps}
                                            onChange={e => setRowVal(ex.id, i, { reps: e.target.value })}
                                            className="w-14 h-7 text-xs text-center py-0 px-1"
                                          />
                                          <span className="text-[10px] text-zinc-700">reps @</span>
                                          <Input
                                            type="number" min={0} step={2.5}
                                            value={row.weight}
                                            onChange={e => setRowVal(ex.id, i, { weight: e.target.value })}
                                            className="w-16 h-7 text-xs text-center py-0 px-1"
                                          />
                                          <span className="text-[10px] text-zinc-600">{vals.unit}</span>
                                          <button
                                            onClick={() => removeSetRow(ex.id, i)}
                                            className="ml-auto p-1 text-zinc-700 hover:text-rose-400 transition-colors"
                                          >
                                            <X size={11} />
                                          </button>
                                        </div>
                                      ))}
                                      <button
                                        onClick={() => addSetRow(ex.id)}
                                        className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
                                      >
                                        <Plus size={10} /> Add set
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}

                              {ex.exerciseType === 'cardio' && (
                                <div>
                                  <p className="text-[9px] text-zinc-600 mb-1">Duration (min)</p>
                                  <Input
                                    type="number" min={1} max={300}
                                    value={vals.reps}
                                    onChange={e => setVal(ex.id, { reps: e.target.value })}
                                    className="w-20 h-7 text-xs text-center py-0 px-1"
                                  />
                                </div>
                              )}

                              {ex.exerciseType === 'facial' && (
                                <div>
                                  <p className="text-[9px] text-zinc-600 mb-1">Reps</p>
                                  <Input
                                    type="number" min={1} max={50}
                                    value={vals.reps}
                                    onChange={e => setVal(ex.id, { reps: e.target.value })}
                                    className="w-16 h-7 text-xs text-center py-0 px-1"
                                  />
                                </div>
                              )}

                              {ex.exerciseType === 'hold' && (
                                <div className="flex items-end gap-2">
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
                                  <div>
                                    <p className="text-[9px] text-zinc-600 mb-1">Duration (sec)</p>
                                    <Input
                                      type="number" min={1} max={600}
                                      value={vals.reps}
                                      onChange={e => setVal(ex.id, { reps: e.target.value })}
                                      className="w-20 h-7 text-xs text-center py-0 px-1"
                                    />
                                  </div>
                                </div>
                              )}
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
