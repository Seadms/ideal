import type { Metadata, Viewport } from 'next'
import { Space_Grotesk } from 'next/font/google'
import './globals.css'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { userStats } from '@/lib/db/schema'
import { ReminderChecker } from '@/components/settings/reminder-checker'
import { NavBar } from '@/components/nav-bar'

export const dynamic = 'force-dynamic'

// Display face for numerals and titles — geometric, slightly technical,
// carries the gamified feel without a novelty font.
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
})

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
    <html lang="en" className={`dark ${spaceGrotesk.variable}`}>
      <body className="bg-zinc-950 text-zinc-100 min-h-screen">
        <ReminderChecker reminderTime={reminderTime} />
        <div className="mx-auto max-w-2xl px-4">
          <header className="flex items-center justify-between py-5">
            <span className="font-display text-lg font-bold tracking-tight text-zinc-100">
              ideal<span className="text-ring-habit">.</span>
            </span>
            <span className="text-xs text-zinc-600">
              {new Intl.DateTimeFormat('en-US', {
                weekday: 'short', month: 'short', day: 'numeric',
                ...(process.env.NEXT_PUBLIC_APP_TZ ? { timeZone: process.env.NEXT_PUBLIC_APP_TZ } : {}),
              }).format(new Date())}
            </span>
          </header>
          {/* Bottom padding clears the floating glass nav */}
          <main className="pb-32">{children}</main>
        </div>
        <NavBar />
      </body>
    </html>
  )
}
