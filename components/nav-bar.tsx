'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, GraduationCap, Dumbbell, Salad,
  TrendingUp, Gift, CalendarClock, Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const LINKS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/school', label: 'School', icon: GraduationCap },
  { href: '/gym', label: 'Gym', icon: Dumbbell },
  { href: '/diet', label: 'Diet', icon: Salad },
  { href: '/progress', label: 'Progress', icon: TrendingUp },
  { href: '/rewards', label: 'Rewards', icon: Gift },
  { href: '/history', label: 'History', icon: CalendarClock },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function NavBar() {
  const pathname = usePathname()

  return (
    <nav className="flex items-center gap-0.5 py-4 overflow-x-auto scrollbar-none">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap',
              active
                ? 'text-zinc-100 bg-zinc-800'
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60',
            )}
          >
            <Icon className={cn('h-3.5 w-3.5', active ? 'text-zinc-300' : 'text-zinc-500')} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
