'use client'

import { useState, useTransition } from 'react'
import { redeemReward, deleteReward, updateReward } from '@/lib/actions/rewards'
import type { Reward } from '@/lib/db/schema'
import { cn, formatPoints } from '@/lib/utils'
import { CategoryIcon } from '@/components/ui/category-icon'
import { Button } from '@/components/ui/button'
import { Eye, EyeOff, Pencil, Trash2, Zap } from 'lucide-react'
import { EditRewardDialog } from './edit-reward-dialog'

interface RewardCardProps {
  reward: Reward
  currentPoints: number
}

export function RewardCard({ reward, currentPoints }: RewardCardProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const canAfford = currentPoints >= reward.cost
  const available = reward.isAvailable

  const handleRedeem = () => {
    if (!showConfirm) { setShowConfirm(true); return }
    setError(null)
    startTransition(async () => {
      const result = await redeemReward(reward.id)
      if (!result.success) setError(result.error ?? 'Failed')
      setShowConfirm(false)
    })
  }

  const handleDelete = () => {
    startTransition(async () => {
      await deleteReward(reward.id)
    })
  }

  const handleToggleAvailable = () => {
    startTransition(async () => {
      await updateReward(reward.id, { isAvailable: !available })
    })
  }

  return (
    <>
    <EditRewardDialog reward={reward} open={editOpen} onClose={() => setEditOpen(false)} />
    <div className={cn(
      'group relative flex flex-col rounded-2xl border p-5 transition-all duration-200',
      !available
        ? 'border-zinc-800/40 bg-zinc-900/20 opacity-50'
        : canAfford
          ? 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700'
          : 'border-zinc-800/50 bg-zinc-900/30 opacity-60',
    )}>
      {/* Actions (edit / toggle / delete) */}
      <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => setEditOpen(true)}
          title="Edit reward"
          className="h-7 w-7 flex items-center justify-center rounded hover:bg-zinc-800 transition-colors"
        >
          <Pencil size={13} className="text-zinc-500" />
        </button>
        <button
          onClick={handleToggleAvailable}
          disabled={isPending}
          title={available ? 'Hide reward' : 'Show reward'}
          className="h-7 w-7 flex items-center justify-center rounded hover:bg-zinc-800 transition-colors"
        >
          {available
            ? <EyeOff size={13} className="text-zinc-500" />
            : <Eye size={13} className="text-zinc-400" />}
        </button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={handleDelete}
          disabled={isPending}
        >
          <Trash2 size={13} className="text-rose-400" />
        </Button>
      </div>

      {/* Category marker */}
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900">
        <CategoryIcon category={reward.category} size={16} className="text-zinc-400" />
      </div>

      {/* Title & description */}
      <h3 className="text-sm font-semibold text-zinc-100 leading-snug mb-1.5">
        {reward.title}
      </h3>
      {reward.description && (
        <p className="text-xs text-zinc-500 leading-relaxed mb-3 flex-1">{reward.description}</p>
      )}

      <div className="mt-auto space-y-2.5 pt-3 border-t border-zinc-800">
        {/* Cost */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Zap size={12} className="text-amber-400" />
            <span className="text-sm font-semibold text-amber-400">{formatPoints(reward.cost)} pts</span>
          </div>
          {reward.timesRedeemed > 0 && (
            <span className="text-xs text-zinc-600">×{reward.timesRedeemed} redeemed</span>
          )}
        </div>

        {/* Error */}
        {error && <p className="text-xs text-rose-400">{error}</p>}

        {/* Redeem button */}
        <Button
          variant={showConfirm ? 'gold' : canAfford && available ? 'outline' : 'ghost'}
          size="sm"
          className="w-full"
          onClick={handleRedeem}
          disabled={isPending || !canAfford || !available}
        >
          {isPending
            ? 'Processing...'
            : !available
              ? 'Unavailable'
              : showConfirm
                ? 'Confirm redeem?'
                : canAfford
                  ? 'Redeem'
                  : `${formatPoints(reward.cost - currentPoints)} pts short`}
        </Button>

        {showConfirm && (
          <button
            className="w-full text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            onClick={() => setShowConfirm(false)}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
    </>
  )
}
