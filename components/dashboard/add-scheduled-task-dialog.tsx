'use client'

import { useState, useTransition } from 'react'
import { createScheduledTask } from '@/lib/actions/scheduled-tasks'
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

export function AddScheduledTaskDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [isPending, startTransition] = useTransition()
  const [recurrenceType, setRecurrenceType] = useState<'once' | 'weekly'>('once')
  const [selectedDays, setSelectedDays] = useState<number[]>([])
  const [form, setForm] = useState({
    title: '', description: '', points: '75', category: 'general', scheduledDate: '',
  })

  const toggleDay = (d: number) =>
    setSelectedDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort((a, b) => a - b))

  const reset = () => {
    setForm({ title: '', description: '', points: '75', category: 'general', scheduledDate: '' })
    setRecurrenceType('once')
    setSelectedDays([])
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    if (recurrenceType === 'once' && !form.scheduledDate) return
    if (recurrenceType === 'weekly' && selectedDays.length === 0) return

    startTransition(async () => {
      await createScheduledTask({
        ...form,
        points: Number(form.points) || 1,
        recurrenceType,
        scheduledDate: recurrenceType === 'once' ? form.scheduledDate : undefined,
        daysOfWeek: recurrenceType === 'weekly' ? selectedDays.join(',') : undefined,
      })
      reset()
      onClose()
    })
  }

  return (
    <Dialog open={open} onClose={() => { reset(); onClose() }} title="New Scheduled Task">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs text-zinc-500 mb-1.5">Title *</label>
          <Input
            placeholder="e.g. Take vitamins"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            autoFocus
          />
        </div>

        <div>
          <label className="block text-xs text-zinc-500 mb-1.5">Description</label>
          <Textarea
            placeholder="Optional notes..."
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

        {/* Schedule type toggle */}
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
                  recurrenceType === type
                    ? 'bg-zinc-700 text-zinc-100'
                    : 'text-zinc-500 hover:text-zinc-300',
                )}
              >
                {type === 'once' ? 'One-time date' : 'Weekly recurring'}
              </button>
            ))}
          </div>
        </div>

        {recurrenceType === 'once' ? (
          <div>
            <label className="block text-xs text-zinc-500 mb-1.5">Date *</label>
            <Input
              type="date"
              value={form.scheduledDate}
              onChange={e => setForm(f => ({ ...f, scheduledDate: e.target.value }))}
            />
          </div>
        ) : (
          <div>
            <label className="block text-xs text-zinc-500 mb-1.5">Days * (pick at least one)</label>
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
          <Button type="button" variant="ghost" onClick={() => { reset(); onClose() }} className="flex-1">
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={
              isPending || !form.title.trim() ||
              (recurrenceType === 'once' && !form.scheduledDate) ||
              (recurrenceType === 'weekly' && selectedDays.length === 0)
            }
            className="flex-1"
          >
            {isPending ? 'Adding...' : 'Add'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
