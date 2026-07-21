'use client'

import { useState, useTransition } from 'react'
import { createWifeTask } from '@/lib/actions/tasks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Heart } from 'lucide-react'

export default function WifePage() {
  const [title, setTitle] = useState('')
  const [points, setPoints] = useState('50')
  const [sent, setSent] = useState(false)
  const [isPending, startTransition] = useTransition()

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    startTransition(async () => {
      const res = await createWifeTask(title, Number(points) || 1)
      if (res.ok) {
        setTitle('')
        setPoints('50')
        setSent(true)
        setTimeout(() => setSent(false), 2500)
      }
    })
  }

  return (
    <div className="mx-auto max-w-sm px-4 pt-16">
      <div className="mb-8 flex items-center gap-2">
        <Heart className="h-5 w-5 fill-rose-400 text-rose-400" />
        <h1 className="font-display text-2xl font-bold text-zinc-100">Give Daniel a task</h1>
      </div>

      <form onSubmit={submit} className="space-y-5">
        <div>
          <label className="mb-1.5 block text-xs text-zinc-500">Task</label>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Rub my feet" autoFocus />
        </div>
        <div>
          <label className="mb-1.5 block text-xs text-zinc-500">Good boy points</label>
          <Input type="number" min={1} max={500} value={points} onChange={e => setPoints(e.target.value)} className="w-28" />
        </div>
        <Button type="submit" disabled={isPending || !title.trim()} className="w-full">
          {isPending ? 'Sending…' : 'Send it'}
        </Button>
        {sent && <p className="text-center text-sm text-rose-300">Sent! It&apos;s on his phone now.</p>}
      </form>
    </div>
  )
}
