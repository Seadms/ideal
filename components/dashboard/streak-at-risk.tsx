'use client'

import { useEffect, useState } from 'react'

interface StreakAtRiskProps {
  currentStreak: number
  todayAlreadyActive: boolean
}

export function StreakAtRisk({ currentStreak, todayAlreadyActive }: StreakAtRiskProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const check = () => {
      const hour = new Date().getHours()
      setVisible(hour >= 20 && currentStreak > 0 && !todayAlreadyActive)
    }
    check()
    const interval = setInterval(check, 60_000)
    return () => clearInterval(interval)
  }, [currentStreak, todayAlreadyActive])

  if (!visible) return null

  return (
    <div className="flex items-center gap-3 rounded-xl border border-orange-500/20 bg-orange-500/5 px-4 py-3 animate-fade-in">
      <span className="text-base shrink-0">⚠️</span>
      <p className="text-sm text-orange-300">
        <span className="font-semibold">{currentStreak}-day streak at risk</span>
        {' '}— complete your MVD habits before midnight
      </p>
    </div>
  )
}
