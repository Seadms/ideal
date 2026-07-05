'use client'

import { useState, useTransition } from 'react'
import { freezeStreak } from '@/lib/actions/habits'
import { Shield } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FreezeStreakButtonProps {
  todayAlreadyActive: boolean
}

export function FreezeStreakButton({ todayAlreadyActive }: FreezeStreakButtonProps) {
  const [isPending, startTransition] = useTransition()
  const [confirm, setConfirm] = useState(false)

  if (todayAlreadyActive) return null

  const handle = () => {
    if (!confirm) { setConfirm(true); return }
    startTransition(async () => {
      await freezeStreak()
      setConfirm(false)
    })
  }

  return (
    <button
      onClick={handle}
      disabled={isPending}
      title="Freeze streak. Credits today without completing habits"
      className={cn(
        'flex items-center gap-1 text-[10px] font-medium rounded-full px-2 py-0.5 transition-all mt-1',
        confirm
          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
          : 'text-zinc-600 hover:text-zinc-400',
      )}
    >
      <Shield size={9} />
      {confirm ? 'confirm?' : 'freeze'}
    </button>
  )
}
