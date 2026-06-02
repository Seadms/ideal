'use client'

import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

const EXERCISES = [
  {
    name: 'Cheek Lifter',
    reps: 3,
    hold: 10,
    steps: [
      'Open your mouth into an "O" and fold your lips over your teeth.',
      'Smile widely to lift the cheek muscles; rest fingers lightly on cheeks to feel the lift.',
      'Hold 10 seconds → relax.',
    ],
  },
  {
    name: 'Neck & Jaw Stretch (Chin Lift)',
    reps: 5,
    hold: 10,
    steps: [
      'Tilt your head back gently and look toward the ceiling.',
      'Pucker your lips as if kissing the ceiling until you feel a stretch under the jaw and down the neck.',
      'Hold 10 seconds → relax.',
    ],
  },
  {
    name: 'Forehead Resistance',
    reps: 5,
    hold: 5,
    steps: [
      'Place both hands on your forehead, fingers spread just above the eyebrows.',
      'Apply light downward pressure while trying to raise your eyebrows against the resistance.',
      'Hold 5 seconds → relax.',
    ],
  },
  {
    name: 'Eye Squint ("V")',
    reps: 6,
    hold: null,
    steps: [
      'Middle fingers at the inner eyebrow corners, index fingers at the outer eye corners.',
      'Look up and raise the lower eyelids into a firm squint until you feel a small pulse at the outer corners.',
      'Relax. On the final rep, squeeze the eyes tightly shut for 10 seconds.',
    ],
  },
]

export function FacialExercises() {
  const [done, setDone] = useState<Set<string>>(new Set())

  const toggle = (name: string) =>
    setDone(prev => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })

  const allDone = done.size === EXERCISES.length

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-rose-400" />
          <h2 className="text-sm font-semibold text-zinc-200">Facial Exercises</h2>
        </div>
        {allDone && (
          <span className="text-[11px] text-emerald-400 font-medium">All done</span>
        )}
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 divide-y divide-zinc-800/60">
        {EXERCISES.map(ex => {
          const checked = done.has(ex.name)
          return (
            <div key={ex.name} className="px-4 py-3 space-y-2">
              <div className="flex items-start gap-3">
                <button
                  onClick={() => toggle(ex.name)}
                  className={cn(
                    'mt-0.5 shrink-0 w-4 h-4 rounded border transition-colors',
                    checked
                      ? 'bg-emerald-600 border-emerald-600'
                      : 'border-zinc-600 hover:border-zinc-400',
                  )}
                >
                  {checked && (
                    <svg viewBox="0 0 10 10" className="w-full h-full text-white" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M2 5l2.5 2.5L8 3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <p className={cn('text-sm font-medium transition-colors', checked ? 'text-zinc-500 line-through' : 'text-zinc-200')}>
                      {ex.name}
                    </p>
                    <span className="text-[10px] text-zinc-600 shrink-0">
                      {ex.hold ? `${ex.hold}s hold` : null}{ex.hold ? ' · ' : ''}{ex.reps} reps
                    </span>
                  </div>
                  <ul className="mt-1.5 space-y-1">
                    {ex.steps.map((step, i) => (
                      <li key={i} className="text-[11px] text-zinc-500 leading-relaxed flex gap-1.5">
                        <span className="text-zinc-700 shrink-0">{i + 1}.</span>
                        {step}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
