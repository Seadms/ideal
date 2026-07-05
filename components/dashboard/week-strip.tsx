import { cn, dayLabel } from '@/lib/utils'

interface WeekStripProps {
  days: { date: string; active: boolean; isToday: boolean }[]
}

// Horizontal 7-day strip: day-of-month numerals with today pinned in a white
// pill and a rose dot under each perfect day (every daily habit completed).
export function WeekStrip({ days }: WeekStripProps) {
  if (days.length === 0) return null

  return (
    <div className="flex items-start justify-between px-1">
      {days.map(({ date, active, isToday }) => {
        const dayNum = Number(date.slice(8, 10))
        return (
          <div key={date} className="flex flex-col items-center gap-1">
            <span className="text-[10px] uppercase text-zinc-600">{dayLabel(date)}</span>
            <span className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full font-display text-sm font-semibold tabular-nums',
              isToday ? 'bg-zinc-100 text-zinc-950' : 'text-zinc-400',
            )}>
              {dayNum}
            </span>
            <span className={cn(
              'h-1 w-1 rounded-full',
              active ? 'bg-ring-habit' : 'bg-transparent',
            )} />
          </div>
        )
      })}
    </div>
  )
}
