'use client'

import { useTransition } from 'react'
import { clearCompletedTasks } from '@/lib/actions/tasks'
import { Trash2 } from 'lucide-react'

interface ClearCompletedButtonProps {
  count: number
}

export function ClearCompletedButton({ count }: ClearCompletedButtonProps) {
  const [isPending, startTransition] = useTransition()

  const handle = () => {
    startTransition(async () => { await clearCompletedTasks() })
  }

  return (
    <button
      onClick={handle}
      disabled={isPending || count === 0}
      className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-rose-400 transition-colors disabled:opacity-30"
    >
      <Trash2 size={11} />
      Clear {count} done
    </button>
  )
}
