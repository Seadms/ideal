'use client'

import { useEffect, useState } from 'react'

// Apple-style concentric activity rings. Each ring animates from empty to its
// fill on mount via a stroke-dashoffset transition (skipped under
// prefers-reduced-motion through the CSS in globals.css).
//
//   outer  (rose #fa2d6e) — habits completed today
//   middle (lime #c8f542) — points into the current level
//   inner  (cyan #2de8d8) — minimum-viable-day habits

export interface RingValue {
  fraction: number   // 0..1
  color: string
  track: string      // dimmed track color
}

interface ActivityRingsProps {
  rings: [RingValue, RingValue, RingValue]
  size?: number
}

const STROKE = 13
const GAP = 4

export function ActivityRings({ rings, size = 150 }: ActivityRingsProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const center = size / 2

  return (
    <svg
      width={size} height={size} viewBox={`0 0 ${size} ${size}`}
      role="img" aria-label="Daily progress rings"
      className="-rotate-90"
    >
      {rings.map((ring, i) => {
        const radius = center - STROKE / 2 - i * (STROKE + GAP)
        const circumference = 2 * Math.PI * radius
        // Cap just under full so the rounded ends stay visible at 100%
        const fraction = Math.min(Math.max(ring.fraction, 0), 0.999)
        const offset = circumference * (1 - (mounted ? fraction : 0))
        return (
          <g key={i}>
            <circle
              cx={center} cy={center} r={radius}
              fill="none" stroke={ring.track} strokeWidth={STROKE}
            />
            <circle
              cx={center} cy={center} r={radius}
              fill="none" stroke={ring.color} strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="ring-arc"
              style={{ filter: `drop-shadow(0 0 5px ${ring.color}40)` }}
            />
          </g>
        )
      })}
    </svg>
  )
}
