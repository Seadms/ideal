'use client'

import { useState, useTransition, useEffect } from 'react'
import { setReminderTime } from '@/lib/actions/settings'
import { updateHabit } from '@/lib/actions/habits'
import { savePushSubscription, removePushSubscription } from '@/lib/actions/push'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Bell, Download, Upload, Archive, Shield, Smartphone } from 'lucide-react'
import { categoryEmoji } from '@/lib/utils'

interface ArchivedHabit {
  id: string
  title: string
  category: string
}

interface SettingsClientProps {
  reminderTime: string | null
  streakFreezeCount: number
  archivedHabits: ArchivedHabit[]
  vapidPublicKey: string
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

function ArchivedHabitRow({ habit }: { habit: ArchivedHabit }) {
  const [isPending, startTransition] = useTransition()
  const restore = () => {
    startTransition(async () => {
      await updateHabit(habit.id, { isActive: true })
    })
  }
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <p className="text-sm text-zinc-400">{categoryEmoji(habit.category)} {habit.title}</p>
      <button
        onClick={restore}
        disabled={isPending}
        className="text-xs text-zinc-500 hover:text-zinc-200 transition-colors px-2 py-1 rounded hover:bg-zinc-800"
      >
        {isPending ? '...' : 'Restore'}
      </button>
    </div>
  )
}

export function SettingsClient({ reminderTime, streakFreezeCount, archivedHabits, vapidPublicKey }: SettingsClientProps) {
  const [isPending, startTransition] = useTransition()
  const [time, setTime] = useState(reminderTime ?? '21:00')
  const [enabled, setEnabled] = useState(!!reminderTime)
  const [importing, setImporting] = useState(false)
  const [permState, setPermState] = useState<NotificationPermission | 'unsupported'>(
    () => typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  )

  // Push subscription state
  const [pushSupported, setPushSupported] = useState(false)
  const [pushSubscribed, setPushSubscribed] = useState(false)
  const [pushPending, setPushPending] = useState(false)

  useEffect(() => {
    if (typeof Notification !== 'undefined') {
      setPermState(Notification.permission)
    }
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setPushSupported(true)
      // Check if already subscribed
      navigator.serviceWorker.ready.then(reg => {
        reg.pushManager.getSubscription().then(sub => {
          setPushSubscribed(!!sub)
        })
      })
    }
  }, [])

  const requestPermission = async () => {
    if (typeof Notification === 'undefined') return
    const result = await Notification.requestPermission()
    setPermState(result)
  }

  const testNotification = () => {
    if (Notification.permission !== 'granted') return
    new Notification('ideal', {
      body: 'This is what your daily reminder looks like.',
      tag: 'ideal-test',
    })
  }

  const saveReminder = () => {
    startTransition(async () => {
      await setReminderTime(enabled ? time : null)
    })
  }

  const subscribePush = async () => {
    if (!vapidPublicKey) return
    setPushPending(true)
    try {
      const reg = await navigator.serviceWorker.ready
      // Request notification permission first
      const permission = await Notification.requestPermission()
      setPermState(permission)
      if (permission !== 'granted') return

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      })
      const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
      await savePushSubscription(json)
      setPushSubscribed(true)
    } catch (err) {
      console.error('Push subscribe failed:', err)
    } finally {
      setPushPending(false)
    }
  }

  const unsubscribePush = async () => {
    setPushPending(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await removePushSubscription(sub.endpoint)
        await sub.unsubscribe()
      }
      setPushSubscribed(false)
    } finally {
      setPushPending(false)
    }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/import', { method: 'POST', body: formData })
      if (res.ok) {
        window.location.reload()
      } else {
        alert('Import failed: ' + await res.text())
      }
    } finally {
      setImporting(false)
      e.target.value = ''
    }
  }

  return (
    <div className="space-y-8">

      {/* Push Notifications */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Smartphone size={14} className="text-zinc-400" />
          <h2 className="text-sm font-semibold text-zinc-200">Push Notifications</h2>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4">
          {!pushSupported ? (
            <p className="text-xs text-zinc-500">
              Push notifications require a modern browser. On iPhone, add this app to your Home Screen first, then reload.
            </p>
          ) : pushSubscribed ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-emerald-400 font-medium">Push enabled ✓</p>
                  <p className="text-xs text-zinc-500 mt-0.5">You'll get notified even when the app is closed.</p>
                </div>
                <Button variant="ghost" size="sm" onClick={unsubscribePush} disabled={pushPending}
                  className="text-zinc-500 hover:text-rose-400">
                  {pushPending ? '...' : 'Disable'}
                </Button>
              </div>
              <p className="text-xs text-zinc-600">
                Notification fires daily at 9 PM ET (configured in Vercel). Set your reminder time below to also enable in-app fallback.
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-300">Enable push notifications</p>
                  <p className="text-xs text-zinc-500 mt-0.5">Works even when the app is closed.</p>
                </div>
                <Button variant="outline" size="sm" onClick={subscribePush} disabled={pushPending}>
                  {pushPending ? 'Enabling…' : 'Enable'}
                </Button>
              </div>
              {permState === 'denied' && (
                <p className="text-xs text-zinc-500">
                  Notifications are blocked. Enable them in your browser/phone settings then reload.
                </p>
              )}
            </>
          )}
        </div>
      </section>

      {/* In-browser reminder (fallback) */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Bell size={14} className="text-zinc-400" />
          <h2 className="text-sm font-semibold text-zinc-200">In-App Reminder</h2>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4">
          <p className="text-xs text-zinc-500">Fallback reminder that fires while this tab is open.</p>

          {permState === 'unsupported' && (
            <p className="text-xs text-zinc-500">Browser notifications not supported.</p>
          )}

          {permState === 'default' && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-zinc-400">Allow notifications to enable reminders</p>
              <Button variant="outline" size="sm" onClick={requestPermission}>Allow</Button>
            </div>
          )}

          {permState === 'denied' && (
            <p className="text-xs text-zinc-500">
              Notifications blocked. Enable in browser settings then reload.
            </p>
          )}

          {permState === 'granted' && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-300">Enable reminder</span>
                <button
                  onClick={() => setEnabled(e => !e)}
                  className={`relative h-5 w-9 rounded-full transition-colors ${enabled ? 'bg-amber-500' : 'bg-zinc-700'}`}
                >
                  <div className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-4' : ''}`} />
                </button>
              </div>

              {enabled && (
                <div className="flex items-center gap-3">
                  <label className="text-xs text-zinc-500 shrink-0">Fire at</label>
                  <Input
                    type="time"
                    value={time}
                    onChange={e => setTime(e.target.value)}
                    className="w-32"
                  />
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={saveReminder} disabled={isPending}>
                  {isPending ? 'Saving...' : 'Save'}
                </Button>
                <Button variant="ghost" size="sm" onClick={testNotification}>Test</Button>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Streak freezes */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Shield size={14} className="text-zinc-400" />
          <h2 className="text-sm font-semibold text-zinc-200">Streak Freezes</h2>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-5 py-4 flex items-center justify-between">
          <p className="text-xs text-zinc-400">Total freezes used</p>
          <p className="text-sm font-semibold text-zinc-300">{streakFreezeCount}</p>
        </div>
      </section>

      {/* Archived habits */}
      {archivedHabits.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Archive size={14} className="text-zinc-400" />
            <h2 className="text-sm font-semibold text-zinc-200">Archived Habits</h2>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 divide-y divide-zinc-800/60">
            {archivedHabits.map(h => (
              <ArchivedHabitRow key={h.id} habit={h} />
            ))}
          </div>
        </section>
      )}

      {/* Data */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Download size={14} className="text-zinc-400" />
          <h2 className="text-sm font-semibold text-zinc-200">Data</h2>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-300">Export backup</p>
              <p className="text-xs text-zinc-600 mt-0.5">Downloads your entire database as a .db file</p>
            </div>
            <a href="/api/export" download>
              <Button variant="outline" size="sm">
                <Download size={13} /> Download
              </Button>
            </a>
          </div>

          <div className="border-t border-zinc-800 pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-300">Import backup</p>
                <p className="text-xs text-zinc-600 mt-0.5">Accepts .json (cloud) or .db (local) — replaces all data</p>
              </div>
              <label className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-zinc-700 rounded-lg cursor-pointer transition-colors ${importing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-zinc-800 text-zinc-300'}`}>
                <Upload size={13} />
                {importing ? 'Importing…' : 'Import'}
                <input
                  type="file"
                  accept=".db,.json"
                  className="hidden"
                  onChange={handleImport}
                  disabled={importing}
                />
              </label>
            </div>
          </div>

          <div className="border-t border-zinc-800 pt-4">
            <p className="text-xs text-zinc-500 leading-relaxed">
              For automatic backups, move your <code className="text-zinc-400 bg-zinc-800 px-1 rounded">data/</code> folder
              into an iCloud or Dropbox synced directory, then symlink it back:
            </p>
            <pre className="mt-2 text-xs text-zinc-500 bg-zinc-900 border border-zinc-800 rounded-lg p-3 overflow-x-auto">{`mv data ~/Library/Mobile\\ Documents/com~apple~CloudDocs/ideal-data
ln -s ~/Library/Mobile\\ Documents/com~apple~CloudDocs/ideal-data data`}</pre>
          </div>
        </div>
      </section>
    </div>
  )
}
