'use client'

import { useState, useTransition } from 'react'
import {
  createSplitDay, updateSplitDay, deleteSplitDay,
  addSplitExercise, updateSplitExercise, deleteSplitExercise,
} from '@/lib/actions/workout-split'
import type { SplitDay, SplitExercise } from '@/lib/db/schema'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import { Plus, Trash2, ChevronDown, ChevronRight, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type DayWithExercises = SplitDay & { exercises: SplitExercise[] }

interface Props {
  open: boolean
  onClose: () => void
  days: DayWithExercises[]
}

const DEFAULT_EXERCISE_FORM = { name: '', exerciseType: 'strength', target: '', sets: '3', reps: '8', weight: '0', unit: 'lbs' }

const TYPE_LABELS: Record<string, string> = { strength: 'Strength', cardio: 'Cardio', facial: 'Facial', hold: 'Hold' }

export function SplitManagerDialog({ open, onClose, days }: Props) {
  const [isPending, startTransition] = useTransition()
  const [expandedDayId, setExpandedDayId] = useState<string | null>(null)
  const [newDayName, setNewDayName] = useState('')
  const [editingDayId, setEditingDayId] = useState<string | null>(null)
  const [editingDayName, setEditingDayName] = useState('')
  const [addExForm, setAddExForm] = useState<Record<string, typeof DEFAULT_EXERCISE_FORM>>({})
  const [editingExId, setEditingExId] = useState<string | null>(null)
  const [editingExName, setEditingExName] = useState('')

  const handleAddDay = () => {
    if (!newDayName.trim()) return
    startTransition(async () => {
      await createSplitDay(newDayName)
      setNewDayName('')
    })
  }

  const handleSaveDay = (id: string) => {
    if (!editingDayName.trim()) return
    startTransition(async () => {
      await updateSplitDay(id, editingDayName)
      setEditingDayId(null)
    })
  }

  const handleDeleteDay = (id: string) => {
    startTransition(async () => { await deleteSplitDay(id) })
  }

  const getExForm = (dayId: string) => addExForm[dayId] ?? DEFAULT_EXERCISE_FORM
  const setExForm = (dayId: string, patch: Partial<typeof DEFAULT_EXERCISE_FORM>) =>
    setAddExForm(f => ({ ...f, [dayId]: { ...getExForm(dayId), ...patch } }))

  const handleAddExercise = (dayId: string) => {
    const form = getExForm(dayId)
    if (!form.name.trim()) return
    const isCardio = form.exerciseType === 'cardio'
    const isFacial = form.exerciseType === 'facial'
    const isHold = form.exerciseType === 'hold'
    startTransition(async () => {
      await addSplitExercise({
        splitDayId: dayId,
        name: form.name,
        exerciseType: form.exerciseType,
        target: form.target.trim() || null,
        defaultSets: isCardio || isFacial ? 1 : Number(form.sets) || 1,
        defaultReps: Number(form.reps) || 1,
        defaultWeight: isCardio || isFacial || isHold ? 0 : Number(form.weight) || 0,
        defaultUnit: isCardio ? 'min' : isFacial ? 'reps' : isHold ? 'sec' : form.unit,
      })
      setAddExForm(f => ({ ...f, [dayId]: DEFAULT_EXERCISE_FORM }))
    })
  }

  const handleDeleteExercise = (id: string) => {
    startTransition(async () => { await deleteSplitExercise(id) })
  }

  const handleSaveExerciseName = (id: string) => {
    if (!editingExName.trim()) return
    startTransition(async () => {
      await updateSplitExercise(id, { name: editingExName })
      setEditingExId(null)
    })
  }

  const exTypeLabel = (ex: SplitExercise) => {
    if (ex.exerciseType === 'cardio') return `${ex.defaultReps} min`
    if (ex.exerciseType === 'facial') return `${ex.defaultReps} reps`
    if (ex.exerciseType === 'hold') return `${ex.defaultSets}×${ex.defaultReps} sec`
    return `${ex.defaultSets}×${ex.defaultReps} @ ${ex.defaultWeight} ${ex.defaultUnit}`
  }

  return (
    <Dialog open={open} onClose={onClose} title="Manage Workout Split">
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">

        {/* Existing days */}
        {days.map(day => (
          <div key={day.id} className="rounded-xl border border-zinc-800 overflow-hidden">
            {/* Day header */}
            <div className="flex items-center gap-2 px-3 py-2.5 bg-zinc-800/40">
              <button
                onClick={() => setExpandedDayId(expandedDayId === day.id ? null : day.id)}
                className="flex items-center gap-2 flex-1 min-w-0 text-left"
              >
                {expandedDayId === day.id
                  ? <ChevronDown size={13} className="text-zinc-500 shrink-0" />
                  : <ChevronRight size={13} className="text-zinc-500 shrink-0" />}
                {editingDayId === day.id ? (
                  <Input
                    value={editingDayName}
                    onChange={e => setEditingDayName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveDay(day.id); if (e.key === 'Escape') setEditingDayId(null) }}
                    className="h-6 py-0 text-sm"
                    autoFocus
                    onClick={e => e.stopPropagation()}
                  />
                ) : (
                  <span className="text-sm font-medium text-zinc-200">{day.name}</span>
                )}
                <span className="text-xs text-zinc-600 shrink-0">{day.exercises.length} exercises</span>
              </button>
              <div className="flex items-center gap-1 shrink-0">
                {editingDayId === day.id ? (
                  <>
                    <button onClick={() => handleSaveDay(day.id)} disabled={isPending} className="p-1 text-emerald-400 hover:text-emerald-300">
                      <Check size={13} />
                    </button>
                    <button onClick={() => setEditingDayId(null)} className="p-1 text-zinc-500 hover:text-zinc-300">
                      <X size={13} />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => { setEditingDayId(day.id); setEditingDayName(day.name) }}
                    className="px-2 py-0.5 text-[11px] text-zinc-600 hover:text-zinc-300 transition-colors"
                  >
                    rename
                  </button>
                )}
                <button
                  onClick={() => handleDeleteDay(day.id)}
                  disabled={isPending}
                  className="p-1 text-zinc-600 hover:text-rose-400 transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>

            {/* Exercises (expanded) */}
            {expandedDayId === day.id && (
              <div className="divide-y divide-zinc-800/60">
                {day.exercises.map(ex => (
                  <div key={ex.id} className="flex items-center gap-2 px-3 py-2">
                    {editingExId === ex.id ? (
                      <Input
                        value={editingExName}
                        onChange={e => setEditingExName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSaveExerciseName(ex.id); if (e.key === 'Escape') setEditingExId(null) }}
                        className="h-7 py-0 text-xs flex-1"
                        autoFocus
                      />
                    ) : (
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-zinc-300">{ex.name}</p>
                        {ex.target && <p className="text-[10px] text-indigo-400/70 truncate">{ex.target}</p>}
                        <p className="text-[10px] text-zinc-600">
                          <span className="text-zinc-700 mr-1">{TYPE_LABELS[ex.exerciseType] ?? ex.exerciseType}</span>
                          {exTypeLabel(ex)}
                        </p>
                      </div>
                    )}
                    <div className="flex items-center gap-1 shrink-0">
                      {editingExId === ex.id ? (
                        <>
                          <button onClick={() => handleSaveExerciseName(ex.id)} disabled={isPending} className="p-1 text-emerald-400">
                            <Check size={11} />
                          </button>
                          <button onClick={() => setEditingExId(null)} className="p-1 text-zinc-500">
                            <X size={11} />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => { setEditingExId(ex.id); setEditingExName(ex.name) }}
                          className="px-1.5 py-0.5 text-[10px] text-zinc-600 hover:text-zinc-300 transition-colors"
                        >
                          rename
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteExercise(ex.id)}
                        disabled={isPending}
                        className="p-1 text-zinc-600 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Add exercise form */}
                <div className="px-3 py-2.5 space-y-2 bg-zinc-900/40">
                  <div className="flex gap-1.5">
                    <Input
                      placeholder="Exercise name..."
                      value={getExForm(day.id).name}
                      onChange={e => setExForm(day.id, { name: e.target.value })}
                      className="h-7 text-xs py-0 flex-1"
                    />
                    <Select
                      value={getExForm(day.id).exerciseType}
                      onChange={e => setExForm(day.id, { exerciseType: e.target.value })}
                      className="h-7 text-xs py-0 w-24"
                    >
                      <option value="strength">Strength</option>
                      <option value="cardio">Cardio</option>
                      <option value="facial">Facial</option>
                      <option value="hold">Hold</option>
                    </Select>
                  </div>

                  <Input
                    placeholder="Target / progression hint (optional, e.g. 3–4 × 6–12 · weighted)"
                    value={getExForm(day.id).target}
                    onChange={e => setExForm(day.id, { target: e.target.value })}
                    className="h-7 text-xs py-0"
                  />

                  {getExForm(day.id).exerciseType === 'strength' && (
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { label: 'Sets', key: 'sets' as const, type: 'number', min: 1, max: 20 },
                        { label: 'Reps', key: 'reps' as const, type: 'number', min: 1, max: 100 },
                        { label: 'Wt', key: 'weight' as const, type: 'number', min: 0, step: 2.5 },
                      ].map(field => (
                        <div key={field.key}>
                          <p className="text-[9px] text-zinc-600 mb-0.5">{field.label}</p>
                          <Input
                            type={field.type}
                            min={field.min}
                            max={'max' in field ? field.max : undefined}
                            step={'step' in field ? field.step : undefined}
                            value={getExForm(day.id)[field.key]}
                            onChange={e => setExForm(day.id, { [field.key]: e.target.value })}
                            className="h-7 text-xs py-0"
                          />
                        </div>
                      ))}
                      <div>
                        <p className="text-[9px] text-zinc-600 mb-0.5">Unit</p>
                        <Select
                          value={getExForm(day.id).unit}
                          onChange={e => setExForm(day.id, { unit: e.target.value })}
                          className="h-7 text-xs py-0"
                        >
                          <option value="lbs">lbs</option>
                          <option value="kg">kg</option>
                        </Select>
                      </div>
                    </div>
                  )}

                  {getExForm(day.id).exerciseType === 'cardio' && (
                    <div className="w-24">
                      <p className="text-[9px] text-zinc-600 mb-0.5">Duration (min)</p>
                      <Input
                        type="number" min={1} max={300}
                        value={getExForm(day.id).reps}
                        onChange={e => setExForm(day.id, { reps: e.target.value })}
                        className="h-7 text-xs py-0"
                      />
                    </div>
                  )}

                  {getExForm(day.id).exerciseType === 'facial' && (
                    <div className="w-24">
                      <p className="text-[9px] text-zinc-600 mb-0.5">Reps</p>
                      <Input
                        type="number" min={1} max={50}
                        value={getExForm(day.id).reps}
                        onChange={e => setExForm(day.id, { reps: e.target.value })}
                        className="h-7 text-xs py-0"
                      />
                    </div>
                  )}

                  {getExForm(day.id).exerciseType === 'hold' && (
                    <div className="grid grid-cols-2 gap-1.5 w-48">
                      <div>
                        <p className="text-[9px] text-zinc-600 mb-0.5">Sets</p>
                        <Input
                          type="number" min={1} max={20}
                          value={getExForm(day.id).sets}
                          onChange={e => setExForm(day.id, { sets: e.target.value })}
                          className="h-7 text-xs py-0"
                        />
                      </div>
                      <div>
                        <p className="text-[9px] text-zinc-600 mb-0.5">Duration (sec)</p>
                        <Input
                          type="number" min={1} max={600}
                          value={getExForm(day.id).reps}
                          onChange={e => setExForm(day.id, { reps: e.target.value })}
                          className="h-7 text-xs py-0"
                        />
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => handleAddExercise(day.id)}
                    disabled={isPending || !getExForm(day.id).name.trim()}
                    className={cn(
                      'flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors',
                      getExForm(day.id).name.trim()
                        ? 'text-zinc-300 hover:bg-zinc-700 bg-zinc-800'
                        : 'text-zinc-600 cursor-not-allowed',
                    )}
                  >
                    <Plus size={11} /> Add Exercise
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Add new day */}
        <div className="flex gap-2 pt-1">
          <Input
            placeholder="New day name (e.g. Push)"
            value={newDayName}
            onChange={e => setNewDayName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAddDay() }}
          />
          <Button onClick={handleAddDay} disabled={isPending || !newDayName.trim()} size="sm" className="shrink-0">
            <Plus size={13} /> Add Day
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
