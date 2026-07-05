import { cn } from '@/lib/utils'

// The kayd-points currency mark: a lime "K" coin. Replaces the old lightning
// bolt anywhere points appear.
const SIZES = {
  sm: 'h-4 w-4 text-[9px]',
  md: 'h-5 w-5 text-[11px]',
  lg: 'h-7 w-7 text-sm',
} as const

export function KMark({ size = 'md', className }: { size?: keyof typeof SIZES; className?: string }) {
  return (
    <span
      aria-label="kayd points"
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full',
        'bg-lime-400/15 text-lime-300 font-display font-bold leading-none',
        SIZES[size],
        className,
      )}
    >
      K
    </span>
  )
}
