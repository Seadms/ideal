import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ── Timezone-correct date helpers ─────────────────────────────────────────────
// The app's "day" is anchored to NEXT_PUBLIC_APP_TZ (an IANA zone like
// America/New_York) when set, falling back to the runtime's local timezone.
// Vercel servers run in UTC and reserve the TZ env var, so without this a
// habit completed at 9 PM ET would be attributed to tomorrow.

const APP_TZ = process.env.NEXT_PUBLIC_APP_TZ

function ymd(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function localDateString(d: Date): string {
  if (APP_TZ) {
    // en-CA formats as YYYY-MM-DD
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: APP_TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(d)
  }
  return ymd(d.getFullYear(), d.getMonth() + 1, d.getDate())
}

// Pure calendar math on a date string — deliberately timezone-free. Noon
// construction sidesteps DST transitions shifting the date.
export function shiftDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d, 12)
  date.setDate(date.getDate() + n)
  return ymd(date.getFullYear(), date.getMonth() + 1, date.getDate())
}

export function todayString(): string {
  return localDateString(new Date())
}

// App-timezone timestamp (`YYYY-MM-DDTHH:MM:SS`) — sortable, and its date part
// matches todayString() so `startsWith(today)` comparisons stay correct.
// (`new Date().toISOString()` is UTC, which mislabels evening completions.)
export function nowString(): string {
  const d = new Date()
  if (APP_TZ) {
    const time = new Intl.DateTimeFormat('en-GB', {
      timeZone: APP_TZ, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    }).format(d)
    return `${localDateString(d)}T${time}`
  }
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${localDateString(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export function yesterdayString(): string {
  return shiftDays(todayString(), -1)
}

export function daysAgoString(n: number): string {
  return shiftDays(todayString(), -n)
}

export function getLast7Days(): string[] {
  const today = todayString()
  return Array.from({ length: 7 }, (_, i) => shiftDays(today, -(6 - i)))
}

// Returns the Monday of the week that contains the given date (or today if omitted)
export function getWeekStart(dateStr?: string): string {
  const base = dateStr ?? todayString()
  const [y, m, d] = base.split('-').map(Number)
  const date = new Date(y, m - 1, d, 12)
  const day = date.getDay() // 0=Sun, 1=Mon, …, 6=Sat
  const offset = day === 0 ? -6 : 1 - day // days back to Monday
  date.setDate(date.getDate() + offset)
  return ymd(date.getFullYear(), date.getMonth() + 1, date.getDate())
}

// App-timezone wall-clock helpers for real Date instants (calendar events,
// Canvas due times). Distinct from the YYYY-MM-DD string helpers above.

export function timeInAppTz(d: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    ...(APP_TZ ? { timeZone: APP_TZ } : {}), hour: 'numeric', minute: '2-digit',
  }).format(d) // "3:30 PM"
}

export function hmInAppTz(d: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    ...(APP_TZ ? { timeZone: APP_TZ } : {}), hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(d) // "15:30" — comparable against stored "HH:MM" prefs
}

export function dateInAppTz(d: Date): string {
  return localDateString(d) // YYYY-MM-DD
}

// ── Level formula ─────────────────────────────────────────────────────────────
// level = floor(sqrt(totalEarned / 100)) + 1
// L1=0pts, L2=100pts, L3=400pts, L5=1600pts, L10=8100pts

export interface LevelInfo {
  level: number
  progress: number
  currentLevelPts: number
  nextLevelPts: number
  pointsIntoLevel: number
  pointsNeeded: number
}

export function levelFromPoints(pts: number): number {
  return Math.floor(Math.sqrt(pts / 100)) + 1
}

export function calculateLevel(totalPointsEarned: number): LevelInfo {
  const level = levelFromPoints(totalPointsEarned)
  const currentLevelPts = (level - 1) * (level - 1) * 100
  const nextLevelPts = level * level * 100
  const pointsIntoLevel = totalPointsEarned - currentLevelPts
  const pointsNeeded = nextLevelPts - currentLevelPts
  const progress = Math.min((pointsIntoLevel / pointsNeeded) * 100, 100)
  return { level, progress, currentLevelPts, nextLevelPts, pointsIntoLevel, pointsNeeded }
}

// ── Streak helpers ────────────────────────────────────────────────────────────

export function calculateHabitStreak(
  habitId: string,
  completions: { habitId: string; completedDate: string }[],
  frequencyPerWeek = 7,
): number {
  const habitDates = completions.filter(c => c.habitId === habitId).map(c => c.completedDate)
  if (habitDates.length === 0) return 0

  if (frequencyPerWeek === 7) {
    // Daily streak: consecutive days
    const dates = new Set(habitDates)
    const today = todayString()
    const yesterday = yesterdayString()
    if (!dates.has(today) && !dates.has(yesterday)) return 0
    let streak = 0
    let check = dates.has(today) ? today : yesterday
    while (dates.has(check)) {
      streak++
      check = shiftDays(check, -1)
    }
    return streak
  } else {
    // Weekly streak: consecutive Mon–Sun weeks where quota was met
    const weekCounts = new Map<string, number>()
    for (const date of habitDates) {
      const ws = getWeekStart(date)
      weekCounts.set(ws, (weekCounts.get(ws) ?? 0) + 1)
    }
    const thisWeek = getWeekStart()
    const lastWeek = getWeekStart(shiftDays(thisWeek, -1))
    const thisCount = weekCounts.get(thisWeek) ?? 0
    const lastCount = weekCounts.get(lastWeek) ?? 0
    if (thisCount < frequencyPerWeek && lastCount < frequencyPerWeek) return 0
    let streak = 0
    let checkWeek = thisCount >= frequencyPerWeek ? thisWeek : lastWeek
    while ((weekCounts.get(checkWeek) ?? 0) >= frequencyPerWeek) {
      streak++
      checkWeek = getWeekStart(shiftDays(checkWeek, -1))
    }
    return streak
  }
}

// A day is "active" (perfect) when every listed habit was completed that day.
export function getLast7DaysStatus(
  habitIds: string[],
  completions: { habitId: string; completedDate: string }[],
): { date: string; active: boolean; isToday: boolean }[] {
  if (habitIds.length === 0) return []
  const today = todayString()
  return getLast7Days().map(date => {
    const doneIds = new Set(completions.filter(c => c.completedDate === date).map(c => c.habitId))
    const active = habitIds.every(id => doneIds.has(id))
    return { date, active, isToday: date === today }
  })
}

// ── Formatting ────────────────────────────────────────────────────────────────

export function formatPoints(pts: number): string {
  return pts.toLocaleString()
}

// SQLite `datetime('now')` column defaults are UTC "YYYY-MM-DD HH:MM:SS"
// strings; parse them as UTC so they convert to the viewer's timezone instead
// of being misread as local time.
export function parseUtcDateTime(dt: string): Date {
  return new Date(dt.includes('T') ? dt : dt.replace(' ', 'T') + 'Z')
}

export function formatDate(dateStr: string): string {
  // Parse the date part as a local calendar date. `new Date('YYYY-MM-DD')`
  // would parse as UTC midnight and render the previous day in the Americas.
  const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function dayLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][new Date(y, m - 1, d).getDay()]
}
