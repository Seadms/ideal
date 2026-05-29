'use client'

import { useState } from 'react'

export function useLevelUp() {
  const [levelUpLevel, setLevelUpLevel] = useState<number | null>(null)

  function triggerLevelUp(level: number) {
    setLevelUpLevel(level)
    setTimeout(() => setLevelUpLevel(null), 3500)
  }

  return { levelUpLevel, triggerLevelUp }
}
