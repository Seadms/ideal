'use client'

import { useState, useTransition } from 'react'
import { updateScheduledTask, deleteScheduledTask } from '@/lib/actions/scheduled-tasks'
import type { ScheduledTask } from '@/lib/db/schema'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input, Textarea, Select } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const CATEGORIES = ['general', 'fitness', 'coding', 'project', 'productivity', 'growth', 'social', 'chore', 'creative', 'hobby', 'self-care']
const DAYS = [
  { label: 'Sun', value: 0 },
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
]

export function EditScheduledTaskDialog({ task, open, onClose }: { task: ScheduledTask; open: boolean; onClose: () => void }) {
  const [isPending, startTransition] = useTransition()
  const [recurrenceType, setRecurrenceType] = useState<'once' | 'weekly'>(task.recurrenceType as 'once' | 'weekly')
  const [selectedDays, setSelectedDays] = useState<number[]>(
    task.daysOfWeek ? task.daysOfWeek.split(',').map(Number).filter(n => !isNaN(n)) : []
  )
  const [form, setForm] = useState({
    title: task.title,
    description: task.description ?? '',
    points: String(task.points),
    category: task.category,
    scheduledDate: task.scheduledDate ?? '',
  })

  const toggleDay = (d: number) =>
    setSelectedDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort((a, b) => a - b))

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    startTransition(async () => {
      await updateScheduledTask(task.id, {
        ...form,
        points: Number(form.points) || 1,
        recurrenceType,
        scheduledDate: recurrenceType === 'once' ? form.scheduledDate : undefined,
        daysOfWeek: recurrenceType === 'weekly' ? selectedDays.join(',') : undefined,
      })
      onClose()
    })
  }

  const handleDelete = () => {
    startTransition(async () => {
      await deleteScheduledTask(task.id)
      onClose()
    })
  }

  return (
    <Dialog open={open} onClose={onClose} title="Edit Scheduled Task">
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-xs text-zinc-500 mb-1.5">Title *</label>
          <Input
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            autoFocus
          />
        </div>

        <div>
          <label className="block text-xs text-zinc-500 mb-1.5">Description</label>
          <Textarea
            rows={2}
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-zinc-500 mb-1.5">Points</label>
            <Input
              type="number" min={1} max={2000}
              value={form.points}
              onChange={e => setForm(f => ({ ...f, points: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1.5">Category</label>
            <Select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
          </div>
        </div>

        <div>
          <label className="block text-xs text-zinc-500 mb-1.5">Schedule</label>
          <div className="flex rounded-lg border border-zinc-700 overflow-hidden">
            {(['once', 'weekly'] as const).map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setRecurrenceType(type)}
                className={cn(
                  'flex-1 py-1.5 text-xs font-medium transition-colors',
                  recurrenceType === type ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300',
                )}
              >
                {type === 'once' ? 'One-time date' : 'Weekly recurring'}
              </button>
            ))}
          </div>
        </div>

        {recurrenceType === 'once' ? (
          <div>
            <label className="block text-xs text-zinc-500 mb-1.5">Date</label>
            <Input
              type="date"
              value={form.scheduledDate}
              onChange={e => setForm(f => ({ ...f, scheduledDate: e.target.value }))}
            />
          </div>
        ) : (
          <div>
            <label className="block text-xs text-zinc-500 mb-1.5">Days</label>
            <div className="flex gap-1.5 flex-wrap">
              {DAYS.map(d => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => toggleDay(d.value)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors',
                    selectedDays.includes(d.value)
                      ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                      : 'border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600',
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <Button type="button" variant="ghost" size="sm" onClick={handleDelete} disabled={isPending}
            className="text-rose-500 hover:text-rose-400 hover:bg-rose-500/10">
            Delete
          </Button>
          <Button type="button" variant="ghost" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" disabled={isPending || !form.title.trim()} className="flex-1">
            {isPending ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
