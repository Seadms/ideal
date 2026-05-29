'use client'

import { useState, useTransition } from 'react'
import { addDietRule, deleteDietRule, updateDietRule } from '@/lib/actions/diet'
import type { DietRule } from '@/lib/db/schema'
import { ShieldCheck, ShieldX, Pill, Plus, Trash2, Pencil, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  rules: DietRule[]
}

const CATS = [
  { key: 'always',     label: 'Always',       Icon: ShieldCheck, color: 'text-emerald-400', bg: 'bg-emerald-950/30 border-emerald-900/30' },
  { key: 'never',      label: 'Never',        Icon: ShieldX,     color: 'text-rose-400',    bg: 'bg-rose-950/30 border-rose-900/30'       },
  { key: 'supplement', label: 'Supplements',  Icon: Pill,        color: 'text-violet-400',  bg: 'bg-violet-950/30 border-violet-900/30'   },
] as const

export function DietRules({ rules }: Props) {
  const [isPending, startTransition] = useTransition()
  const [addingTo, setAddingTo] = useState<string | null>(null)
  const [newText, setNewText] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  const handleAdd = (cat: string) => {
    if (!newText.trim()) return
    startTransition(async () => {
      await addDietRule(cat, newText)
      setNewText('')
      setAddingTo(null)
    })
  }

  const handleSaveEdit = (id: string) => {
    startTransition(async () => {
      await updateDietRule(id, editText)
      setEditingId(null)
    })
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <ShieldCheck size={14} className="text-zinc-400" />
        <h2 className="text-sm font-semibold text-zinc-200">Rules</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {CATS.map(({ key, label, Icon, color, bg }) => {
          const catRules = rules.filter(r => r.category === key)
          return (
            <div key={key} className={cn('rounded-xl border p-4 space-y-3', bg)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Icon size={12} className={color} />
                  <span className={cn('text-xs font-semibold', color)}>{label}</span>
                </div>
                <button
                  onClick={() => { setAddingTo(addingTo === key ? null : key); setNewText('') }}
                  className="text-[10px] text-zinc-600 hover:text-zinc-300 transition-colors"
                >
                  + add
                </button>
              </div>

              <div className="space-y-1.5">
                {catRules.map(rule => (
                  <div key={rule.id} className="group flex items-start gap-1.5">
                    {editingId === rule.id ? (
                      <>
                        <input
                          value={editText}
                          onChange={e => setEditText(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(rule.id); if (e.key === 'Escape') setEditingId(null) }}
                          autoFocus
                          className="flex-1 text-xs px-2 py-1 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 focus:outline-none focus:border-zinc-500"
                        />
                        <button onClick={() => handleSaveEdit(rule.id)} disabled={isPending} className="p-0.5 text-emerald-400 shrink-0 mt-1">
                          <Check size={10} />
                        </button>
                        <button onClick={() => setEditingId(null)} className="p-0.5 text-zinc-500 shrink-0 mt-1">
                          <X size={10} />
                        </button>
                      </>
                    ) : (
                      <>
                        <p className="text-xs text-zinc-400 flex-1 leading-relaxed">{rule.text}</p>
                        <div className="flex opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5">
                          <button
                            onClick={() => { setEditingId(rule.id); setEditText(rule.text) }}
                            className="p-0.5 text-zinc-600 hover:text-zinc-300"
                          >
                            <Pencil size={9} />
                          </button>
                          <button
                            onClick={() => startTransition(async () => { await deleteDietRule(rule.id) })}
                            disabled={isPending}
                            className="p-0.5 text-zinc-600 hover:text-rose-400"
                          >
                            <Trash2 size={9} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {addingTo === key && (
                <div className="flex gap-1">
                  <input
                    value={newText}
                    onChange={e => setNewText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleAdd(key); if (e.key === 'Escape') setAddingTo(null) }}
                    autoFocus
                    placeholder="New rule..."
                    className="flex-1 text-xs px-2 py-1.5 rounded-lg bg-zinc-800/80 border border-zinc-700 text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                  />
                  <button
                    onClick={() => handleAdd(key)}
                    disabled={isPending || !newText.trim()}
                    className="p-1.5 rounded-lg bg-zinc-800 text-zinc-500 hover:text-zinc-200 transition-colors"
                  >
                    <Plus size={11} />
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
