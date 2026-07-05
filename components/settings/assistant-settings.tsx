'use client'

import { useState, useTransition } from 'react'
import { Sparkles, Check, X } from 'lucide-react'
import { setAssistantPrefs, sendTestBriefing } from '@/lib/actions/settings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface AssistantSettingsProps {
  briefingTime: string | null
  eventLeadMinutes: number
  assignmentAlertHours: number
  integrations: { canvas: boolean; calendar: boolean; gemini: boolean; push: boolean }
}

function IntegrationRow({ label, ok, hint }: { label: string; ok: boolean; hint: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs text-zinc-400">{label}</span>
      {ok ? (
        <span className="flex items-center gap-1 text-xs text-emerald-400"><Check size={12} /> Connected</span>
      ) : (
        <span className="flex items-center gap-1 text-xs text-zinc-600" title={hint}><X size={12} /> {hint}</span>
      )}
    </div>
  )
}

export function AssistantSettings({ briefingTime, eventLeadMinutes, assignmentAlertHours, integrations }: AssistantSettingsProps) {
  const [isPending, startTransition] = useTransition()
  const [enabled, setEnabled] = useState(!!briefingTime)
  const [time, setTime] = useState(briefingTime ?? '07:30')
  const [lead, setLead] = useState(eventLeadMinutes)
  const [alertHours, setAlertHours] = useState(assignmentAlertHours)
  const [testResult, setTestResult] = useState<string | null>(null)
  const [testing, setTesting] = useState(false)

  const save = () => {
    startTransition(async () => {
      await setAssistantPrefs({
        briefingTime: enabled ? time : null,
        eventLeadMinutes: lead,
        assignmentAlertHours: alertHours,
      })
    })
  }

  const test = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const { sent, body } = await sendTestBriefing()
      setTestResult(sent > 0 ? `Sent to ${sent} device${sent > 1 ? 's' : ''}: "${body}"` : `No push sent (enable push above). Briefing: "${body}"`)
    } catch {
      setTestResult('Briefing failed — check the server logs.')
    } finally {
      setTesting(false)
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles size={14} className="text-violet-400" />
        <h2 className="text-sm font-semibold text-zinc-200">Assistant</h2>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-300">Morning briefing</p>
            <p className="text-xs text-zinc-500 mt-0.5">A push with your classes, deadlines, and plan for the day.</p>
          </div>
          <button
            onClick={() => setEnabled(e => !e)}
            aria-label="Toggle morning briefing"
            className={`relative h-5 w-9 rounded-full transition-colors ${enabled ? 'bg-violet-500' : 'bg-zinc-700'}`}
          >
            <div className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-4' : ''}`} />
          </button>
        </div>

        {enabled && (
          <div className="flex items-center gap-3">
            <label className="text-xs text-zinc-500 shrink-0">Send at</label>
            <Input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-32" />
          </div>
        )}

        <div className="border-t border-zinc-800 pt-4 grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-zinc-500 block mb-1.5">Event reminder lead</label>
            <div className="flex items-center gap-2">
              <Input type="number" min={5} max={180} value={lead}
                onChange={e => setLead(Number(e.target.value))} className="w-20" />
              <span className="text-xs text-zinc-600">min before</span>
            </div>
          </div>
          <div>
            <label className="text-xs text-zinc-500 block mb-1.5">Assignment heads-up</label>
            <div className="flex items-center gap-2">
              <Input type="number" min={2} max={72} value={alertHours}
                onChange={e => setAlertHours(Number(e.target.value))} className="w-20" />
              <span className="text-xs text-zinc-600">hrs before due</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={save} disabled={isPending}>
            {isPending ? 'Saving…' : 'Save'}
          </Button>
          <Button variant="ghost" size="sm" onClick={test} disabled={testing}>
            {testing ? 'Preparing…' : 'Send test briefing'}
          </Button>
        </div>
        {testResult && <p className="text-xs text-zinc-500 leading-relaxed">{testResult}</p>}

        <div className="border-t border-zinc-800 pt-3">
          <IntegrationRow label="Canvas (UNCC)" ok={integrations.canvas} hint="Add CANVAS_API_TOKEN" />
          <IntegrationRow label="Google Calendar" ok={integrations.calendar} hint="Add GCAL_ICS_URLS" />
          <IntegrationRow label="Gemini (AI briefing)" ok={integrations.gemini} hint="Add GEMINI_API_KEY" />
          <IntegrationRow label="Push notifications" ok={integrations.push} hint="Add VAPID keys" />
        </div>

        <p className="text-xs text-zinc-600 leading-relaxed">
          Timed reminders need an external pinger hitting{' '}
          <code className="rounded bg-zinc-800 px-1 py-0.5 text-zinc-400">/api/tick?key=CRON_SECRET</code>{' '}
          every 10 minutes. cron-job.org is free and takes two minutes to set up.
        </p>
      </div>
    </section>
  )
}
