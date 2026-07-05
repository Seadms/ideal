import { cn } from '@/lib/utils'
import { type ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'ghost' | 'destructive' | 'outline' | 'gold'
  size?: 'sm' | 'md' | 'lg' | 'icon'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-500',
          {
            'bg-zinc-100 text-zinc-900 hover:bg-zinc-200 active:bg-zinc-300':
              variant === 'default',
            'bg-transparent text-zinc-400 hover:text-zinc-100 hover:bg-white/5':
              variant === 'ghost',
            'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20':
              variant === 'destructive',
            'border border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 bg-transparent':
              variant === 'outline',
            'bg-slate-400/10 text-slate-200 hover:bg-slate-400/20 border border-slate-400/20':
              variant === 'gold',
          },
          {
            'h-7 px-2.5 text-xs': size === 'sm',
            'h-9 px-4 text-sm': size === 'md',
            'h-11 px-5 text-base': size === 'lg',
            'h-9 w-9 p-0': size === 'icon',
          },
          className,
        )}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'
