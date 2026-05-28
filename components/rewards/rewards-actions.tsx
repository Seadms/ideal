'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AddRewardDialog } from './add-reward-dialog'

export function RewardsActions() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus size={14} /> Add Reward
      </Button>
      <AddRewardDialog open={open} onClose={() => setOpen(false)} />
    </>
  )
}
