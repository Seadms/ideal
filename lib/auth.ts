'use server'

import { createHash, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'

// The one shared secret. Set APP_PASSWORD in the environment to change it —
// the fallback is the old client-side value, so a missing env var degrades to
// the previous behaviour rather than locking Daniel out of his own app.
const password = () => process.env.APP_PASSWORD || '27312004'

const COOKIE = 'app-session'
const YEAR = 60 * 60 * 24 * 365

// The cookie carries a hash, not the password itself: forging it still costs
// you the password, but a stolen jar doesn't hand over the plaintext.
const token = () => createHash('sha256').update(password()).digest('hex')

function sameSecret(a: string, b: string) {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

// Called by the password screen. Verifying here instead of in the browser is
// the whole point: the password no longer ships in the JS bundle.
export async function unlockApp(entry: string): Promise<boolean> {
  if (!sameSecret(entry, password())) return false
  const jar = await cookies()
  jar.set(COOKIE, token(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: YEAR,
    path: '/',
  })
  return true
}

export async function isUnlocked(): Promise<boolean> {
  const value = (await cookies()).get(COOKIE)?.value
  return !!value && sameSecret(value, token())
}
