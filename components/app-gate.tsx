'use client'

import { useEffect, useState, useTransition } from 'react'
import { usePathname } from 'next/navigation'
import { Lock } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { unlockApp } from '@/lib/auth'

// The password is checked on the server (lib/auth.ts), which sets an httpOnly
// cookie — that cookie is what actually guards the backup routes. This flag is
// only so an unlocked device skips the screen; it grants nothing on its own.
// Bumped: devices unlocked under the old client-only check have no cookie, so
// they re-enter the password once to get a real session.
const KEY = 'app-unlocked-v2'

export function AppGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const [unlocked, setUnlocked] = useState(false)
  const [entry, setEntry] = useState('')
  const [wrong, setWrong] = useState(false)
  const [checking, startCheck] = useTransition()

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
    startCheck(async () => {
      if (await unlockApp(entry)) {
        localStorage.setItem(KEY, '1')
        setUnlocked(true)
      } else {
        setWrong(true)
        setEntry('')
      }
    })
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
        <Button type="submit" className="w-full" disabled={!entry || checking}>
          {checking ? 'Checking...' : 'Unlock'}
        </Button>
        {wrong && <p className="text-center text-xs text-rose-400">Wrong password.</p>}
      </form>
    </div>
  )
}
