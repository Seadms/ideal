'use client'

import { useState, useTransition } from 'react'
import { upsertDietGoals } from '@/lib/actions/diet'
import type { DietGoals } from '@/lib/db/schema'
import { Target, Pencil, Check, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface Props {
  goals: DietGoals
}

// Cut plan uses fixed daily targets. The training/rest columns are kept equal in
// the DB; this panel edits a single set and writes it to both.
export function MacroGoals({ goals }: Props) {
  const [isPending, startTransition] = useTransition()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    calories: String(goals.trainingCalories),
    protein: String(goals.trainingProtein),
    carbs: String(goals.trainingCarbs),
    fat: String(goals.trainingFat),
    waterGoalMl: String(goals.waterGoalMl),
  })

  const handleSave = () => {
    const cal = Number(form.calories) || 0
    const p = Number(form.protein) || 0
    const c = Number(form.carbs) || 0
    const f = Number(form.fat) || 0
    startTransition(async () => {
      await upsertDietGoals({
        trainingCalories: cal, trainingProtein: p, trainingCarbs: c, trainingFat: f,
        restCalories: cal, restProtein: p, restCarbs: c, restFat: f,
        waterGoalMl: Number(form.waterGoalMl) || 0,
      })
      setEditing(false)
    })
  }

  const macros = [
    { label: 'Protein', value: goals.trainingProtein, unit: 'g', color: 'text-emerald-400', bar: 'bg-emerald-500', scale: 250 },
    { label: 'Calories', value: goals.trainingCalories, unit: 'kcal', color: 'text-amber-400', bar: 'bg-amber-500', scale: 3000 },
    { label: 'Carbs', value: goals.trainingCarbs, unit: 'g', color: 'text-blue-400', bar: 'bg-blue-500', scale: 350 },
    { label: 'Fat', value: goals.trainingFat, unit: 'g', color: 'text-rose-400', bar: 'bg-rose-500', scale: 120 },
  ]

  const editFields = [
    { label: 'Calories (kcal)', key: 'calories' as const },
    { label: 'Protein (g)',     key: 'protein' as const },
    { label: 'Carbs (g)',       key: 'carbs' as const },
    { label: 'Fat (g)',         key: 'fat' as const },
  ]

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Target size={14} className="text-violet-400" />
        <h2 className="text-sm font-semibold text-zinc-200">Daily Targets</h2>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider text-zinc-600">Cut · fixed targets</span>
          <button
            onClick={() => setEditing(e => !e)}
            className="flex items-center gap-1 text-[10px] text-zinc-600 hover:text-zinc-300 transition-colors"
          >
            {editing ? <X size={10} /> : <Pencil size={10} />}
            {editing ? 'cancel' : 'edit goals'}
          </button>
        </div>

        {!editing && (
          <div className="space-y-2.5">
            {macros.map(m => (
              <div key={m.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className={cn('text-xs font-medium', m.color)}>{m.label}</span>
                  <span className="text-xs text-zinc-400 tabular-nums">{m.value}{m.unit}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className={cn('h-full rounded-full', m.bar)}
                    style={{ width: `${Math.min((m.value / m.scale) * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}
            <p className="text-[10px] text-zinc-600 pt-1">
              Re-evaluate every 2–3 weeks. If weight loss stalls 2+ weeks, drop calories ~150–200. Target loss 0.5–1 lb/week.
            </p>
          </div>
        )}

        {editing && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {editFields.map(f => (
                <div key={f.key}>
                  <p className="text-[9px] text-zinc-600 mb-1">{f.label}</p>
                  <Input
                    type="number" min={0}
                    value={form[f.key]}
                    onChange={e => setForm(g => ({ ...g, [f.key]: e.target.value }))}
                    className="h-7 text-xs py-0"
                  />
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Water Goal</p>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <p className="text-[9px] text-zinc-600 mb-1">Daily target (ml)</p>
                  <Input
                    type="number" min={0} step={250}
                    value={form.waterGoalMl}
                    onChange={e => setForm(g => ({ ...g, waterGoalMl: e.target.value }))}
                    className="h-7 text-xs py-0"
                  />
                </div>
                <p className="text-xs text-zinc-600 mt-4">{(Number(form.waterGoalMl) / 1000).toFixed(2)}L</p>
              </div>
              <p className="text-[10px] text-zinc-600">Aim for 4 L on training days.</p>
            </div>
            <button
              onClick={handleSave}
              disabled={isPending}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
            >
              <Check size={11} /> Save Goals
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
