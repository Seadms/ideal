'use client'

import { useState, useTransition } from 'react'
import { logBenchmark, deleteBenchmarkLog } from '@/lib/actions/progress'
import type { BenchmarkLog } from '@/lib/db/schema'
import { BENCHMARKS } from '@/lib/progress'
import { TrendChart } from './trend-chart'
import { Trophy, Check, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface Props {
  logs: BenchmarkLog[]   // ascending by date, all benchmarks
}

export function BenchmarksCard({ logs }: Props) {
  const [isPending, startTransition] = useTransition()
  const [repForm, setRepForm] = useState<Record<string, string>>({})

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Trophy size={14} className="text-amber-400" />
        <h2 className="text-sm font-semibold text-zinc-200">Strength Benchmarks</h2>
      </div>

      <div className="space-y-2">
        {BENCHMARKS.map(def => {
          const series = logs.filter(l => l.key === def.key) // already date-ascending
          const values = series.map(l => l.value)
          const latest = series[series.length - 1] ?? null
          const pr = values.length ? Math.max(...values) : null

          return (
            <div key={def.key} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 space-y-2.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-zinc-200">{def.label}</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    {latest === null ? (
                      <span className="text-zinc-600">not logged yet</span>
                    ) : def.kind === 'reps' ? (
                      <>
                        <span className="text-zinc-200 font-semibold tabular-nums">{latest.value}</span> {def.unit}
                        {pr !== null && pr > latest.value && <span className="text-amber-500/70 ml-1.5">PR {pr}</span>}
                      </>
                    ) : (
                      <>
                        <span className="text-zinc-200 font-medium">{latest.label}</span>
                        <span className="text-zinc-600 ml-1">· stage {latest.value + 1}/{def.stages!.length}</span>
                      </>
                    )}
                  </p>
                </div>
                <div className="w-24 shrink-0">
                  {values.length > 1 ? (
                    <TrendChart id={`bm-${def.key}`} values={values} color={def.color} height={36} integer />
                  ) : (
                    <div className="h-9 flex items-center justify-end">
                      <span className="text-[9px] text-zinc-700">
                        {values.length === 1 ? 'log again to chart' : '—'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Control */}
              <div className="flex items-center gap-2">
                {def.kind === 'reps' ? (
                  <>
                    <Input
                      type="number" min={0} step={1} inputMode="numeric"
                      value={repForm[def.key] ?? ''}
                      onChange={e => setRepForm(f => ({ ...f, [def.key]: e.target.value }))}
                      placeholder={`max ${def.short.toLowerCase()}`}
                      className="h-7 text-xs flex-1"
                    />
                    <Button
                      size="sm"
                      className="h-7"
                      disabled={isPending || !repForm[def.key]}
                      onClick={() => {
                        const v = Number(repForm[def.key])
                        if (!Number.isFinite(v) || v < 0) return
                        startTransition(async () => {
                          await logBenchmark(def.key, v)
                          setRepForm(f => ({ ...f, [def.key]: '' }))
                        })
                      }}
                    >
                      <Check size={12} /> Log
                    </Button>
                  </>
                ) : (
                  <Select
                    value={latest ? String(latest.value) : ''}
                    onChange={e => {
                      if (e.target.value === '') return
                      const idx = Number(e.target.value)
                      startTransition(async () => { await logBenchmark(def.key, idx, def.stages![idx]) })
                    }}
                    className="h-7 text-xs flex-1"
                  >
                    <option value="" disabled>Set current stage…</option>
                    {def.stages!.map((s, i) => (
                      <option key={s} value={i}>{i + 1}. {s}</option>
                    ))}
                  </Select>
                )}
                {latest && (
                  <button
                    onClick={() => startTransition(async () => { await deleteBenchmarkLog(latest.id) })}
                    disabled={isPending}
                    title="Remove latest entry"
                    className={cn('p-1 rounded text-zinc-600 hover:text-rose-400 transition-colors')}
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
