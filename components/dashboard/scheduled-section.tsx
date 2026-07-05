'use client'

import { useState } from 'react'

import type { ScheduledTask } from '@/lib/db/schema'
import { ScheduledTaskItem } from './scheduled-task-item'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { CategoryIcon } from '@/components/ui/category-icon'
import { CalendarDays, Pencil, Repeat2 } from 'lucide-react'
import { EditScheduledTaskDialog } from './edit-scheduled-task-dialog'

interface Props {
  allTasks: ScheduledTask[]
  pending: ScheduledTask[]
  completed: ScheduledTask[]
  completedIds: string[]
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function scheduleLabel(task: ScheduledTask): string {
  if (task.recurrenceType === 'once') return task.scheduledDate ?? ''
  const days = (task.daysOfWeek ?? '').split(',').map(Number).filter(n => !isNaN(n))
  if (days.length === 7) return 'Every day'
  return days.map(d => DAY_NAMES[d]).join(', ')
}

function ReadonlyRow({ task }: { task: ScheduledTask }) {
  const [editOpen, setEditOpen] = useState(false)
  const isWeekly = task.recurrenceType === 'weekly'
  return (
    <>
      <div className="group flex items-center gap-4 rounded-xl border border-zinc-800/40 bg-zinc-900/20 px-4 py-3 opacity-40 hover:opacity-70 transition-opacity">
        <div className={cn(
          'flex h-5 w-5 shrink-0 items-center justify-center border-2 border-zinc-800',
          isWeekly ? 'rounded-full' : 'rounded',
        )} />
        <div className="flex-1 min-w-0">
          <p className="flex items-center gap-2 text-sm font-medium text-zinc-400">
            <CategoryIcon category={task.category} className="text-zinc-600" />
            <span className="truncate">{task.title}</span>
          </p>
          <p className="text-xs text-zinc-600 mt-0.5 flex items-center gap-1">
            {isWeekly ? <Repeat2 size={10} className="shrink-0" /> : <CalendarDays size={10} className="shrink-0" />}
            {scheduleLabel(task)}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="muted">+{task.points}</Badge>
          <button
            onClick={() => setEditOpen(true)}
            className="opacity-0 group-hover:opacity-100 p-1 rounded text-zinc-600 hover:text-zinc-300 transition-all"
          >
            <Pencil size={12} />
          </button>
        </div>
      </div>
      <EditScheduledTaskDialog task={task} open={editOpen} onClose={() => setEditOpen(false)} />
    </>
  )
}

export function ScheduledSection({ allTasks, pending, completed, completedIds }: Props) {
  const [showAll, setShowAll] = useState(false)

  const todayIds = new Set([...pending.map(t => t.id), ...completed.map(t => t.id)])
  const notToday = allTasks.filter(t => !todayIds.has(t.id))
  const todayCount = pending.length + completed.length

  if (allTasks.length === 0) return null

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Scheduled</h2>
        <div className="flex items-center gap-3">
          {!showAll && todayCount > 0 && (
            <span className="text-xs text-zinc-600">{completed.length} / {todayCount}</span>
          )}
          <button
            onClick={() => setShowAll(s => !s)}
            className="text-xs text-zinc-600 hover:text-zinc-300 transition-colors underline underline-offset-2 decoration-dotted"
          >
            {showAll ? 'today only' : `all ${allTasks.length}`}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {todayCount === 0 && !showAll && (
          <p className="text-sm text-zinc-600 py-4 text-center">Nothing scheduled for today — tap "all {allTasks.length}" to see your full schedule.</p>
        )}

        {/* Today's tasks — fully interactive */}
        {pending.map(t => <ScheduledTaskItem key={t.id} task={t} completedToday={false} />)}
        {completed.map(t => <ScheduledTaskItem key={t.id} task={t} completedToday={true} />)}

        {/* Rest of schedule — readonly, dimmed */}
        {showAll && notToday.map(t => <ReadonlyRow key={t.id} task={t} />)}
      </div>
    </section>
  )
}
