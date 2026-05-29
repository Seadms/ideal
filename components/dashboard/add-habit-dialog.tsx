'use client'

import { useState, useTransition } from 'react'
import { createHabit } from '@/lib/actions/habits'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input, Textarea, Select } from '@/components/ui/input'

interface AddHabitDialogProps {
  open: boolean
  onClose: () => void
}

const CATEGORIES = ['general', 'fitness', 'productivity', 'self-care', 'growth', 'coding', 'project', 'social']

export function AddHabitDialog({ open, onClose }: AddHabitDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState({
    title: '',
    description: '',
    points: '50',
    isMinimumViable: false,
    category: 'general',
    frequencyPerWeek: 7,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    startTransition(async () => {
      await createHabit({ ...form, points: Number(form.points) || 1 })
      setForm({ title: '', description: '', points: '50', isMinimumViable: false, category: 'general', frequencyPerWeek: 7 })
      onClose()
    })
  }

  return (
    <Dialog open={open} onClose={onClose} title="New Daily Habit">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs text-zinc-500 mb-1.5">Title *</label>
          <Input
            placeholder="e.g. Meditate for 10 min"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            autoFocus
          />
        </div>
        <div>
          <label className="block text-xs text-zinc-500 mb-1.5">Description</label>
          <Textarea
            placeholder="Optional details..."
            rows={2}
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-zinc-500 mb-1.5">Points</label>
            <Input
              type="number"
              min={1}
              max={1000}
              value={form.points}
              onChange={e => setForm(f => ({ ...f, points: e.target.value }))}
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
        <div>
          <label className="block text-xs text-zinc-500 mb-1.5">Frequency</label>
          <Select
            value={String(form.frequencyPerWeek)}
            onChange={e => setForm(f => ({ ...f, frequencyPerWeek: Number(e.target.value) }))}
          >
            <option value="7">Every day</option>
            <option value="6">6× / week</option>
            <option value="5">5× / week</option>
            <option value="4">4× / week</option>
            <option value="3">3× / week</option>
            <option value="2">2× / week</option>
            <option value="1">1× / week</option>
          </Select>
        </div>
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <div
            onClick={() => setForm(f => ({ ...f, isMinimumViable: !f.isMinimumViable }))}
            className={`relative h-5 w-9 rounded-full transition-colors ${form.isMinimumViable ? 'bg-emerald-500' : 'bg-zinc-700'}`}
          >
            <div className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${form.isMinimumViable ? 'translate-x-4' : ''}`} />
          </div>
          <span className="text-sm text-zinc-300">Count toward Minimum Viable Day</span>
        </label>
        <div className="flex gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" disabled={isPending || !form.title.trim()} className="flex-1">
            {isPending ? 'Adding...' : 'Add Habit'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
