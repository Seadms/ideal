'use client'

import { useEffect, useState } from 'react'
import { PersonStanding, ExternalLink } from 'lucide-react'
import { cn, todayString } from '@/lib/utils'

// Daily mobility block targeting the three goals that converge on the same
// tissue: full range of motion, posture, and bedroom athleticism. All of it
// comes down to hips, thoracic spine, and the front line shortened by desk
// sitting. Doable in ~10 minutes with the home setup (bar, bands, doorway).
const EXERCISES = [
  {
    name: 'Deep Squat Hold',
    dose: '2–3 min total',
    why: 'The single best ROM investment: ankles, knees, hips, and low back all at once.',
    steps: [
      'Squat as deep as you can, heels down, chest tall. Hold onto a doorframe if needed.',
      'Accumulate 2–3 minutes across as many sets as it takes.',
      'Breathe slowly and let the hips sink a little deeper on each exhale.',
    ],
  },
  {
    name: 'Couch Stretch',
    dose: '2 min / side',
    why: 'Desk sitting shortens the hip flexors, tilting the pelvis and killing hip drive. This is the antidote.',
    steps: [
      'Kneel with one shin vertical against a wall or couch, other foot planted in front.',
      'Squeeze the glute of the back leg and stand the torso up tall.',
      'Stay tall and breathe. No arching the low back to fake depth.',
    ],
  },
  {
    name: 'Cossack Squats',
    dose: '2 × 8 / side',
    why: 'Side-to-side hip strength and adductor length. Directly buys range for deep positions.',
    steps: [
      'Stand wide, shift all your weight over one leg and squat onto it, other leg straight.',
      'Keep both heels down; hold a counterweight in front if balance is hard.',
      'Slow down on the way in, drive up through the whole foot.',
    ],
  },
  {
    name: '90/90 Hip Switches',
    dose: '2 × 10',
    why: 'Internal and external hip rotation, the range most lifters quietly lose first.',
    steps: [
      'Sit with both knees bent 90°, one leg in front, one to the side.',
      'Rotate both knees to the other side without using your hands, then back.',
      'Stay tall through the chest; the movement comes from the hips, not the waist.',
    ],
  },
  {
    name: 'Dead Hang',
    dose: '60–90s total',
    why: 'Decompresses the spine and opens the shoulders and lats. Free posture from the bar you already own.',
    steps: [
      'Grip the pull-up bar, relax everything below the hands.',
      'Let the shoulder blades rise toward your ears; breathe into the stretch.',
      'Accumulate 60–90 seconds in as many sets as needed.',
    ],
  },
  {
    name: 'Doorway Pec Stretch',
    dose: '60s / side',
    why: 'Screen time shortens the chest and pulls the shoulders forward. Open the front so the back can hold you upright.',
    steps: [
      'Forearm on a doorframe, elbow at shoulder height.',
      'Step the same-side foot through the doorway until the chest stretches.',
      'Keep the ribs down; adjust elbow height to move the stretch around.',
    ],
  },
  {
    name: 'Wall Slides',
    dose: '2 × 10',
    why: 'Trains thoracic extension and upper-back control, where upright posture actually lives.',
    steps: [
      'Back against a wall, arms in a goalpost, wrists and elbows touching the wall.',
      'Slide the arms up as high as they go without anything leaving the wall.',
      'Slow, controlled reps. The struggle zone is the training zone.',
    ],
  },
]

const STORAGE_KEY = 'mobility-routine-done'

export function MobilityRoutine() {
  const [done, setDone] = useState<Set<string>>(new Set())
  const [loaded, setLoaded] = useState(false)

  // Completions persist per local day (same pattern as the facial routine)
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) {
          const saved = JSON.parse(raw) as { date: string; names: string[] }
          if (saved.date === todayString()) {
            setDone(new Set(saved.names.filter(n => EXERCISES.some(ex => ex.name === n))))
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
      // storage unavailable — checklist still works in-memory
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
          <PersonStanding size={15} className="text-ring-chore" />
          <h2 className="text-sm font-semibold text-zinc-200">Mobility</h2>
          <span className="text-[10px] text-zinc-600">~10 min daily</span>
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
                  <p className="mt-1 text-[11px] text-teal-300/70 leading-relaxed">{ex.why}</p>
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
        <p className="text-[11px] font-medium text-zinc-400">How this pays off</p>
        <p className="text-[11px] text-zinc-500 leading-relaxed">
          Consistency beats intensity: 10 mediocre minutes daily outperforms one heroic hour a
          week. Posture = this plus your face pulls, rows, and chin tucks. Bedroom performance =
          open hip flexors + strong glutes (take the hip thrusts seriously) + zone-2 cardio for
          endurance. Same inputs, three payoffs.
        </p>
        <a
          href="https://www.youtube.com/watch?v=g_tea8ZNk5A"
          target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[11px] text-teal-300/80 hover:text-teal-200 transition-colors"
        >
          On training days: Tom Merrick&apos;s 15-min follow-along as your cooldown
          <ExternalLink size={10} />
        </a>
      </div>
    </section>
  )
}
