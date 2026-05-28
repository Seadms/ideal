import { eq } from 'drizzle-orm'
import { db, initDb } from '@/lib/db'
import { habits, userStats } from '@/lib/db/schema'
import { SettingsClient } from '@/components/settings/settings-client'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  await initDb()

  const [statsRows, archivedHabits] = await Promise.all([
    db.select().from(userStats).where(eq(userStats.id, 1)),
    db.select({ id: habits.id, title: habits.title, category: habits.category })
      .from(habits)
      .where(eq(habits.isActive, false)),
  ])

  const stats = statsRows[0]

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-lg font-semibold text-zinc-100">Settings</h1>
        <p className="text-xs text-zinc-500 mt-0.5">Preferences and data management</p>
      </div>
      <SettingsClient
        reminderTime={stats?.reminderTime ?? null}
        streakFreezeCount={stats?.streakFreezeCount ?? 0}
        archivedHabits={archivedHabits}
        vapidPublicKey={process.env.VAPID_PUBLIC_KEY ?? ''}
      />
    </div>
  )
}
