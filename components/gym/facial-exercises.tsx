'use client'

import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { cn, todayString } from '@/lib/utils'

// Curated for aesthetics with an honest eye on the evidence:
// - Cheek Lifter is from the one program with a published trial behind it
//   (Alam et al., JAMA Dermatology 2018 — 20 weeks, fuller upper/lower cheeks).
// - Chin tucks and the neck stretch target posture and the under-jaw area —
//   head/neck posture is what actually changes how a jawline reads in person.
// - Deliberate forehead/eye scrunching drills were removed: repeatedly firing
//   the frontalis and orbicularis oculi etches expression lines (the muscles
//   botox exists to relax), so they work against the goal.
const EXERCISES = [
  {
    name: 'Cheek Lifter',
    dose: '3 × 10s hold',
    why: 'Builds midface fullness: higher, fuller cheeks. The only exercise here with real trial evidence.',
    steps: [
      'Open your mouth into an "O" and fold your lips over your teeth.',
      'Smile widely to lift the cheek muscles; rest fingers lightly on cheeks to feel the lift.',
      'Hold 10 seconds → relax.',
    ],
  },
  {
    name: 'Chin Tucks',
    dose: '10 × 3s hold',
    why: 'Corrects forward-head posture, the biggest fixable factor in how sharp your jawline and neck look.',
    steps: [
      "Sit or stand tall. Keep your eyes level, don't tilt up or down.",
      'Glide your head straight back (make a double chin) until you feel the back of the neck lengthen.',
      'Hold 3 seconds → release. Keep it gentle, no straining.',
    ],
  },
  {
    name: 'Chin Lift & Neck Stretch',
    dose: '5 × 10s hold',
    why: 'Stretches the platysma and under-jaw area, countering the shortened front-of-neck from screen time.',
    steps: [
      'Tilt your head back gently and look toward the ceiling.',
      'Pucker your lips as if kissing the ceiling until you feel a stretch under the jaw and down the neck.',
      'Hold 10 seconds → relax.',
    ],
  },
  {
    name: 'Jaw Unclench + Tongue Rest',
    dose: '1 min',
    why: 'Daily clenching thickens and can asymmetrize the masseters; a relaxed jaw keeps the lower face slim.',
    steps: [
      'Massage the masseters (the muscle bulge when you bite down) in slow circles for ~30 seconds.',
      'Then rest: lips closed, teeth slightly apart, whole tongue resting on the roof of the mouth.',
      'Check in on this posture through the day. Teeth should only touch when chewing.',
    ],
  },
]

const STORAGE_KEY = 'facial-exercises-done'

export function FacialExercises() {
  const [done, setDone] = useState<Set<string>>(new Set())
  const [loaded, setLoaded] = useState(false)

  // Completions persist per local day, so a reload (or revisiting later in the
  // day) doesn't wipe the checklist. localStorage is read after mount to avoid
  // a hydration mismatch.
  useEffect(() => {
    // Deferred a frame so the restore doesn't cascade into the initial render
    const raf = requestAnimationFrame(() => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) {
          const saved = JSON.parse(raw) as { date: string; names: string[] }
          if (saved.date === todayString()) {
            const valid = saved.names.filter(n => EXERCISES.some(ex => ex.name === n))
            setDone(new Set(valid))
          }
        }
      } catch {
        // corrupted storage — start fresh
      }
      setLoaded(true)
    })
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    if (!loaded) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: todayString(), names: [...done] }))
    } catch {
      // storage unavailable (private mode / quota) — checklist still works in-memory
    }
  }, [done, loaded])

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
                  aria-label={`Mark ${ex.name} ${checked ? 'not done' : 'done'}`}
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
                    <span className="text-[10px] text-zinc-600 shrink-0">{ex.dose}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-rose-300/70 leading-relaxed">{ex.why}</p>
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

      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 px-4 py-3 space-y-1.5">
        <p className="text-[11px] font-medium text-zinc-400">The bigger levers</p>
        <p className="text-[11px] text-zinc-500 leading-relaxed">
          Facial exercise is a small lever. What visibly changes a face: getting lean (your cut
          is the #1 jawline program), 7–9h sleep, daily SPF in the morning and a retinoid at
          night, and staying hydrated with sodium in check.
        </p>
        <p className="text-[11px] text-zinc-600 leading-relaxed">
          Skip: hard-gum &quot;jaw trainers&quot; (TMJ risk, and wider masseters usually read as a
          blockier — not sharper — lower face) and forehead/eye scrunching drills (they carve in
          expression lines).
        </p>
      </div>
    </section>
  )
}