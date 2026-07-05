'use client'

import { useSyncExternalStore } from 'react'
import { todayString } from './utils'

// Hydration-safe "today": null on the server and for hydration's first paint,
// then the client's local date. Avoids SSR/client mismatches when the server's
// UTC day differs from the user's local day (every evening in the Americas).
const subscribe = () => () => {}
const getServerSnapshot = () => null

export function useToday(): string | null {
  return useSyncExternalStore(subscribe, todayString, getServerSnapshot)
}
