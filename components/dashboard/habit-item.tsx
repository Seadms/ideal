'use client'

import { useState, useTransition } from 'react'
import { useLevelUp } from './use-level-up'
import { completeHabit, uncompleteHabit, moveHabit } from '@/lib/actions/habits'
import type { Habit } from '@/lib/db/schema'
import { categoryEmoji, cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { ChevronUp, ChevronDown, Pencil } from 'lucide-react'
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
  const { levelUpLevel, triggerLevelUp } = useLevelUp()

  const isWeekly = habit.frequencyPerWeek < 7
  const weeklyQuotaMet = weeklyCount >= habit.frequencyPerWeek

  const toggle = () => {
    startTransition(async () => {
      if (completedToday) {
        await uncompleteHabit(habit.id)
      } else {
        const result = await completeHabit(habit.id)
        if (result.leveledUp) triggerLevelUp(result.newLevel)
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
            'text-sm font-medium leading-snug truncate transition-colors',
            completedToday ? 'text-zinc-500 line-through' : 'text-zinc-100',
          )}>
            {categoryEmoji(habit.category)} {habit.title}
          </p>
          {habit.description && (
            <p className="text-xs text-zinc-600 mt-0.5 truncate">{habit.description}</p>
          )}
          {isWeekly && (
            <p className={cn('text-xs mt-0.5', weeklyQuotaMet ? 'text-emerald-500/70' : 'text-zinc-500')}>
              {weeklyCount}/{habit.frequencyPerWeek}× this week{weeklyQuotaMet ? ' ✓' : ''}
            </p>
          )}
          {streakDays >= 2 && (
            <p className="text-xs text-amber-500/70 mt-0.5">
              🔥 {streakDays}{isWeekly ? 'w' : 'd'} streak
            </p>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Badge variant={completedToday ? 'emerald' : 'gold'}>+{habit.points}</Badge>
          {habit.isMinimumViable && (
            <Badge variant="muted" className="hidden sm:inline-flex">MVD</Badge>
          )}
          {/* Reorder chevrons */}
          <div className="opacity-0 group-hover:opacity-100 flex flex-col transition-opacity">
            <button
              onClick={() => move('up')}
              disabled={isMoving || isFirst}
              aria-label="Move up"
              className="p-0.5 text-zinc-600 hover:text-zinc-300 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronUp size={12} />
            </button>
            <button
              onClick={() => move('down')}
              disabled={isMoving || isLast}
              aria-label="Move down"
              className="p-0.5 text-zinc-600 hover:text-zinc-300 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronDown size={12} />
            </button>
          </div>
          {/* Edit */}
          <button
            onClick={() => setEditOpen(true)}
            className="opacity-0 group-hover:opacity-100 p-1 rounded text-zinc-600 hover:text-zinc-300 transition-all"
            aria-label="Edit habit"
          >
            <Pencil size={12} />
          </button>
        </div>

        {/* Level-up overlay */}
        {levelUpLevel && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-violet-950/90 border border-violet-500/40 pointer-events-none animate-fade-in">
            <p className="text-violet-200 font-semibold text-sm tracking-wide">
              ⭐ Level {levelUpLevel} unlocked
            </p>
          </div>
        )}
      </div>

      <EditHabitDialog habit={habit} open={editOpen} onClose={() => setEditOpen(false)} />
    </>
  )
}
