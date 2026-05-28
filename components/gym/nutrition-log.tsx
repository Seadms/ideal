'use client'

import { useState, useTransition } from 'react'
import { logNutritionEntry, deleteNutritionEntry } from '@/lib/actions/fitness'
import type { NutritionEntry } from '@/lib/db/schema'
import { Flame, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface NutritionLogProps {
  entries: NutritionEntry[]
}

const PROTEIN_GOAL = 180 // grams — rough target

export function NutritionLog({ entries }: NutritionLogProps) {
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState({
    mealName: '',
    calories: 0,
    protein: 0,
    carbs: 0,
    fats: 0,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.mealName.trim()) return
    startTransition(async () => {
      await logNutritionEntry(form)
      setForm({ mealName: '', calories: 0, protein: 0, carbs: 0, fats: 0 })
    })
  }

  const handleDelete = (id: string) => {
    startTransition(async () => { await deleteNutritionEntry(id) })
  }

  const totals = entries.reduce(
    (s, e) => ({
      calories: s.calories + e.calories,
      protein: s.protein + e.protein,
      carbs: s.carbs + e.carbs,
      fats: s.fats + e.fats,
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 },
  )

  const proteinPct = Math.min(Math.round((totals.protein / PROTEIN_GOAL) * 100), 100)

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Flame size={14} className="text-orange-400" />
        <h2 className="text-sm font-semibold text-zinc-200">Nutrition</h2>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-4">

        {/* Daily totals */}
        {entries.length > 0 && (
          <div className="space-y-3 pb-4 border-b border-zinc-800">
            {/* Protein — highlighted */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-emerald-400">Protein</span>
                <span className="text-xs text-emerald-400 font-semibold tabular-nums">
                  {totals.protein.toFixed(1)}g
                  <span className="text-zinc-600 font-normal"> / {PROTEIN_GOAL}g</span>
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${proteinPct}%` }}
                />
              </div>
            </div>

            {/* Other macros */}
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: 'Calories', value: totals.calories.toFixed(0), unit: 'kcal', color: 'text-amber-400' },
                { label: 'Carbs', value: totals.carbs.toFixed(1), unit: 'g', color: 'text-blue-400' },
                { label: 'Fats', value: totals.fats.toFixed(1), unit: 'g', color: 'text-rose-400' },
              ].map(({ label, value, unit, color }) => (
                <div key={label} className="rounded-lg bg-zinc-800/60 px-2 py-2">
                  <p className={cn('text-sm font-semibold tabular-nums', color)}>{value}</p>
                  <p className="text-[10px] text-zinc-600 mt-0.5">{label} ({unit})</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            placeholder="Meal name (e.g. Breakfast)"
            value={form.mealName}
            onChange={e => setForm(f => ({ ...f, mealName: e.target.value }))}
            autoComplete="off"
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">Calories</p>
              <Input
                type="number" min={0}
                value={form.calories}
                onChange={e => setForm(f => ({ ...f, calories: Number(e.target.value) }))}
              />
            </div>
            <div>
              <p className="text-[10px] text-emerald-600 uppercase tracking-wider mb-1 font-medium">Protein (g)</p>
              <Input
                type="number" min={0} step={0.1}
                value={form.protein}
                onChange={e => setForm(f => ({ ...f, protein: Number(e.target.value) }))}
                className="border-emerald-800/40 focus:border-emerald-600/60"
              />
            </div>
            <div>
              <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">Carbs (g)</p>
              <Input
                type="number" min={0} step={0.1}
                value={form.carbs}
                onChange={e => setForm(f => ({ ...f, carbs: Number(e.target.value) }))}
              />
            </div>
            <div>
              <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">Fats (g)</p>
              <Input
                type="number" min={0} step={0.1}
                value={form.fats}
                onChange={e => setForm(f => ({ ...f, fats: Number(e.target.value) }))}
              />
            </div>
          </div>
          <Button
            type="submit"
            size="sm"
            className="w-full"
            disabled={isPending || !form.mealName.trim()}
          >
            <Plus size={13} /> Log Meal
          </Button>
        </form>

        {/* Meal list */}
        {entries.length > 0 && (
          <div className="space-y-1 pt-1 border-t border-zinc-800">
            {entries.map(e => (
              <div key={e.id} className="group flex items-center gap-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-200 font-medium truncate">{e.mealName}</p>
                  <p className="text-xs text-zinc-500">
                    {e.calories} kcal
                    <span className="text-emerald-600 ml-1">{e.protein.toFixed(1)}g protein</span>
                    {e.carbs > 0 && <span className="ml-1">{e.carbs.toFixed(1)}g carbs</span>}
                    {e.fats > 0 && <span className="ml-1">{e.fats.toFixed(1)}g fats</span>}
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
          </div>
        )}

        {entries.length === 0 && (
          <p className="text-xs text-zinc-600 text-center py-3">No meals logged yet.</p>
        )}
      </div>
    </section>
  )
}
