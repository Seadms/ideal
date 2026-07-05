'use client'

import { useState, useTransition } from 'react'
import { updateHabit, deleteHabit } from '@/lib/actions/habits'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input, Textarea, Select } from '@/components/ui/input'
import type { Habit } from '@/lib/db/schema'

interface EditHabitDialogProps {
  habit: Habit
  open: boolean
  onClose: () => void
}

const CATEGORIES = ['general', 'fitness', 'productivity', 'self-care', 'growth', 'coding', 'project', 'social']

export function EditHabitDialog({ habit, open, onClose }: EditHabitDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState({
    title: habit.title,
    description: habit.description ?? '',
    points: String(habit.points),
    isMinimumViable: habit.isMinimumViable,
    category: habit.category,
    frequencyPerWeek: habit.frequencyPerWeek,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    startTransition(async () => {
      await updateHabit(habit.id, { ...form, points: Number(form.points) || 1 })
      onClose()
    })
  }

  const handleDelete = () => {
    startTransition(async () => {
      await deleteHabit(habit.id)
      onClose()
    })
  }

  return (
    <Dialog open={open} onClose={onClose} title="Edit Habit">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs text-zinc-500 mb-1.5">Title</label>
          <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} autoFocus />
        </div>
        <div>
          <label className="block text-xs text-zinc-500 mb-1.5">Description</label>
          <Textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-zinc-500 mb-1.5">Points</label>
            <Input type="number" min={1} max={1000} value={form.points} onChange={e => setForm(f => ({ ...f, points: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1.5">Category</label>
            <Select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
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
        <div className="flex gap-2 pt-1">
          <Button type="button" variant="destructive" size="sm" onClick={handleDelete} disabled={isPending}>
            Archive
          </Button>
          <div className="flex-1" />
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={isPending || !form.title.trim()}>
            {isPending ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
