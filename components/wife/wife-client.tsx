'use client'

import { useState, useTransition } from 'react'
import { createWifeTask } from '@/lib/actions/tasks'
import { createWifeReward, updateReward, deleteReward, resolveClaim } from '@/lib/actions/rewards'
import { savePushSubscription } from '@/lib/actions/push'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Heart, Bell, Trash2 } from 'lucide-react'

interface StoreReward { id: string; title: string; cost: number }
interface Claim { id: string; title: string; cost: number }

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from([...atob(b)].map(c => c.charCodeAt(0)))
}

export function WifeClient({ rewards, claims, vapidPublicKey }: { rewards: StoreReward[]; claims: Claim[]; vapidPublicKey: string }) {
  const [task, setTask] = useState('')
  const [points, setPoints] = useState('50')
  const [reward, setReward] = useState('')
  const [cost, setCost] = useState('200')
  const [flash, setFlash] = useState<string | null>(null)
  const [pushOn, setPushOn] = useState(false)
  const [isPending, startTransition] = useTransition()

  const done = (msg: string) => { setFlash(msg); setTimeout(() => setFlash(null), 2500) }

  const sendTask = (e: React.FormEvent) => {
    e.preventDefault()
    if (!task.trim()) return
    startTransition(async () => {
      const res = await createWifeTask(task, Number(points) || 1)
      if (res.ok) { setTask(''); setPoints('50'); done("Sent! It's on his phone.") }
    })
  }

  const addReward = (e: React.FormEvent) => {
    e.preventDefault()
    if (!reward.trim()) return
    startTransition(async () => {
      const res = await createWifeReward(reward, Number(cost) || 1)
      if (res.ok) { setReward(''); setCost('200'); done('Added to his store.') }
    })
  }

  const enablePush = async () => {
    if (!vapidPublicKey || !('serviceWorker' in navigator)) return
    try {
      const reg = await navigator.serviceWorker.ready
      if ((await Notification.requestPermission()) !== 'granted') return
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      })
      await savePushSubscription(sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }, 'wife')
      setPushOn(true)
      done("You'll be notified when he claims a reward.")
    } catch { done('Could not enable notifications.') }
  }

  return (
    <div className="mx-auto max-w-sm px-4 pt-14 pb-16 space-y-9">
      <div className="flex items-center gap-2">
        <Heart className="h-5 w-5 fill-rose-400 text-rose-400" />
        <h1 className="font-display text-2xl font-bold text-zinc-100">For Daniel</h1>
      </div>

      <Button variant="outline" size="sm" onClick={enablePush} disabled={pushOn} className="w-full">
        <Bell size={13} /> {pushOn ? 'Notifications on' : 'Notify me when he claims a reward'}
      </Button>

      {claims.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-sky-300">He wants to claim</h2>
          {claims.map(c => <ClaimRow key={c.id} claim={c} onDone={done} />)}
        </div>
      )}

      <form onSubmit={sendTask} className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Give him a task</h2>
        <Input value={task} onChange={e => setTask(e.target.value)} placeholder="e.g. Rub my feet" />
        <div className="flex items-center gap-3">
          <Input type="number" min={1} max={500} value={points} onChange={e => setPoints(e.target.value)} className="w-24" />
          <span className="text-xs text-zinc-500">good boy points</span>
        </div>
        <Button type="submit" disabled={isPending || !task.trim()} className="w-full">Send task</Button>
      </form>

      <form onSubmit={addReward} className="space-y-4 border-t border-zinc-800 pt-8">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-sky-300">Store rewards</h2>
        <p className="text-xs text-zinc-500">Things he can buy with the good boy points he earns. You set the prices.</p>

        {rewards.length > 0 && (
          <div className="space-y-2">
            {rewards.map(r => <StoreRow key={r.id} reward={r} onChange={done} />)}
          </div>
        )}

        <div className="space-y-3 pt-1">
          <Input value={reward} onChange={e => setReward(e.target.value)} placeholder="e.g. Pick the movie tonight" />
          <div className="flex items-center gap-3">
            <Input type="number" min={1} max={9999} value={cost} onChange={e => setCost(e.target.value)} className="w-24" />
            <span className="text-xs text-zinc-500">good boy points</span>
          </div>
          <Button type="submit" variant="outline" disabled={isPending || !reward.trim()} className="w-full">Add reward</Button>
        </div>
      </form>

      {flash && <p className="text-center text-sm text-rose-300">{flash}</p>}
    </div>
  )
}

// A pending claim: accept or decline his reward request.
function ClaimRow({ claim, onDone }: { claim: Claim; onDone: (m: string) => void }) {
  const [isPending, startTransition] = useTransition()
  const decide = (decision: 'accept' | 'decline') =>
    startTransition(async () => {
      await resolveClaim(claim.id, decision)
      onDone(decision === 'accept' ? 'Accepted.' : 'Declined, points refunded.')
    })
  return (
    <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 px-3 py-3">
      <p className="text-sm text-zinc-200">{claim.title}</p>
      <p className="text-xs text-zinc-500">{claim.cost} good boy points</p>
      <div className="mt-2.5 flex gap-2">
        <Button size="sm" onClick={() => decide('accept')} disabled={isPending} className="flex-1">Accept</Button>
        <Button size="sm" variant="ghost" onClick={() => decide('decline')} disabled={isPending} className="flex-1">Decline</Button>
      </div>
    </div>
  )
}

// One store reward: editable price + delete.
function StoreRow({ reward, onChange }: { reward: StoreReward; onChange: (m: string) => void }) {
  const [price, setPrice] = useState(String(reward.cost))
  const [isPending, startTransition] = useTransition()

  const savePrice = () => {
    const c = Math.max(1, Math.min(9999, Number(price) || 1))
    if (c === reward.cost) return
    startTransition(async () => { await updateReward(reward.id, { cost: c }); onChange('Price updated.') })
  }
  const remove = () => startTransition(async () => { await deleteReward(reward.id); onChange('Removed.') })

  return (
    <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2">
      <span className="flex-1 truncate text-sm text-zinc-200">{reward.title}</span>
      <Input
        type="number" min={1} max={9999} value={price}
        onChange={e => setPrice(e.target.value)} onBlur={savePrice}
        className="w-20 text-right" aria-label={`Price for ${reward.title}`}
      />
      <button onClick={remove} disabled={isPending} aria-label={`Remove ${reward.title}`}
        className="p-1 text-zinc-600 hover:text-rose-400 transition-colors">
        <Trash2 size={14} />
      </button>
    </div>
  )
}
