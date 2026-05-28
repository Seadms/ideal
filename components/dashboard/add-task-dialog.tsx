'use client'

import { useState, useTransition } from 'react'
import { createTask } from '@/lib/actions/tasks'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input, Textarea, Select } from '@/components/ui/input'

interface AddTaskDialogProps {
  open: boolean
  onClose: () => void
}

const CATEGORIES = ['general', 'coding', 'project', 'fitness', 'productivity', 'growth', 'social']

export function AddTaskDialog({ open, onClose }: AddTaskDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState({
    title: '',
    description: '',
    points: 100,
    isMinimumViable: false,
    category: 'general',
    dueDate: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    startTransition(async () => {
      await createTask({ ...form, dueDate: form.dueDate || undefined })
      setForm({ title: '', description: '', points: 100, isMinimumViable: false, category: 'general', dueDate: '' })
      onClose()
    })
  }

  return (
    <Dialog open={open} onClose={onClose} title="New One-Off Task">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs text-zinc-500 mb-1.5">Title *</label>
          <Input
            placeholder="e.g. Refactor auth module"
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
              max={2000}
              value={form.points}
              onChange={e => setForm(f => ({ ...f, points: Number(e.target.value) }))}
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
          <label className="block text-xs text-zinc-500 mb-1.5">Due date (optional)</label>
          <Input
            type="date"
            value={form.dueDate}
            onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
          />
        </div>
        <div className="flex gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" disabled={isPending || !form.title.trim()} className="flex-1">
            {isPending ? 'Adding...' : 'Add Task'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
