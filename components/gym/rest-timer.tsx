'use client'

import { useEffect, useState } from 'react'
import { Timer, Pause, Play, RotateCcw, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

const PRESETS = [60, 90, 120, 180]

function mmss(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${String(sec).padStart(2, '0')}`
}

// Reuse one AudioContext: a fresh one created at fire-time can stay suspended
// (autoplay policy) and play nothing. We unlock this on the start tap instead.
let audioCtx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctx) return null
  if (!audioCtx) audioCtx = new Ctx()
  return audioCtx
}

// Prime the audio context inside a user gesture so the alarm can fire later.
function unlockAudio() {
  const ctx = getCtx()
  if (ctx?.state === 'suspended') void ctx.resume()
}

function beep(ctx: AudioContext, at: number, freq: number, dur: number) {
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.connect(g); g.connect(ctx.destination)
  o.type = 'sine'
  o.frequency.value = freq
  g.gain.setValueAtTime(0.0001, at)
  g.gain.exponentialRampToValueAtTime(0.4, at + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
  o.start(at)
  o.stop(at + dur)
}

function alarm() {
  try {
    if (typeof navigator !== 'undefined') navigator.vibrate?.([300, 150, 300, 150, 300])
    const ctx = getCtx()
    if (!ctx) return
    void ctx.resume()
    const t0 = ctx.currentTime
    // A repeating triple-beep ring so the end of rest is hard to miss.
    const pattern = [880, 880, 1175, 880, 880, 1175]
    pattern.forEach((freq, i) => beep(ctx, t0 + i * 0.22, freq, 0.16))
  } catch { /* audio not available */ }
}

export function RestTimer() {
  const [total, setTotal] = useState(90)
  const [remaining, setRemaining] = useState(0)
  const [running, setRunning] = useState(false)
  const [flash, setFlash] = useState(false)

  // Tick down once per second while running.
  useEffect(() => {
    if (!running) return
    const iv = setInterval(() => setRemaining(r => Math.max(0, r - 1)), 1000)
    return () => clearInterval(iv)
  }, [running])

  // Fire the alarm exactly when a running countdown reaches zero.
  useEffect(() => {
    if (!running || remaining > 0) return
    setRunning(false)
    alarm()
    setFlash(true)
    const t = setTimeout(() => setFlash(false), 1500)
    return () => clearTimeout(t)
  }, [running, remaining])

  const start = (seconds: number) => { unlockAudio(); setTotal(seconds); setRemaining(seconds); setRunning(true) }
  const addTime = (seconds: number) => {
    setRemaining(r => Math.max(0, r + seconds))
    setTotal(t => Math.max(t, remaining + seconds))
  }
  const pause = () => setRunning(false)
  const resume = () => { if (remaining > 0) { unlockAudio(); setRunning(true) } }
  const reset = () => { setRunning(false); setRemaining(0) }

  const active = remaining > 0
  const pct = active && total > 0 ? (remaining / total) * 100 : 0

  return (
    <div className={cn('rounded-lg px-3 py-2 transition-colors', flash ? 'bg-emerald-600/20' : 'bg-zinc-800/40')}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 shrink-0">
          <Timer size={13} className={flash ? 'text-emerald-400' : 'text-zinc-500'} />
          <span className="text-xs text-zinc-400">{flash ? 'Rest done!' : 'Rest'}</span>
        </div>

        {active ? (
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold tabular-nums text-zinc-100 w-12 text-center">{mmss(remaining)}</span>
            <button onClick={() => addTime(15)} className="px-1.5 h-6 flex items-center rounded bg-zinc-800 text-[10px] text-zinc-300 hover:bg-zinc-700 transition-colors">
              <Plus size={9} />15
            </button>
            {running ? (
              <button onClick={pause} className="w-6 h-6 flex items-center justify-center rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"><Pause size={11} /></button>
            ) : (
              <button onClick={resume} className="w-6 h-6 flex items-center justify-center rounded bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"><Play size={11} /></button>
            )}
            <button onClick={reset} className="w-6 h-6 flex items-center justify-center rounded bg-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 transition-colors"><RotateCcw size={11} /></button>
          </div>
        ) : (
          <div className="flex gap-1">
            {PRESETS.map(s => (
              <button
                key={s}
                onClick={() => start(s)}
                className="px-2 h-6 flex items-center rounded-md bg-zinc-800 text-[11px] font-medium text-zinc-300 hover:bg-indigo-600 hover:text-white transition-colors tabular-nums"
              >
                {s < 120 ? `${s}s` : `${s / 60}m`}
              </button>
            ))}
          </div>
        )}
      </div>

      {active && (
        <div className="mt-1.5 h-1 w-full rounded-full bg-zinc-800 overflow-hidden">
          <div className="h-full rounded-full bg-indigo-500 transition-[width] duration-300 ease-linear" style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  )
}
