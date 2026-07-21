'use client'

import { useState, useTransition } from 'react'
import { createWifeTask } from '@/lib/actions/tasks'
import { createWifeReward } from '@/lib/actions/rewards'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Heart } from 'lucide-react'

export default function WifePage() {
  const [task, setTask] = useState('')
  const [points, setPoints] = useState('50')
  const [reward, setReward] = useState('')
  const [cost, setCost] = useState('200')
  const [flash, setFlash] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const done = (msg: string) => { setFlash(msg); setTimeout(() => setFlash(null), 2500) }

  const sendTask = (e: React.FormEvent) => {
    e.preventDefault()
    if (!task.trim()) return
    startTransition(async () => {
      const res = await createWifeTask(task, Number(points) || 1)
      if (res.ok) { setTask(''); setPoints('50'); done("Sent! It's on his phone now.") }
    })
  }

  const addReward = (e: React.FormEvent) => {
    e.preventDefault()
    if (!reward.trim()) return
    startTransition(async () => {
      const res = await createWifeReward(reward, Number(cost) || 1)
      if (res.ok) { setReward(''); setCost('200'); done('Added to his Wife Store.') }
    })
  }

  return (
    <div className="mx-auto max-w-sm px-4 pt-14 pb-16 space-y-10">
      <div className="flex items-center gap-2">
        <Heart className="h-5 w-5 fill-rose-400 text-rose-400" />
        <h1 className="font-display text-2xl font-bold text-zinc-100">For Daniel</h1>
      </div>

      <form onSubmit={sendTask} className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Give him a task</h2>
        <div>
          <label className="mb-1.5 block text-xs text-zinc-500">Task</label>
          <Input value={task} onChange={e => setTask(e.target.value)} placeholder="e.g. Rub my feet" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs text-zinc-500">Good boy points it&apos;s worth</label>
          <Input type="number" min={1} max={500} value={points} onChange={e => setPoints(e.target.value)} className="w-28" />
        </div>
        <Button type="submit" disabled={isPending || !task.trim()} className="w-full">
          {isPending ? 'Sending…' : 'Send task'}
        </Button>
      </form>

      <form onSubmit={addReward} className="space-y-4 border-t border-zinc-800 pt-8">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-sky-300">Add a store reward</h2>
        <p className="text-xs text-zinc-500">Something he can buy with the good boy points he earns.</p>
        <div>
          <label className="mb-1.5 block text-xs text-zinc-500">Reward</label>
          <Input value={reward} onChange={e => setReward(e.target.value)} placeholder="e.g. One free pass to pick the movie" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs text-zinc-500">Cost in good boy points</label>
          <Input type="number" min={1} max={9999} value={cost} onChange={e => setCost(e.target.value)} className="w-28" />
        </div>
        <Button type="submit" variant="outline" disabled={isPending || !reward.trim()} className="w-full">
          {isPending ? 'Adding…' : 'Add reward'}
        </Button>
      </form>

      {flash && <p className="text-center text-sm text-rose-300">{flash}</p>}
    </div>
  )
}
