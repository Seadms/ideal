'use client'

import { useState, useTransition } from 'react'
import { Sparkles, RefreshCw, Check, ChevronRight, Trophy } from 'lucide-react'
import { categoryEmoji } from '@/lib/utils'
import {
  generateBonusTask,
  acceptBonusTask,
  completeBonusTask,
  rerollBonusTask,
} from '@/lib/actions/bonus-tasks'
import type { BonusTaskPoolItem, BonusTaskSession } from '@/lib/db/schema'

interface BonusTask {
  session: BonusTaskSession
  task: BonusTaskPoolItem
}

type Phase =
  | { kind: 'idle' }
  | { kind: 'active'; data: BonusTask; accepted: boolean }
  | { kind: 'done'; task: BonusTaskPoolItem; pts: number; leveledUp: boolean; newLevel: number }
  | { kind: 'exhausted' }

function phaseFromProps(initial: BonusTask | null): Phase {
  if (!initial) return { kind: 'idle' }
  if (initial.session.state === 'completed') {
    return {
      kind: 'done',
      task: initial.task,
      pts: initial.session.pointsEarned ?? initial.task.points,
      leveledUp: false,
      newLevel: 1,
    }
  }
  return { kind: 'active', data: initial, accepted: initial.session.state === 'accepted' }
}

export function BonusTaskCard({ initial }: { initial: BonusTask | null }) {
  const [phase, setPhase] = useState<Phase>(() => phaseFromProps(initial))
  const [isPending, startTransition] = useTransition()

  const handleGenerate = () => {
    startTransition(async () => {
      const result = await generateBonusTask()
      setPhase(result ? { kind: 'active', data: result, accepted: false } : { kind: 'exhausted' })
    })
  }

  const handleAccept = (data: BonusTask) => {
    startTransition(async () => {
      await acceptBonusTask(data.session.id)
      setPhase({ kind: 'active', data, accepted: true })
    })
  }

  const handleComplete = (data: BonusTask) => {
    startTransition(async () => {
      const result = await completeBonusTask(data.session.id)
      setPhase({ kind: 'done', task: data.task, pts: result.pointsEarned, leveledUp: result.leveledUp, newLevel: result.newLevel })
    })
  }

  const handleReroll = (data: BonusTask) => {
    startTransition(async () => {
      const result = await rerollBonusTask(data.session.id)
      setPhase(result ? { kind: 'active', data: result, accepted: false } : { kind: 'exhausted' })
    })
  }

  const handleAnother = () => {
    startTransition(async () => {
      const result = await generateBonusTask()
      setPhase(result ? { kind: 'active', data: result, accepted: false } : { kind: 'exhausted' })
    })
  }

  if (phase.kind === 'idle') {
    return (
      <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles size={14} className="text-violet-400 shrink-0" />
          <div>
            <p className="text-sm font-medium text-zinc-300">Bonus Task Generator</p>
            <p className="text-xs text-zinc-500">Nothing to do? Get a spontaneous challenge.</p>
          </div>
        </div>
        <button
          onClick={handleGenerate}
          disabled={isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 transition-colors text-xs font-medium text-white shrink-0"
        >
          {isPending ? <RefreshCw size={12} className="animate-spin" /> : <ChevronRight size={12} />}
          Suggest one
        </button>
      </div>
    )
  }

  if (phase.kind === 'exhausted') {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 flex items-center gap-3">
        <Sparkles size={14} className="text-zinc-500 shrink-0" />
        <div>
          <p className="text-sm font-medium text-zinc-400">All bonus tasks tried today</p>
          <p className="text-xs text-zinc-600">Fresh suggestions reset at midnight.</p>
        </div>
      </div>
    )
  }

  if (phase.kind === 'done') {
    return (
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-4 space-y-3">
        <div className="flex items-center gap-2">
          <Trophy size={14} className="text-emerald-400" />
          <p className="text-sm font-semibold text-emerald-400">Bonus complete!</p>
          {phase.leveledUp && (
            <span className="text-xs bg-amber-500/15 text-amber-300 border border-amber-500/20 rounded-full px-2 py-0.5 ml-auto">
              Level up → {phase.newLevel}
            </span>
          )}
        </div>
        <p className="text-sm text-zinc-300">{phase.task.title}</p>
        <p className="text-xs text-emerald-500 font-medium">+{phase.pts} pts earned</p>
        <button
          onClick={handleAnother}
          disabled={isPending}
          className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-50"
        >
          {isPending ? <RefreshCw size={11} className="animate-spin" /> : <Sparkles size={11} />}
          Another one?
        </button>
      </div>
    )
  }

  // Active phase (suggested or accepted)
  const { data, accepted } = phase
  return (
    <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 px-4 py-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-violet-400" />
          <p className="text-xs font-semibold text-violet-400 uppercase tracking-wider">Bonus Task</p>
        </div>
        {accepted && (
          <span className="text-xs text-violet-300 bg-violet-500/10 border border-violet-500/20 rounded-full px-2 py-0.5">
            committed
          </span>
        )}
      </div>

      <p className="text-sm text-zinc-200 font-medium leading-snug">{data.task.title}</p>

      <p className="text-xs text-zinc-500 flex items-center gap-2">
        <span>{categoryEmoji(data.task.category)} {data.task.category} · {data.task.points} pts</span>
        {!data.task.isActive && (
          <span className="text-violet-500/70">✦ AI</span>
        )}
      </p>

      <div className="flex items-center gap-2 pt-1">
        {!accepted && (
          <button
            onClick={() => handleAccept(data)}
            disabled={isPending}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-violet-600/30 hover:bg-violet-600/50 text-violet-300 border border-violet-500/30 transition-colors disabled:opacity-50"
          >
            Accept
          </button>
        )}
        <button
          onClick={() => handleComplete(data)}
          disabled={isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50"
        >
          {isPending ? <RefreshCw size={11} className="animate-spin" /> : <Check size={11} />}
          Done
        </button>
        <button
          onClick={() => handleReroll(data)}
          disabled={isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors disabled:opacity-50 ml-auto"
        >
          <RefreshCw size={11} />
          Reroll
        </button>
      </div>
    </div>
  )
}
