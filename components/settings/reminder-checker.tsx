'use client'

import { useEffect, useRef } from 'react'

interface ReminderCheckerProps {
  reminderTime: string | null
}

export function ReminderChecker({ reminderTime }: ReminderCheckerProps) {
  const firedRef = useRef<string | null>(null)

  useEffect(() => {
    if (!reminderTime || !('Notification' in window)) return
    if (Notification.permission !== 'granted') return

    const check = () => {
      const now = new Date()
      const current = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      const todayKey = `${now.toDateString()}-${reminderTime}`

      if (current === reminderTime && firedRef.current !== todayKey) {
        firedRef.current = todayKey
        new Notification('ideal', {
          body: "Time to check your habits for today.",
          tag: 'ideal-daily-reminder',
          silent: false,
        })
      }
    }

    check()
    const interval = setInterval(check, 30_000)
    return () => clearInterval(interval)
  }, [reminderTime])

  return null
}
