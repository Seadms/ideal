'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AddHabitDialog } from './add-habit-dialog'
import { AddTaskDialog } from './add-task-dialog'

export function DashboardActions() {
  const [habitOpen, setHabitOpen] = useState(false)
  const [taskOpen, setTaskOpen] = useState(false)

  return (
    <>
      <div className="flex gap-3">
        <Button variant="outline" size="sm" onClick={() => setHabitOpen(true)} className="flex-1">
          <Plus size={14} /> Add Habit
        </Button>
        <Button variant="outline" size="sm" onClick={() => setTaskOpen(true)} className="flex-1">
          <Plus size={14} /> Add Task
        </Button>
      </div>

      <AddHabitDialog open={habitOpen} onClose={() => setHabitOpen(false)} />
      <AddTaskDialog open={taskOpen} onClose={() => setTaskOpen(false)} />
    </>
  )
}
