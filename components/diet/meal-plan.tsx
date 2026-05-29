'use client'

import { useState, useTransition } from 'react'
import { updateDietMeal } from '@/lib/actions/diet'
import type { DietMeal } from '@/lib/db/schema'
import { Utensils, Pencil, Check, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface Props {
  meals: DietMeal[]
}

const ACCENT = ['text-amber-400', 'text-lime-400', 'text-orange-400', 'text-cyan-400', 'text-purple-400']

export function MealPlan({ meals }: Props) {
  const [isPending, startTransition] = useTransition()
  type EditForm = Omit<DietMeal, 'calories' | 'protein' | 'carbs' | 'fat'> & {
    calories: number | string; protein: number | string; carbs: number | string; fat: number | string
  }
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<EditForm | null>(null)

  const startEdit = (meal: DietMeal) => { setEditingId(meal.id); setForm({ ...meal }) }
  const cancelEdit = () => { setEditingId(null); setForm(null) }

  const handleSave = () => {
    if (!editingId || !form) return
    startTransition(async () => {
      await updateDietMeal(editingId, {
        name: form.name,
        timeWindow: form.timeWindow,
        calories: Number(form.calories) || 0,
        protein: Number(form.protein) || 0,
        carbs: Number(form.carbs) || 0,
        fat: Number(form.fat) || 0,
        notes: form.notes,
      })
      cancelEdit()
    })
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Utensils size={14} className="text-amber-400" />
        <h2 className="text-sm font-semibold text-zinc-200">Meal Plan</h2>
      </div>

      <div className="space-y-2">
        {meals.map((meal, i) => {
          const isEditing = editingId === meal.id
          const color = ACCENT[i % ACCENT.length]

          return (
            <div key={meal.id} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
              {isEditing && form ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2">
                      <p className="text-[9px] text-zinc-600 mb-1">Name</p>
                      <Input value={form.name} onChange={e => setForm(f => f && ({ ...f, name: e.target.value }))} className="h-7 text-xs py-0" />
                    </div>
                    <div>
                      <p className="text-[9px] text-zinc-600 mb-1">Time</p>
                      <Input value={form.timeWindow ?? ''} onChange={e => setForm(f => f && ({ ...f, timeWindow: e.target.value }))} className="h-7 text-xs py-0" placeholder="e.g. 7–8 AM" />
                    </div>
                    <div>
                      <p className="text-[9px] text-zinc-600 mb-1">Calories</p>
                      <Input type="number" min={0} value={form.calories} onChange={e => setForm(f => f && ({ ...f, calories: e.target.value }))} className="h-7 text-xs py-0" />
                    </div>
                    <div>
                      <p className="text-[9px] text-emerald-700 mb-1">Protein (g)</p>
                      <Input type="number" min={0} value={form.protein} onChange={e => setForm(f => f && ({ ...f, protein: e.target.value }))} className="h-7 text-xs py-0" />
                    </div>
                    <div>
                      <p className="text-[9px] text-zinc-600 mb-1">Carbs (g)</p>
                      <Input type="number" min={0} value={form.carbs} onChange={e => setForm(f => f && ({ ...f, carbs: e.target.value }))} className="h-7 text-xs py-0" />
                    </div>
                    <div>
                      <p className="text-[9px] text-zinc-600 mb-1">Fat (g)</p>
                      <Input type="number" min={0} value={form.fat} onChange={e => setForm(f => f && ({ ...f, fat: e.target.value }))} className="h-7 text-xs py-0" />
                    </div>
                    <div className="col-span-2">
                      <p className="text-[9px] text-zinc-600 mb-1">Foods</p>
                      <textarea
                        value={form.notes ?? ''}
                        onChange={e => setForm(f => f && ({ ...f, notes: e.target.value }))}
                        rows={3}
                        className="w-full text-xs px-2 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 resize-none"
                        placeholder="Food items, one per line..."
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSave}
                      disabled={isPending}
                      className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
                    >
                      <Check size={11} /> Save
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-zinc-800 text-zinc-600 hover:text-zinc-300 transition-colors"
                    >
                      <X size={11} /> Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className={cn('text-xs font-semibold', color)}>{meal.name}</p>
                      {meal.timeWindow && (
                        <p className="text-[10px] text-zinc-600 mt-0.5">{meal.timeWindow}</p>
                      )}
                    </div>
                    <button
                      onClick={() => startEdit(meal)}
                      className="p-1 text-zinc-700 hover:text-zinc-400 transition-colors shrink-0"
                    >
                      <Pencil size={11} />
                    </button>
                  </div>

                  <div className="flex gap-3 text-[10px]">
                    <span className="text-amber-500 font-medium">{meal.calories} kcal</span>
                    <span className="text-emerald-500">{meal.protein}g P</span>
                    <span className="text-blue-500">{meal.carbs}g C</span>
                    <span className="text-rose-500">{meal.fat}g F</span>
                  </div>

                  {meal.notes && (
                    <div>
                      {meal.notes.split('\n').filter(Boolean).map((line, j) => (
                        <p key={j} className="text-[11px] text-zinc-500 leading-5">{line}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
