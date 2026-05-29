'use client'

import { useState, useTransition } from 'react'
import { logWater, deleteWaterLog } from '@/lib/actions/diet'
import type { WaterLog } from '@/lib/db/schema'
import { Droplets, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  logs: WaterLog[]
  goalMl: number
}

const QUICK = [250, 500, 750, 1000]

export function WaterTracker({ logs, goalMl }: Props) {
  const [isPending, startTransition] = useTransition()
  const [custom, setCustom] = useState('')

  const totalMl = logs.reduce((s, l) => s + l.amountMl, 0)
  const pct = Math.min(Math.round((totalMl / goalMl) * 100), 100)

  const fmt = (ml: number) => ml >= 1000 ? `${(ml / 1000).toFixed(1)}L` : `${ml}ml`

  const add = (ml: number) => startTransition(async () => { await logWater(ml) })

  const handleCustom = () => {
    const ml = Math.round(parseFloat(custom) * 1000)
    if (!ml || ml <= 0) return
    add(ml)
    setCustom('')
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Droplets size={14} className="text-sky-400" />
        <h2 className="text-sm font-semibold text-zinc-200">Water</h2>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-4">
        {/* Progress */}
        <div>
          <div className="flex items-end justify-between mb-2">
            <span className="text-2xl font-bold text-sky-400 tabular-nums">{fmt(totalMl)}</span>
            <span className="text-xs text-zinc-600 mb-1">/ {fmt(goalMl)} · {pct}%</span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-zinc-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-sky-500 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Quick add */}
        <div className="flex flex-wrap gap-1.5">
          {QUICK.map(ml => (
            <button
              key={ml}
              onClick={() => add(ml)}
              disabled={isPending}
              className="px-3 py-1.5 text-xs rounded-lg bg-zinc-800 text-zinc-400 hover:bg-sky-900/40 hover:text-sky-300 transition-colors"
            >
              +{fmt(ml)}
            </button>
          ))}
          <div className="flex items-center gap-1">
            <input
              type="number" step={0.1} min={0.1} placeholder="L"
              value={custom}
              onChange={e => setCustom(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCustom() }}
              className="w-14 h-7 px-2 text-xs rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-sky-700"
            />
            <button
              onClick={handleCustom}
              disabled={isPending || !custom}
              className="px-2 h-7 text-xs rounded-lg bg-zinc-800 text-zinc-500 hover:text-sky-300 transition-colors"
            >
              +
            </button>
          </div>
        </div>

        {/* Log */}
        {logs.length > 0 && (
          <div className="space-y-0.5 border-t border-zinc-800 pt-3">
            {logs.map(log => {
              const time = log.createdAt.substring(11, 16)
              return (
                <div key={log.id} className="group flex items-center justify-between py-0.5">
                  <span className="text-xs text-zinc-500">
                    <span className="text-zinc-400 font-medium">{fmt(log.amountMl)}</span>
                    {time && <span className="ml-1.5">{time}</span>}
                  </span>
                  <button
                    onClick={() => startTransition(async () => { await deleteWaterLog(log.id) })}
                    disabled={isPending}
                    className="opacity-0 group-hover:opacity-100 p-1 text-zinc-600 hover:text-rose-400 transition-all"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
