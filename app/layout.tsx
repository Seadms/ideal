import type { Metadata, Viewport } from 'next'
import './globals.css'
import Link from 'next/link'
import { Zap } from 'lucide-react'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { userStats } from '@/lib/db/schema'
import { ReminderChecker } from '@/components/settings/reminder-checker'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'ideal',
  description: 'Personal gamified habit & task tracker',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'ideal',
  },
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',   // required for env(safe-area-inset-*) to work
  themeColor: '#09090b',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let reminderTime: string | null = null
  try {
    const rows = await db.select({ reminderTime: userStats.reminderTime })
      .from(userStats).where(eq(userStats.id, 1))
    reminderTime = rows[0]?.reminderTime ?? null
  } catch { /* DB not yet initialized on very first load */ }

  return (
    <html lang="en" className="dark">
      <body className="bg-zinc-950 text-zinc-100 min-h-screen">
        <ReminderChecker reminderTime={reminderTime} />
        <div className="mx-auto max-w-2xl px-4">
          <nav className="flex items-center justify-between py-5">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20">
                <Zap size={14} className="text-amber-400" />
              </div>
              <span className="text-sm font-semibold text-zinc-100 tracking-tight">ideal</span>
            </Link>
            <div className="flex items-center gap-1">
              <Link href="/" className="px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 rounded-lg transition-colors">
                Dashboard
              </Link>
              <Link href="/rewards" className="px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 rounded-lg transition-colors">
                Rewards
              </Link>
              <Link href="/history" className="px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 rounded-lg transition-colors">
                History
              </Link>
              <Link href="/settings" className="px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 rounded-lg transition-colors">
                Settings
              </Link>
            </div>
          </nav>
          <main className="pb-20">{children}</main>
        </div>
      </body>
    </html>
  )
}
