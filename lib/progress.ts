// Shared config + helpers for the Progress tracking page.

export type BenchmarkKind = 'reps' | 'stage'

export interface BenchmarkDef {
  key: string
  label: string
  short: string
  kind: BenchmarkKind
  unit?: string
  color: string        // chart stroke (hex)
  stages?: string[]    // ordered, for staged benchmarks
}

// The four key benchmarks that track "strength rising" toward the V-taper goal.
export const BENCHMARKS: BenchmarkDef[] = [
  { key: 'pull_ups',  label: 'Max strict pull-ups', short: 'Pull-ups',     kind: 'reps', unit: 'reps', color: '#818cf8' },
  { key: 'ring_dips', label: 'Max ring dips',       short: 'Ring dips',    kind: 'reps', unit: 'reps', color: '#f59e0b' },
  {
    key: 'pistol_squat', label: 'Pistol squat stage', short: 'Pistol squat', kind: 'stage', color: '#34d399',
    stages: ['Assisted', 'Box / elevated', 'Negatives', 'Partial ROM', 'Full pistol', 'Weighted pistol'],
  },
  {
    key: 'push_up', label: 'Hardest push-up', short: 'Push-up', kind: 'stage', color: '#fb7185',
    stages: ['Incline', 'Knee', 'Full', 'Diamond', 'Decline', 'Pseudo-planche', 'Archer', 'One-arm'],
  },
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
