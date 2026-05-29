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

type DayType = 'training' | 'rest'

export function MacroGoals({ goals }: Props) {
  const [isPending, startTransition] = useTransition()
  const [dayType, setDayType] = useState<DayType>('training')
  const [editing, setEditing] = useState(false)
  type GoalForm = { [K in keyof typeof goals]: string | number }
  const [form, setForm] = useState<GoalForm>({ ...goals })

  const active = dayType === 'training'
    ? { cal: goals.trainingCalories, p: goals.trainingProtein, c: goals.trainingCarbs, f: goals.trainingFat }
    : { cal: goals.restCalories, p: goals.restProtein, c: goals.restCarbs, f: goals.restFat }

  const handleSave = () => {
    startTransition(async () => {
      await upsertDietGoals({
        ...goals,
        trainingCalories: Number(form.trainingCalories) || 0,
        trainingProtein: Number(form.trainingProtein) || 0,
        trainingCarbs: Number(form.trainingCarbs) || 0,
        trainingFat: Number(form.trainingFat) || 0,
        restCalories: Number(form.restCalories) || 0,
        restProtein: Number(form.restProtein) || 0,
        restCarbs: Number(form.restCarbs) || 0,
        restFat: Number(form.restFat) || 0,
        waterGoalMl: Number(form.waterGoalMl) || 0,
      })
      setEditing(false)
    })
  }

  const macros = [
    { label: 'Protein', value: active.p, unit: 'g', color: 'text-emerald-400', bar: 'bg-emerald-500', scale: 250 },
    { label: 'Calories', value: active.cal, unit: 'kcal', color: 'text-amber-400', bar: 'bg-amber-500', scale: 3000 },
    { label: 'Carbs', value: active.c, unit: 'g', color: 'text-blue-400', bar: 'bg-blue-500', scale: 350 },
    { label: 'Fat', value: active.f, unit: 'g', color: 'text-rose-400', bar: 'bg-rose-500', scale: 120 },
  ]

  const editFields = [
    { section: 'Training Day', fields: [
      { label: 'Calories (kcal)', key: 'trainingCalories' as const },
      { label: 'Protein (g)',     key: 'trainingProtein' as const },
      { label: 'Carbs (g)',       key: 'trainingCarbs' as const },
      { label: 'Fat (g)',         key: 'trainingFat' as const },
    ]},
    { section: 'Rest Day', fields: [
      { label: 'Calories (kcal)', key: 'restCalories' as const },
      { label: 'Protein (g)',     key: 'restProtein' as const },
      { label: 'Carbs (g)',       key: 'restCarbs' as const },
      { label: 'Fat (g)',         key: 'restFat' as const },
    ]},
  ]

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Target size={14} className="text-violet-400" />
        <h2 className="text-sm font-semibold text-zinc-200">Daily Targets</h2>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex gap-0.5 bg-zinc-800/60 rounded-lg p-0.5">
            {(['training', 'rest'] as const).map(t => (
              <button
                key={t}
                onClick={() => setDayType(t)}
                className={cn(
                  'px-3 py-1 text-xs font-medium rounded-md transition-colors',
                  dayType === t ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300',
                )}
              >
                {t === 'training' ? 'Training' : 'Rest'} Day
              </button>
            ))}
          </div>
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
          </div>
        )}

        {editing && (
          <div className="space-y-4">
            {editFields.map(({ section, fields }) => (
              <div key={section} className="space-y-2">
                <p className="text-[10px] text-zinc-600 uppercase tracking-wider">{section}</p>
                <div className="grid grid-cols-2 gap-2">
                  {fields.map(f => (
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
              </div>
            ))}
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
