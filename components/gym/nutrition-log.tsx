'use client'

import { useState, useTransition } from 'react'
import { logNutritionEntry, deleteNutritionEntry } from '@/lib/actions/fitness'
import { updateDailyMacroTargets } from '@/lib/actions/diet'
import type { NutritionEntry, NutritionGoals } from '@/lib/db/schema'
import { Flame, Plus, Trash2, Pencil, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface NutritionLogProps {
  entries: NutritionEntry[]
  goals: NutritionGoals
}

export function NutritionLog({ entries, goals }: NutritionLogProps) {
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState({ mealName: '', calories: '', protein: '', carbs: '', fats: '' })
  const [editGoals, setEditGoals] = useState(false)
  const [goalForm, setGoalForm] = useState({
    caloriesGoal: String(goals.caloriesGoal),
    proteinGoal: String(goals.proteinGoal),
    carbsGoal: String(goals.carbsGoal),
    fatsGoal: String(goals.fatsGoal),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.mealName.trim()) return
    startTransition(async () => {
      await logNutritionEntry({
        ...form,
        calories: Number(form.calories) || 0,
        protein: Number(form.protein) || 0,
        carbs: Number(form.carbs) || 0,
        fats: Number(form.fats) || 0,
      })
      setForm({ mealName: '', calories: '', protein: '', carbs: '', fats: '' })
    })
  }

  const handleDelete = (id: string) => {
    startTransition(async () => { await deleteNutritionEntry(id) })
  }

  const handleSaveGoals = () => {
    startTransition(async () => {
      await updateDailyMacroTargets({
        calories: Number(goalForm.caloriesGoal) || 0,
        protein: Number(goalForm.proteinGoal) || 0,
        carbs: Number(goalForm.carbsGoal) || 0,
        fat: Number(goalForm.fatsGoal) || 0,
      })
      setEditGoals(false)
    })
  }

  const totals = entries.reduce(
    (s, e) => ({ calories: s.calories + e.calories, protein: s.protein + e.protein, carbs: s.carbs + e.carbs, fats: s.fats + e.fats }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 },
  )

  const pct = (val: number, goal: number) => Math.min(Math.round((val / goal) * 100), 100)

  const macros = [
    { key: 'protein' as const, label: 'Protein', value: totals.protein, goal: goals.proteinGoal, unit: 'g', color: 'bg-emerald-500', text: 'text-emerald-400', prominent: true },
    { key: 'calories' as const, label: 'Calories', value: totals.calories, goal: goals.caloriesGoal, unit: 'kcal', color: 'bg-amber-500', text: 'text-amber-400', prominent: false },
    { key: 'carbs' as const, label: 'Carbs', value: totals.carbs, goal: goals.carbsGoal, unit: 'g', color: 'bg-blue-500', text: 'text-blue-400', prominent: false },
    { key: 'fats' as const, label: 'Fats', value: totals.fats, goal: goals.fatsGoal, unit: 'g', color: 'bg-rose-500', text: 'text-rose-400', prominent: false },
  ]

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Flame size={14} className="text-orange-400" />
        <h2 className="text-sm font-semibold text-zinc-200">Nutrition</h2>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-4">

        {/* Macro progress */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Today's progress</p>
            <button
              onClick={() => setEditGoals(e => !e)}
              className="flex items-center gap-1 text-[10px] text-zinc-600 hover:text-zinc-300 transition-colors"
            >
              {editGoals ? <X size={10} /> : <Pencil size={10} />}
              {editGoals ? 'cancel' : 'edit goals'}
            </button>
          </div>

          {macros.map(m => (
            <div key={m.key}>
              <div className="flex items-center justify-between mb-1">
                <span className={cn('text-xs font-medium', m.prominent ? m.text : 'text-zinc-400')}>{m.label}</span>
                <span className={cn('text-xs tabular-nums', m.prominent ? cn(m.text, 'font-semibold') : 'text-zinc-500')}>
                  {m.key === 'calories' ? Math.round(m.value) : m.value.toFixed(1)}{m.unit}
                  <span className="text-zinc-700 font-normal"> / {m.goal}{m.unit}</span>
                </span>
              </div>
              <div className={cn('w-full rounded-full bg-zinc-800 overflow-hidden', m.prominent ? 'h-2' : 'h-1')}>
                <div
                  className={cn('h-full rounded-full transition-all duration-500', m.color)}
                  style={{ width: `${pct(m.value, m.goal)}%` }}
                />
              </div>
            </div>
          ))}

          {/* Editable goals */}
          {editGoals && (
            <div className="pt-2 border-t border-zinc-800 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Calories (kcal)', key: 'caloriesGoal' as const },
                  { label: 'Protein (g)', key: 'proteinGoal' as const },
                  { label: 'Carbs (g)', key: 'carbsGoal' as const },
                  { label: 'Fats (g)', key: 'fatsGoal' as const },
                ].map(f => (
                  <div key={f.key}>
                    <p className="text-[9px] text-zinc-600 mb-1">{f.label}</p>
                    <Input
                      type="number" min={0}
                      value={goalForm[f.key]}
                      onChange={e => setGoalForm(g => ({ ...g, [f.key]: e.target.value }))}
                      className="h-7 text-xs py-0"
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={handleSaveGoals}
                disabled={isPending}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
              >
                <Check size={11} /> Save Goals
              </button>
            </div>
          )}
        </div>

        {/* Log meal form */}
        <div className="border-t border-zinc-800 pt-4">
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
                  onChange={e => setForm(f => ({ ...f, calories: e.target.value }))}
                />
              </div>
              <div>
                <p className="text-[10px] text-emerald-600 uppercase tracking-wider mb-1 font-medium">Protein (g)</p>
                <Input
                  type="number" min={0} step={0.1}
                  value={form.protein}
                  onChange={e => setForm(f => ({ ...f, protein: e.target.value }))}
                  className="border-emerald-800/40 focus:border-emerald-600/60"
                />
              </div>
              <div>
                <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">Carbs (g)</p>
                <Input
                  type="number" min={0} step={0.1}
                  value={form.carbs}
                  onChange={e => setForm(f => ({ ...f, carbs: e.target.value }))}
                />
              </div>
              <div>
                <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">Fats (g)</p>
                <Input
                  type="number" min={0} step={0.1}
                  value={form.fats}
                  onChange={e => setForm(f => ({ ...f, fats: e.target.value }))}
                />
              </div>
            </div>
            <Button type="submit" size="sm" className="w-full" disabled={isPending || !form.mealName.trim()}>
              <Plus size={13} /> Log Meal
            </Button>
          </form>
        </div>

        {/* Meal list */}
        {entries.length > 0 && (
          <div className="space-y-1 border-t border-zinc-800 pt-3">
            {entries.map(e => (
              <div key={e.id} className="group flex items-center gap-3 py-1.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-200 font-medium truncate">{e.mealName}</p>
                  <p className="text-xs text-zinc-500">
                    {e.calories} kcal
                    <span className="text-emerald-600 ml-1">{e.protein.toFixed(1)}g P</span>
                    {e.carbs > 0 && <span className="ml-1">{e.carbs.toFixed(1)}g C</span>}
                    {e.fats > 0 && <span className="ml-1">{e.fats.toFixed(1)}g F</span>}
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
          <p className="text-xs text-zinc-600 text-center py-2 border-t border-zinc-800 pt-4">No meals logged today.</p>
        )}
      </div>
    </section>
  )
}
