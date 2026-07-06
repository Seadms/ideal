// ── Calendar (ICS feed) client ────────────────────────────────────────────────
// Reads one or more private ICS feed URLs (Google Calendar → Settings →
// "Secret address in iCal format") from GCAL_ICS_URLS. Comma-separated;
// each entry is either a bare URL or "Label|https://…" to name the calendar.
//
// Recurring events (RRULE, EXDATEs, RECURRENCE-ID overrides, timezones/DST)
// are expanded by node-ical's expandRecurringEvent.

import ical, { expandRecurringEvent } from 'node-ical'
import { dateInAppTz } from '@/lib/utils'

export interface CalEvent {
  id: string          // uid + start instant — stable dedupe key
  title: string
  start: Date
  end: Date | null
  allDay: boolean
  // The event's calendar day (YYYY-MM-DD) in the app timezone. All-day events
  // need special handling: node-ical parses date-only values as SERVER-local
  // midnight, so converting that instant through the app timezone shifts the
  // date on UTC servers (a "July 6" holiday became July 5 on Vercel). Always
  // compare against this, never against dateInAppTz(start).
  dayKey: string
  location: string | null
  calendar: string    // feed label
}

// The literal calendar date node-ical encoded, read back in the same
// (server-local) frame it was written in.
function localYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

interface Feed { label: string; url: string }

function feeds(): Feed[] {
  const raw = process.env.GCAL_ICS_URLS ?? ''
  return raw.split(',').map(s => s.trim()).filter(Boolean).map((entry, i) => {
    const pipe = entry.indexOf('|')
    if (pipe > 0 && !entry.slice(0, pipe).includes('://')) {
      return { label: entry.slice(0, pipe).trim(), url: entry.slice(pipe + 1).trim() }
    }
    return { label: i === 0 ? 'Calendar' : `Calendar ${i + 1}`, url: entry }
  })
}

export function calendarConfigured(): boolean {
  return feeds().length > 0
}

function expandEvents(parsed: ical.CalendarResponse, label: string, rangeStart: Date, rangeEnd: Date): CalEvent[] {
  const out: CalEvent[] = []

  for (const key of Object.keys(parsed)) {
    const ev = parsed[key] as ical.VEvent
    if (ev.type !== 'VEVENT' || !ev.start) continue
    // Overridden instances appear both standalone (with recurrenceid) and via
    // the base event's expansion — skip the standalone copy.
    if (ev.recurrenceid) continue

    try {
      const instances = expandRecurringEvent(ev, { from: rangeStart, to: rangeEnd, expandOngoing: true })
      for (const inst of instances) {
        out.push({
          id: `${ev.uid ?? key}-${inst.start.toISOString()}`,
          title: inst.summary?.toString() ?? '(untitled)',
          start: inst.start,
          end: inst.end ?? null,
          allDay: inst.isFullDay,
          dayKey: inst.isFullDay ? localYmd(inst.start) : dateInAppTz(inst.start),
          location: inst.event.location?.toString() || null,
          calendar: label,
        })
      }
    } catch (err) {
      console.error(`Failed to expand event "${ev.summary}":`, err)
    }
  }

  const seen = new Set<string>()
  return out.filter(e => !seen.has(e.id) && seen.add(e.id))
}

export async function getCalendarEvents(
  rangeStart: Date, rangeEnd: Date, opts: { fresh?: boolean } = {},
): Promise<CalEvent[]> {
  const all: CalEvent[] = []

  await Promise.all(feeds().map(async feed => {
    try {
      const res = await fetch(feed.url, opts.fresh
        ? { cache: 'no-store' }
        : { next: { revalidate: 300 } })
      if (!res.ok) {
        console.error(`ICS feed "${feed.label}" returned ${res.status}`)
        return
      }
      const text = await res.text()
      const parsed = ical.sync.parseICS(text)
      all.push(...expandEvents(parsed, feed.label, rangeStart, rangeEnd))
    } catch (err) {
      console.error(`ICS feed "${feed.label}" failed:`, err)
    }
  }))

  return all.sort((a, b) => a.start.getTime() - b.start.getTime())
}
