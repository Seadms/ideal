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

// Floating liquid-glass tab bar. Icon-only tabs; the active one becomes a
// white pill (the one high-contrast moment in the chrome).
export function NavBar() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[max(env(safe-area-inset-bottom),12px)]"
    >
      <div className="glass-nav flex items-center gap-0 sm:gap-1 rounded-full p-1 sm:p-2">
        {LINKS.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              aria-label={label}
              title={label}
              className={cn(
                'flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400',
                active
                  ? 'bg-zinc-100 text-zinc-950 shadow-lg'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/5',
              )}
            >
              <Icon className="h-[19px] w-[19px] sm:h-[22px] sm:w-[22px]" strokeWidth={active ? 2.4 : 2} />
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
