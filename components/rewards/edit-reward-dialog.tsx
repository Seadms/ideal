'use client'

import { useState, useTransition } from 'react'
import { updateReward } from '@/lib/actions/rewards'
import type { Reward } from '@/lib/db/schema'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input, Textarea, Select } from '@/components/ui/input'

interface EditRewardDialogProps {
  reward: Reward
  open: boolean
  onClose: () => void
}

const CATEGORIES = ['general', 'food', 'rest', 'hobby', 'luxury', 'experience', 'digital']

export function EditRewardDialog({ reward, open, onClose }: EditRewardDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState({
    title: reward.title,
    description: reward.description ?? '',
    cost: String(reward.cost),
    category: reward.category,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    startTransition(async () => {
      await updateReward(reward.id, { ...form, cost: Number(form.cost) || 1 })
      onClose()
    })
  }

  return (
    <Dialog open={open} onClose={onClose} title="Edit Reward">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs text-zinc-500 mb-1.5">Title *</label>
          <Input
            placeholder="e.g. Weekend camping trip"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            autoFocus
          />
        </div>
        <div>
          <label className="block text-xs text-zinc-500 mb-1.5">Description</label>
          <Textarea
            placeholder="What does this reward mean to you?"
            rows={2}
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-zinc-500 mb-1.5">Cost (pts)</label>
            <Input
              type="number"
              min={1}
              value={form.cost}
              onChange={e => setForm(f => ({ ...f, cost: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1.5">Category</label>
            <Select
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" disabled={isPending || !form.title.trim()} className="flex-1">
            {isPending ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
