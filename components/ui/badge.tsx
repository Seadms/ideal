import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'gold' | 'violet' | 'emerald' | 'rose' | 'muted'
  className?: string
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
      {
        'bg-zinc-800 text-zinc-300': variant === 'default',
        'bg-slate-400/10 text-slate-300': variant === 'gold',
        'bg-violet-500/10 text-violet-400': variant === 'violet',
        'bg-emerald-500/10 text-emerald-400': variant === 'emerald',
        'bg-rose-500/10 text-rose-400': variant === 'rose',
        'bg-zinc-800/50 text-zinc-500': variant === 'muted',
      },
      className,
    )}>
      {children}
    </span>
  )
}
