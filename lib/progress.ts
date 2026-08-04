// Shared config + helpers for the Progress tracking page.

// 'weight' and 'reps' both log a plain number; only 'stage' uses a dropdown.
export type BenchmarkKind = 'reps' | 'weight' | 'stage'

export interface BenchmarkDef {
  key: string
  label: string
  short: string
  kind: BenchmarkKind
  unit?: string
  color: string        // chart stroke (hex)
  stages?: string[]    // ordered, for staged benchmarks
}

// The anchor lifts of the 5-day gym split. Tracking the top working set on
// each is what proves the V-taper is being built rather than just maintained.
// (Older calisthenics benchmarks were dropped when training moved to the gym;
// their logged rows stay in the database, they just no longer render.)
export const BENCHMARKS: BenchmarkDef[] = [
  { key: 'incline_bench', label: 'Incline bench press', short: 'Incline bench', kind: 'weight', unit: 'lbs', color: '#f59e0b' },
  { key: 'back_squat',    label: 'Back squat',          short: 'Squat',         kind: 'weight', unit: 'lbs', color: '#34d399' },
  { key: 'hip_thrust',    label: 'Barbell hip thrust',  short: 'Hip thrust',    kind: 'weight', unit: 'lbs', color: '#fb7185' },
  { key: 'pull_ups',      label: 'Max strict pull-ups', short: 'Pull-ups',      kind: 'reps',   unit: 'reps', color: '#818cf8' },
]

export const BENCHMARK_BY_KEY: Record<string, BenchmarkDef> =
  Object.fromEntries(BENCHMARKS.map(b => [b.key, b]))

// Trailing 7-entry rolling average to smooth daily bodyweight noise.
// (Bodyweight is stored one-per-day, so 7 entries ≈ 7 days.)
export function rolling7(values: number[]): number[] {
  return values.map((_, i) => {
    const window = values.slice(Math.max(0, i - 6), i + 1)
    const avg = window.reduce((s, v) => s + v, 0) / window.length
    return Math.round(avg * 10) / 10
  })
}

// ── Cut check ─────────────────────────────────────────────────────────────────
// Turns the diet-page rule ("re-evaluate every 2–3 weeks; if loss stalls 2+
// weeks, drop calories 150–200") into something the app decides for him.
// Reads the smoothed line, not raw weigh-ins, so water swings don't trigger it.

export type CutStatus = 'need-data' | 'on-pace' | 'slow' | 'stalled' | 'too-fast'

export interface CutCheck {
  status: CutStatus
  ratePerWeek: number | null   // negative = losing
  headline: string
  detail: string
}

const TARGET_LO = 0.5   // lb/week — floor of a good cut
const TARGET_HI = 1.5   // lb/week — above this risks muscle

export function cutCheck(values: number[]): CutCheck {
  // Two weeks of daily logs is the minimum for the smoothed line to mean anything.
  if (values.length < 10) {
    return {
      status: 'need-data',
      ratePerWeek: null,
      headline: 'Not enough data yet',
      detail: `Log your weight daily. ${10 - values.length} more entr${10 - values.length === 1 ? 'y' : 'ies'} and this starts calling your cut for you.`,
    }
  }

  const avg = rolling7(values)
  const now = avg[avg.length - 1]
  const rate = round1(now - avg[Math.max(0, avg.length - 8)])          // last 7 days
  const twoWeek = avg.length >= 15 ? round1(now - avg[avg.length - 15]) : null

  // A genuine stall needs two weeks of near-flat smoothed weight, which is
  // exactly the trigger written into the diet rules.
  if (twoWeek !== null && twoWeek > -0.5) {
    return {
      status: 'stalled',
      ratePerWeek: rate,
      headline: `Stalled: ${fmtDelta(twoWeek)} lb in 14 days`,
      detail: 'Drop calories by 150 to 200 (about 2150) and hold two more weeks. Check that protein and step count have not slipped first.',
    }
  }
  if (rate < -TARGET_HI) {
    return {
      status: 'too-fast',
      ratePerWeek: rate,
      headline: `Dropping fast: ${fmtDelta(rate)} lb/week`,
      detail: 'Faster than 1.5 lb/week starts costing muscle on a lean frame. Add about 150 calories back and keep protein high.',
    }
  }
  if (rate <= -TARGET_LO) {
    return {
      status: 'on-pace',
      ratePerWeek: rate,
      headline: `On pace: ${fmtDelta(rate)} lb/week`,
      detail: 'Right in the 0.5 to 1.5 lb window. Hold calories exactly where they are.',
    }
  }
  return {
    status: 'slow',
    ratePerWeek: rate,
    headline: `Slow: ${fmtDelta(rate)} lb/week`,
    detail: 'Moving, but under half a pound a week. Tighten adherence first; only cut calories if this holds another week.',
  }
}

const round1 = (n: number) => Math.round(n * 10) / 10
const fmtDelta = (n: number) => (n > 0 ? `+${n}` : `${n}`)
