'use client'

import { useState, useTransition } from 'react'
import { updateTask, deleteTask } from '@/lib/actions/tasks'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input, Textarea, Select } from '@/components/ui/input'
import type { Task } from '@/lib/db/schema'

interface EditTaskDialogProps {
  task: Task
  open: boolean
  onClose: () => void
}

const CATEGORIES = ['general', 'coding', 'project', 'fitness', 'productivity', 'growth', 'social']

export function EditTaskDialog({ task, open, onClose }: EditTaskDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState({
    title: task.title,
    description: task.description ?? '',
    points: task.points,
    category: task.category,
    dueDate: task.dueDate ?? '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    startTransition(async () => {
      await updateTask(task.id, { ...form, dueDate: form.dueDate || undefined })
      onClose()
    })
  }

  const handleDelete = () => {
    startTransition(async () => {
      await deleteTask(task.id)
      onClose()
    })
  }

  return (
    <Dialog open={open} onClose={onClose} title="Edit Task">
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
            <Input type="number" min={1} max={2000} value={form.points} onChange={e => setForm(f => ({ ...f, points: Number(e.target.value) }))} />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1.5">Category</label>
            <Select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
          </div>
        </div>
        <div>
          <label className="block text-xs text-zinc-500 mb-1.5">Due date</label>
          <Input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
        </div>
        <div className="flex gap-2 pt-1">
          <Button type="button" variant="destructive" size="sm" onClick={handleDelete} disabled={isPending}>
            Delete
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
