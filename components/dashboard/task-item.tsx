'use client'

import { useState, useTransition } from 'react'
import { completeTask, uncompleteTask } from '@/lib/actions/tasks'
import type { Task } from '@/lib/db/schema'
import { cn } from '@/lib/utils'
import { CategoryIcon } from '@/components/ui/category-icon'
import { useToday } from '@/lib/use-today'
import { Badge } from '@/components/ui/badge'
import { Pencil } from 'lucide-react'
import { EditTaskDialog } from './edit-task-dialog'

interface TaskItemProps {
  task: Task
}

export function TaskItem({ task }: TaskItemProps) {
  const [isPending, startTransition] = useTransition()
  const [editOpen, setEditOpen] = useState(false)

  // null during SSR/hydration, so overdue/due-today styling only applies once
  // the client's local day is known — the server's UTC day can differ.
  const today = useToday()
  const isOverdue = !!today && !!task.dueDate && !task.isCompleted && task.dueDate < today
  const isDueToday = !!today && !!task.dueDate && !task.isCompleted && task.dueDate === today

  const toggle = () => {
    startTransition(async () => {
      if (task.isCompleted) {
        await uncompleteTask(task.id)
      } else {
        await completeTask(task.id)
      }
    })
  }

  return (
    <>
      <div className={cn(
        'group relative flex items-center gap-4 rounded-xl border px-4 py-3.5 transition-all duration-200',
        task.isCompleted
          ? 'border-zinc-800/40 bg-zinc-900/20 opacity-60'
          : isOverdue
            ? 'border-rose-500/20 bg-rose-500/5 hover:border-rose-500/30'
            : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/80',
        isPending && 'opacity-40',
      )}>
        {/* Checkbox */}
        <button
          onClick={toggle}
          disabled={isPending}
          aria-label={task.isCompleted ? 'Mark incomplete' : 'Mark complete'}
          className={cn(
            'flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all duration-200',
            task.isCompleted
              ? 'border-zinc-600 bg-zinc-700'
              : isOverdue
                ? 'border-rose-500/60 hover:border-rose-400'
                : 'border-zinc-700 hover:border-zinc-400',
          )}
        >
          {task.isCompleted && (
            <svg className="h-3 w-3 text-zinc-300" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={toggle}>
          <p className={cn(
            'flex items-center gap-2 text-sm font-medium leading-snug',
            task.isCompleted ? 'text-zinc-500' : 'text-zinc-100',
          )}>
            <CategoryIcon category={task.category} />
            <span className={cn('truncate', task.isCompleted && 'line-through')}>{task.title}</span>
          </p>
          {task.description && (
            <p className="text-xs text-zinc-600 mt-0.5 truncate pl-[21px]">{task.description}</p>
          )}
          {task.dueDate && !task.isCompleted && (
            <p className={cn(
              'text-xs mt-0.5 pl-[21px]',
              isOverdue ? 'text-rose-400' : isDueToday ? 'text-amber-400' : 'text-zinc-600',
            )}>
              {isOverdue ? 'Overdue · ' : isDueToday ? 'Due today · ' : 'Due '}
              {task.dueDate}
            </p>
          )}
        </div>

        {/* Right side: controls, then the good-boy badge on wife tasks only —
            his own tasks carry no points. Wife tasks are hers to edit. */}
        <div className="flex items-center gap-1.5 shrink-0">
          {task.source !== 'wife' && (
            <button
              onClick={() => setEditOpen(true)}
              className="hover-reveal p-2 -m-1 rounded text-zinc-600 hover:text-zinc-300 transition-colors"
              aria-label="Edit task"
            >
              <Pencil size={12} />
            </button>
          )}
          {task.source === 'wife' && (
            <Badge variant={task.isCompleted ? 'muted' : 'wife'} className="min-w-[52px] justify-center">
              +{task.points}
            </Badge>
          )}
        </div>
      </div>

      <EditTaskDialog task={task} open={editOpen} onClose={() => setEditOpen(false)} />
    </>
  )
}
