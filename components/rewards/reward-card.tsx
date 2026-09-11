'use client'

import { useState, useTransition } from 'react'
import { redeemReward } from '@/lib/actions/rewards'
import type { Reward } from '@/lib/db/schema'
import { cn, formatPoints } from '@/lib/utils'
import { CategoryIcon } from '@/components/ui/category-icon'
import { Button } from '@/components/ui/button'

// Kayd's store. She stocks and edits it from /wife; here Daniel can only
// request, and she approves.
interface RewardCardProps {
  reward: Reward
  goodBoyPoints: number
}

export function RewardCard({ reward, goodBoyPoints }: RewardCardProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [requested, setRequested] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const canAfford = goodBoyPoints >= reward.cost
  const soldOut = !!reward.maxRedemptions && reward.timesRedeemed >= reward.maxRedemptions
  const remaining = reward.maxRedemptions ? reward.maxRedemptions - reward.timesRedeemed : null
  const available = reward.isAvailable && !soldOut

  const handleRedeem = () => {
    if (!showConfirm) { setShowConfirm(true); return }
    setError(null)
    startTransition(async () => {
      const result = await redeemReward(reward.id)
      if (!result.success) setError(result.error ?? 'Failed')
      else setRequested(true)
      setShowConfirm(false)
    })
  }

  return (
    <div className={cn(
      'group relative flex flex-col rounded-2xl border p-5 transition-all duration-200',
      !available
        ? 'border-zinc-800/40 bg-zinc-900/20 opacity-50'
        : canAfford
          ? 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700'
          : 'border-zinc-800/50 bg-zinc-900/30 opacity-60',
    )}>
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
          <span className="text-sm font-semibold text-zinc-200">{formatPoints(reward.cost)} good boy pts</span>
          {remaining !== null ? (
            <span className="text-xs text-zinc-600">{remaining > 0 ? `${remaining} left` : 'none left'}</span>
          ) : reward.timesRedeemed > 0 ? (
            <span className="text-xs text-zinc-600">×{reward.timesRedeemed} redeemed</span>
          ) : null}
        </div>

        {/* Error */}
        {error && <p className="text-xs text-rose-400">{error}</p>}

        {requested ? (
          <p className="text-center text-xs text-sky-300">Requested — waiting for Kayd.</p>
        ) : (
        <Button
          variant={showConfirm ? 'gold' : canAfford && available ? 'outline' : 'ghost'}
          size="sm"
          className="w-full"
          onClick={handleRedeem}
          disabled={isPending || !canAfford || !available}
        >
          {isPending
            ? 'Processing...'
            : soldOut
              ? 'All used up'
              : !available
              ? 'Unavailable'
              : showConfirm
                ? 'Send request?'
                : canAfford
                  ? 'Request'
                  : `${formatPoints(reward.cost - goodBoyPoints)} good boy pts short`}
        </Button>
        )}

        {showConfirm && !requested && (
          <button
            className="w-full text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            onClick={() => setShowConfirm(false)}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}
