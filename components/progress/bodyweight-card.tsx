'use client'

import { useState, useTransition } from 'react'
import { logBodyweight, deleteBodyweightLog } from '@/lib/actions/progress'
import type { BodyweightLog } from '@/lib/db/schema'
import { rolling7 } from '@/lib/progress'
import { TrendChart } from './trend-chart'
import { Scale, Check, Trash2, TrendingDown, TrendingUp, Minus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import { todayString, formatDate, cn } from '@/lib/utils'

interface Props {
  logs: BodyweightLog[]   // ascending by date
}

// Lower weight = good on a cut, so a drop is shown in emerald.
function Delta({ value }: { value: number }) {
  const down = value < -0.05, up = value > 0.05
  const Icon = down ? TrendingDown : up ? TrendingUp : Minus
  return (
    <span className={cn('inline-flex items-center gap-0.5 tabular-nums', down ? 'text-emerald-400' : up ? 'text-rose-400' : 'text-zinc-500')}>
      <Icon size={11} />{value > 0 ? '+' : ''}{value.toFixed(1)}
    </span>
  )
}

export function BodyweightCard({ logs }: Props) {
  const [isPending, startTransition] = useTransition()
  const latest = logs[logs.length - 1]
  const [weight, setWeight] = useState(latest ? String(latest.weight) : '')
  const [unit, setUnit] = useState(latest?.unit ?? 'lbs')

  const values = logs.map(l => l.weight)
  const avg = rolling7(values)
  const loggedToday = latest?.date === todayString()

  const currentAvg = avg.length ? avg[avg.length - 1] : null
  // Change in the smoothed line over the last week (7 entries).
  const weekAgoIdx = Math.max(0, avg.length - 8)
  const weekDelta = currentAvg !== null && avg.length > 1 ? currentAvg - avg[weekAgoIdx] : null
  const totalDelta = values.length > 1 ? values[values.length - 1] - values[0] : null

  const handleLog = () => {
    const w = Number(weight)
    if (!Number.isFinite(w) || w <= 0) return
    startTransition(async () => { await logBodyweight(w, unit) })
  }

  const recent = [...logs].reverse().slice(0, 8)

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Scale size={14} className="text-sky-400" />
        <h2 className="text-sm font-semibold text-zinc-200">Bodyweight</h2>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-4">
        {/* Headline numbers */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-2xl font-semibold text-zinc-100 tabular-nums leading-none">
              {latest ? latest.weight : '—'}
              {latest && <span className="text-sm text-zinc-500 ml-1">{latest.unit}</span>}
            </p>
            <p className="text-[10px] text-zinc-600 mt-1">
              {latest ? `latest · ${formatDate(latest.date)}` : 'no entries yet'}
            </p>
          </div>
          <div className="text-right space-y-0.5">
            {currentAvg !== null && (
              <p className="text-xs text-zinc-400 tabular-nums">7-day avg <span className="text-zinc-200 font-medium">{currentAvg}</span></p>
            )}
            <p className="text-[11px] flex items-center justify-end gap-2">
              {weekDelta !== null && <span className="text-zinc-600">wk <Delta value={weekDelta} /></span>}
              {totalDelta !== null && <span className="text-zinc-600">all <Delta value={totalDelta} /></span>}
            </p>
          </div>
        </div>

        {/* Chart */}
        {values.length > 0 ? (
          <div>
            <TrendChart id="bw" values={values} overlay={avg.length > 1 ? avg : undefined} color="#38bdf8" overlayColor="#fbbf24" />
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[9px] text-zinc-600">{logs.length} {logs.length === 1 ? 'entry' : 'entries'}</span>
              <span className="text-[9px] text-zinc-600 flex items-center gap-2">
                <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-0.5 bg-sky-400" />daily</span>
                <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-0.5 bg-amber-400" />7-day avg</span>
              </span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-zinc-600 text-center py-3">Log your weight daily to see the trend smooth out.</p>
        )}

        {/* Log form */}
        <div className="border-t border-zinc-800 pt-3 flex items-end gap-2">
          <div className="flex-1">
            <p className="text-[9px] text-zinc-600 mb-1">{loggedToday ? "Update today's weight" : 'Log today'}</p>
            <Input
              type="number" min={0} step={0.1} inputMode="decimal"
              value={weight}
              onChange={e => setWeight(e.target.value)}
              placeholder="e.g. 179.5"
              className="h-8 text-sm"
            />
          </div>
          <Select value={unit} onChange={e => setUnit(e.target.value)} className="h-8 text-xs w-16">
            <option value="lbs">lbs</option>
            <option value="kg">kg</option>
          </Select>
          <Button onClick={handleLog} disabled={isPending || !weight} size="sm" className="h-8">
            <Check size={13} /> {loggedToday ? 'Update' : 'Log'}
          </Button>
        </div>

        {/* Recent entries */}
        {recent.length > 0 && (
          <div className="border-t border-zinc-800 pt-2 space-y-0.5">
            {recent.map(l => (
              <div key={l.id} className="group flex items-center justify-between py-1">
                <span className="text-xs text-zinc-500">{formatDate(l.date)}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-300 tabular-nums">{l.weight} {l.unit}</span>
                  <button
                    onClick={() => startTransition(async () => { await deleteBodyweightLog(l.id) })}
                    disabled={isPending}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-zinc-600 hover:text-rose-400 transition-all"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
