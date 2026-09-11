'use client'

import { useEffect, useState } from 'react'
import { PersonStanding, ExternalLink } from 'lucide-react'
import { cn, todayString } from '@/lib/utils'

// Daily mobility block. Everything converges on the same tissue: hips, ankles,
// thoracic spine, and the front line shortened by desk sitting. Foam roller
// first — rolling drops muscle tone for a few minutes, so every stretch after
// it goes further. Floor work is on the mat. ~15 minutes.
const EXERCISES = [
  {
    name: 'Foam Roll: Calves',
    dose: '45s / side',
    why: 'Tight calves are the usual reason the knee-to-wall drill stalls. Roll them first and the ankle test moves.',
    steps: [
      'Calf on the roller, other leg crossed on top for weight, hands behind you.',
      'Roll slowly from ankle to below the knee. Pause on anything tender and point/flex the foot there.',
      'Turn the leg in and out to cover both heads.',
    ],
  },
  {
    name: 'Foam Roll: Quads + Hip Flexors',
    dose: '60s / side',
    why: 'Sitting locks these short. Rolling before the couch stretch is the difference between a stretch and a fight.',
    steps: [
      'Face down, roller under one thigh, other leg off to the side.',
      'Roll from just above the knee to the crease of the hip. Slow. Breathe.',
      'At the hip crease, sit still on the spot for 10–15 seconds — that is the hip flexor.',
    ],
  },
  {
    name: 'Foam Roll: Glutes',
    dose: '45s / side',
    why: 'Glute med and piriformis get gritty from lifting and sitting; both limit hip rotation for the 90/90s.',
    steps: [
      'Sit on the roller, cross one ankle over the opposite knee, lean toward the crossed side.',
      'Small rolls around the outside of the hip. Find the sore spot, hold it, breathe it down.',
      'Don\'t bounce. Slow pressure is what changes tone.',
    ],
  },
  {
    name: 'Foam Roll: Upper Back',
    dose: '8 slow extensions',
    why: 'Thoracic extension is where upright posture lives, and the roller is the best tool there is for it.',
    steps: [
      'Roller across the mid-back, knees bent, hands behind your head to support the neck.',
      'Extend backward over the roller, ribs down, then come up. That is one rep.',
      'Shift the roller an inch and repeat, from the bottom of the shoulder blades up to the top. Never the low back.',
    ],
  },
  {
    name: 'Knee-to-Wall Ankle',
    dose: '60s / side',
    why: 'The most likely thing capping your squat depth. Tight ankles force the heels up or the back to round.',
    steps: [
      'Half-kneel facing a wall, front foot about a fist-width back from it.',
      'Drive that knee forward over the toes to touch the wall, heel glued down.',
      'If it touches easily, slide the foot back an inch and go again. That distance is your progress metric.',
    ],
  },
  {
    name: 'Deep Squat Hold',
    dose: '2 min total',
    why: 'The single best ROM investment: ankles, knees, hips, and low back all at once.',
    steps: [
      'Squat as deep as you can, heels down, chest tall. Hold onto a doorframe if needed.',
      'Accumulate 2 minutes across as many sets as it takes.',
      'Breathe slowly and let the hips sink a little deeper on each exhale.',
    ],
  },
  {
    name: 'Couch Stretch',
    dose: '90s / side',
    why: 'Desk sitting shortens the hip flexors, tilting the pelvis and killing hip drive. This is the antidote.',
    steps: [
      'Kneel on the mat with one shin vertical against a wall or couch, other foot planted in front.',
      'Squeeze the glute of the back leg and stand the torso up tall.',
      'Stay tall and breathe. No arching the low back to fake depth.',
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
    name: 'Seated Hamstring Stretch',
    dose: '60s / side',
    why: 'The one big range nothing else here trains. Toe-touch depth and deep hip positions both gate on it.',
    steps: [
      'Sit with one leg straight, the other bent with that foot against your inner thigh.',
      'Hinge from the hip toward the straight leg with a long spine, not a rounded back.',
      'Exhale and inch a little further each breath. Keep the stretched knee soft, not locked hard.',
    ],
  },
  {
    name: 'Dead Hang',
    dose: '60s total',
    why: 'Decompresses the spine and opens the shoulders and lats. Free posture from the bar you already own.',
    steps: [
      'Grip the pull-up bar, relax everything below the hands.',
      'Let the shoulder blades rise toward your ears; breathe into the stretch.',
      'Accumulate 60 seconds in as many sets as needed.',
    ],
  },
  {
    name: 'Open Book',
    dose: '8 / side',
    why: 'The roller trained extension; this trains rotation, the range that keeps pressing and overhead work healthy.',
    steps: [
      'Lie on your side on the mat, knees stacked and bent 90°, both arms straight out in front.',
      'Keep the knees pinned down and sweep the top arm across your body toward the floor behind you.',
      'Follow the hand with your eyes and exhale at end range. Do not let the knees lift to cheat depth.',
    ],
  },
  {
    name: 'Wall Slides',
    dose: '10',
    why: 'Turns the range the roller just opened into control — upper-back strength you can hold all day.',
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
          <span className="text-[10px] text-zinc-600">~15 min daily</span>
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

      <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 px-4 py-3">
        <p className="text-[11px] leading-relaxed text-zinc-400">
          <span className="font-medium text-teal-300">When to do it:</span> after lifting, or on
          rest days. Roller first, always — the stretches go further for a few minutes after it.
          Long holds before heavy pressing blunt strength, so keep pre-lift work dynamic (leg
          swings, the 90/90s, empty-bar sets). Rolling before a lift is fine.
        </p>
      </div>

      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 px-4 py-3 space-y-1.5">
        <p className="text-[11px] font-medium text-zinc-400">How this pays off</p>
        <p className="text-[11px] text-zinc-500 leading-relaxed">
          Consistency beats intensity: 15 mediocre minutes daily outperforms one heroic hour a
          week. Posture = this plus your face pulls, rows, and chin tucks. Open hips and strong
          glutes come from this plus the hip thrusts and RDLs in the split — same inputs, every
          payoff.
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
