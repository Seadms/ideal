'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const LINKS = [
  { href: '/', label: 'Dashboard' },
  { href: '/gym', label: 'Gym' },
  { href: '/diet', label: 'Diet' },
  { href: '/rewards', label: 'Rewards' },
  { href: '/history', label: 'History' },
  { href: '/settings', label: 'Settings' },
]

export function NavBar() {
  const pathname = usePathname()

  return (
    <nav className="flex items-center gap-0.5 py-4 overflow-x-auto">
      {LINKS.map(({ href, label }) => {
        const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap',
              active
                ? 'text-zinc-100 bg-zinc-800'
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60',
            )}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
