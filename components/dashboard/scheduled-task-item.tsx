'use client'

import { useState, useTransition } from 'react'
import { useLevelUp } from './use-level-up'
import { completeScheduledTask, uncompleteScheduledTask } from '@/lib/actions/scheduled-tasks'
import type { ScheduledTask } from '@/lib/db/schema'
import { cn } from '@/lib/utils'
import { CategoryIcon } from '@/components/ui/category-icon'
import { Badge } from '@/components/ui/badge'
import { Pencil, Repeat2, CalendarDays, Star } from 'lucide-react'
import { EditScheduledTaskDialog } from './edit-scheduled-task-dialog'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function scheduleLabel(task: ScheduledTask): string {
  if (task.recurrenceType === 'once') {
    return task.scheduledDate ?? ''
  }
  const days = (task.daysOfWeek ?? '').split(',').map(Number).filter(n => !isNaN(n))
  if (days.length === 7) return 'Every day'
  if (days.length === 0) return 'Weekly'
  return `Every ${days.map(d => DAY_NAMES[d]).join(', ')}`
}

interface ScheduledTaskItemProps {
  task: ScheduledTask
  completedToday: boolean
}

export function ScheduledTaskItem({ task, completedToday }: ScheduledTaskItemProps) {
  const [isPending, startTransition] = useTransition()
  const [editOpen, setEditOpen] = useState(false)
  const { levelUpLevel, triggerLevelUp } = useLevelUp()

  const toggle = () => {
    startTransition(async () => {
      if (completedToday) {
        await uncompleteScheduledTask(task.id)
      } else {
        const result = await completeScheduledTask(task.id)
        if (result.leveledUp) triggerLevelUp(result.newLevel)
      }
    })
  }

  const isWeekly = task.recurrenceType === 'weekly'

  return (
    <>
      <div className={cn(
        'group relative flex items-center gap-4 rounded-xl border px-4 py-3.5 transition-all duration-200',
        completedToday
          ? 'border-emerald-500/20 bg-emerald-500/5'
          : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/80',
        isPending && 'opacity-60',
      )}>
        {/* Checkbox */}
        <button
          onClick={toggle}
          disabled={isPending}
          aria-label={completedToday ? 'Mark incomplete' : 'Mark complete'}
          className={cn(
            'flex h-5 w-5 shrink-0 items-center justify-center border-2 transition-all duration-200',
            isWeekly ? 'rounded-full' : 'rounded',
            completedToday ? 'border-emerald-500 bg-emerald-500' : 'border-zinc-700 hover:border-zinc-400',
          )}
        >
          {completedToday && (
            <svg className="h-3 w-3 text-black" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={toggle}>
          <p className={cn(
            'flex items-center gap-2 text-sm font-medium leading-snug',
            completedToday ? 'text-zinc-500' : 'text-zinc-100',
          )}>
            <CategoryIcon category={task.category} />
            <span className={cn('truncate', completedToday && 'line-through')}>{task.title}</span>
          </p>
          {task.description && (
            <p className="text-xs text-zinc-600 mt-0.5 truncate pl-[21px]">{task.description}</p>
          )}
          <p className={cn('text-xs mt-0.5 flex items-center gap-1 pl-[21px]',
            completedToday ? 'text-zinc-600' : 'text-zinc-500',
          )}>
            {isWeekly
              ? <Repeat2 size={10} className="shrink-0" />
              : <CalendarDays size={10} className="shrink-0" />
            }
            {scheduleLabel(task)}
          </p>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant={completedToday ? 'emerald' : 'gold'}>+{task.points}</Badge>
          <button
            onClick={() => setEditOpen(true)}
            className="hover-reveal p-2 -m-1 rounded text-zinc-600 hover:text-zinc-300 transition-all"
            aria-label="Edit scheduled task"
          >
            <Pencil size={12} />
          </button>
        </div>

        {/* Level-up overlay */}
        {levelUpLevel && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-violet-950/90 border border-violet-500/40 pointer-events-none animate-fade-in">
            <p className="flex items-center gap-1.5 text-violet-200 font-semibold text-sm tracking-wide">
              <Star size={14} className="shrink-0 fill-current" />
              Level {levelUpLevel} unlocked
            </p>
          </div>
        )}
      </div>

      <EditScheduledTaskDialog task={task} open={editOpen} onClose={() => setEditOpen(false)} />
    </>
  )
}
