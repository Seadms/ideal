'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Lock } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

// ponytail: soft client-side lock — keeps Kayd (and casual snoopers) out of
// Daniel's app, not a real auth boundary (the password ships in the bundle and
// the data is reachable via the API). Upgrade to a server-verified session if
// this ever needs to resist someone technical.
const PASSWORD = '27312004'
const KEY = 'app-unlocked'

export function AppGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const [unlocked, setUnlocked] = useState(false)
  const [entry, setEntry] = useState('')
  const [wrong, setWrong] = useState(false)

  useEffect(() => {
    // Reading localStorage is client-only, so it happens after mount. A plain
    // setState here (not rAF) is deliberate: rAF is paused in backgrounded tabs
    // and would leave the whole app blank on a throttled PWA launch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
     
    setUnlocked(pathname.startsWith('/wife') || localStorage.getItem(KEY) === '1')
  }, [pathname])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (entry === PASSWORD) {
      localStorage.setItem(KEY, '1')
      setUnlocked(true)
    } else {
      setWrong(true)
      setEntry('')
    }
  }

  if (!mounted) return null
  if (unlocked) return <>{children}</>

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-zinc-950 px-6">
      <div className="mb-8 flex items-center gap-2">
        <span className="font-display text-2xl font-bold tracking-tight text-zinc-100">
          ideal<span className="text-ring-habit">.</span>
        </span>
      </div>
      <form onSubmit={submit} className="w-full max-w-xs space-y-3">
        <div className="flex items-center gap-2 text-zinc-500">
          <Lock size={13} />
          <span className="text-xs">Enter password</span>
        </div>
        <Input
          type="password" inputMode="numeric" autoFocus
          value={entry}
          onChange={e => { setEntry(e.target.value); setWrong(false) }}
          placeholder="••••••••"
        />
        <Button type="submit" className="w-full" disabled={!entry}>Unlock</Button>
        {wrong && <p className="text-center text-xs text-rose-400">Wrong password.</p>}
      </form>
    </div>
  )
}
