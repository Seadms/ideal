'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

export function MvdToggle() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const mvdMode = searchParams.get('mvd') === '1'

  const toggle = () => {
    const params = new URLSearchParams(searchParams.toString())
    if (mvdMode) params.delete('mvd')
    else params.set('mvd', '1')
    router.replace(`/?${params.toString()}`, { scroll: false })
  }

  return (
    <button
      onClick={toggle}
      className={cn(
        'flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium transition-all duration-200 w-full',
        mvdMode
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
          : 'border-zinc-800 bg-zinc-900/60 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700',
      )}
    >
      <ShieldCheck size={15} className={mvdMode ? 'text-emerald-400' : 'text-zinc-600'} />
      <span>Minimum Viable Day</span>
      {mvdMode && (
        <span className="ml-auto rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-400">
          Active
        </span>
      )}
      {!mvdMode && (
        <span className="ml-auto text-xs text-zinc-600">Off</span>
      )}
    </button>
  )
}
