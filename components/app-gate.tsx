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
  const [state, setState] = useState<'checking' | 'locked' | 'open'>('checking')
  const [entry, setEntry] = useState('')
  const [wrong, setWrong] = useState(false)

  useEffect(() => {
    // /wife is Kayd's page and stays open. Everything else needs the password.
    const raf = requestAnimationFrame(() => {
      if (pathname.startsWith('/wife') || localStorage.getItem(KEY) === '1') {
        setState('open')
      } else {
        setState('locked')
      }
    })
    return () => cancelAnimationFrame(raf)
  }, [pathname])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (entry === PASSWORD) {
      localStorage.setItem(KEY, '1')
      setState('open')
    } else {
      setWrong(true)
      setEntry('')
    }
  }

  if (state === 'checking') return null
  if (state === 'open') return <>{children}</>

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
