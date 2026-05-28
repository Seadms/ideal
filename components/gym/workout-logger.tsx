'use client'

import { useState, useTransition } from 'react'
import { logWorkoutEntry, deleteWorkoutEntry } from '@/lib/actions/fitness'
import type { WorkoutEntry } from '@/lib/db/schema'
import { Dumbbell, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'

interface WorkoutLoggerProps {
  entries: WorkoutEntry[]
}

export function WorkoutLogger({ entries }: WorkoutLoggerProps) {
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState({
    exerciseName: '',
    sets: 3,
    reps: 8,
    weight: 0,
    unit: 'lbs',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.exerciseName.trim()) return
    startTransition(async () => {
      await logWorkoutEntry(form)
      setForm(f => ({ ...f, exerciseName: '' }))
    })
  }

  const handleDelete = (id: string) => {
    startTransition(async () => { await deleteWorkoutEntry(id) })
  }

  const totalVolume = entries.reduce((s, e) => s + e.sets * e.reps * e.weight, 0)

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Dumbbell size={14} className="text-amber-400" />
          <h2 className="text-sm font-semibold text-zinc-200">Workout</h2>
        </div>
        {entries.length > 0 && (
          <span className="text-xs text-zinc-600">{entries.length} set{entries.length !== 1 ? 's' : ''} logged</span>
        )}
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            placeholder="Exercise name..."
            value={form.exerciseName}
            onChange={e => setForm(f => ({ ...f, exerciseName: e.target.value }))}
            autoComplete="off"
          />
          <div className="grid grid-cols-4 gap-2">
            <div>
              <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">Sets</p>
              <Input
                type="number" min={1} max={20}
                value={form.sets}
                onChange={e => setForm(f => ({ ...f, sets: Number(e.target.value) }))}
              />
            </div>
            <div>
              <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">Reps</p>
              <Input
                type="number" min={1} max={100}
                value={form.reps}
                onChange={e => setForm(f => ({ ...f, reps: Number(e.target.value) }))}
              />
            </div>
            <div>
              <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">Weight</p>
              <Input
                type="number" min={0} step={2.5}
                value={form.weight}
                onChange={e => setForm(f => ({ ...f, weight: Number(e.target.value) }))}
              />
            </div>
            <div>
              <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">Unit</p>
              <Select
                value={form.unit}
                onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
              >
                <option value="lbs">lbs</option>
                <option value="kg">kg</option>
              </Select>
            </div>
          </div>
          <Button
            type="submit"
            size="sm"
            className="w-full"
            disabled={isPending || !form.exerciseName.trim()}
          >
            <Plus size={13} /> Log Set
          </Button>
        </form>

        {entries.length > 0 ? (
          <div className="space-y-1 pt-1 border-t border-zinc-800">
            {entries.map(e => (
              <div key={e.id} className="group flex items-center gap-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-200 font-medium truncate">{e.exerciseName}</p>
                  <p className="text-xs text-zinc-500">
                    {e.sets} × {e.reps} reps
                    {e.weight > 0 && <span className="text-zinc-400"> @ {e.weight} {e.unit}</span>}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(e.id)}
                  disabled={isPending}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded text-zinc-600 hover:text-rose-400 transition-all"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            {totalVolume > 0 && (
              <p className="text-xs text-zinc-600 pt-2 border-t border-zinc-800/60">
                Total volume: <span className="text-zinc-400">{totalVolume.toLocaleString()} {entries[0]?.unit}</span>
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs text-zinc-600 text-center py-3">No exercises logged yet.</p>
        )}
      </div>
    </section>
  )
}
