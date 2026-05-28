'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AddHabitDialog } from './add-habit-dialog'
import { AddTaskDialog } from './add-task-dialog'
import { AddScheduledTaskDialog } from './add-scheduled-task-dialog'

export function DashboardActions() {
  const [habitOpen, setHabitOpen] = useState(false)
  const [taskOpen, setTaskOpen] = useState(false)
  const [scheduledOpen, setScheduledOpen] = useState(false)

  return (
    <>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => setHabitOpen(true)} className="flex-1">
          <Plus size={14} /> Habit
        </Button>
        <Button variant="outline" size="sm" onClick={() => setScheduledOpen(true)} className="flex-1">
          <Plus size={14} /> Scheduled
        </Button>
        <Button variant="outline" size="sm" onClick={() => setTaskOpen(true)} className="flex-1">
          <Plus size={14} /> Task
        </Button>
      </div>

      <AddHabitDialog open={habitOpen} onClose={() => setHabitOpen(false)} />
      <AddScheduledTaskDialog open={scheduledOpen} onClose={() => setScheduledOpen(false)} />
      <AddTaskDialog open={taskOpen} onClose={() => setTaskOpen(false)} />
    </>
  )
}
