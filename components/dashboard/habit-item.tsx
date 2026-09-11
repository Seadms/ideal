'use client'

import { useState, useTransition } from 'react'
import { completeHabit, uncompleteHabit, moveHabit } from '@/lib/actions/habits'
import type { Habit } from '@/lib/db/schema'
import { cn } from '@/lib/utils'
import { CategoryIcon } from '@/components/ui/category-icon'
import { ChevronUp, ChevronDown, Pencil, Flame } from 'lucide-react'
import { EditHabitDialog } from './edit-habit-dialog'

interface HabitItemProps {
  habit: Habit
  completedToday: boolean
  streakDays: number
  weeklyCount: number
  isFirst?: boolean
  isLast?: boolean
}

export function HabitItem({ habit, completedToday, streakDays, weeklyCount, isFirst, isLast }: HabitItemProps) {
  const [isPending, startTransition] = useTransition()
  const [isMoving, startMoveTransition] = useTransition()
  const [editOpen, setEditOpen] = useState(false)

  const isWeekly = habit.frequencyPerWeek < 7
  const weeklyQuotaMet = weeklyCount >= habit.frequencyPerWeek

  const toggle = () => {
    startTransition(async () => {
      if (completedToday) {
        await uncompleteHabit(habit.id)
      } else {
        await completeHabit(habit.id)
      }
    })
  }

  const move = (dir: 'up' | 'down') => {
    startMoveTransition(async () => {
      await moveHabit(habit.id, dir)
    })
  }

  return (
    <>
      <div className={cn(
        'group relative flex items-center gap-4 rounded-xl border px-4 py-3.5 transition-all duration-200',
        completedToday
          ? 'border-emerald-500/20 bg-emerald-500/5'
          : isWeekly && weeklyQuotaMet
            ? 'border-emerald-500/10 bg-emerald-500/5'
            : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/80',
        (isPending || isMoving) && 'opacity-60',
      )}>
        {/* Checkbox */}
        <button
          onClick={toggle}
          disabled={isPending}
          aria-label={completedToday ? 'Mark incomplete' : 'Mark complete'}
          className={cn(
            'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200',
            completedToday
              ? 'border-emerald-500 bg-emerald-500'
              : 'border-zinc-700 hover:border-zinc-400',
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
            'flex items-center gap-2 text-sm font-medium leading-snug transition-colors',
            completedToday ? 'text-zinc-500' : 'text-zinc-100',
          )}>
            <CategoryIcon category={habit.category} />
            <span className={cn('truncate', completedToday && 'line-through')}>{habit.title}</span>
          </p>
          {habit.description && (
            <p className="text-xs text-zinc-600 mt-0.5 truncate pl-[21px]">{habit.description}</p>
          )}
          {isWeekly && (
            <p className={cn('text-xs mt-0.5 pl-[21px]', weeklyQuotaMet ? 'text-emerald-500/70' : 'text-zinc-500')}>
              {weeklyCount}/{habit.frequencyPerWeek}× this week{weeklyQuotaMet ? ' ✓' : ''}
            </p>
          )}
          {streakDays >= 2 && (
            <p className="flex items-center gap-1 text-xs text-amber-500/70 mt-0.5 pl-[21px]">
              <Flame size={11} className="shrink-0" />
              {streakDays}{isWeekly ? 'w' : 'd'} streak
            </p>
          )}
        </div>

        {/* Right side: controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="hover-reveal flex flex-col">
            <button
              onClick={() => move('up')}
              disabled={isMoving || isFirst}
              aria-label="Move up"
              className="p-1 -m-0.5 text-zinc-600 hover:text-zinc-300 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronUp size={12} />
            </button>
            <button
              onClick={() => move('down')}
              disabled={isMoving || isLast}
              aria-label="Move down"
              className="p-1 -m-0.5 text-zinc-600 hover:text-zinc-300 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronDown size={12} />
            </button>
          </div>
          <button
            onClick={() => setEditOpen(true)}
            className="hover-reveal p-2 -m-1 rounded text-zinc-600 hover:text-zinc-300 transition-colors"
            aria-label="Edit habit"
          >
            <Pencil size={12} />
          </button>
        </div>
      </div>

      <EditHabitDialog habit={habit} open={editOpen} onClose={() => setEditOpen(false)} />
    </>
  )
}
