# ideal

A personal, gamified life tracker — habits, one-off and scheduled tasks, a points
economy with redeemable rewards, a gym split logger, a diet/nutrition planner, and
an activity history. Built as a self-hosted PWA you can install to your phone's home
screen.

## Features

- **Dashboard** — daily habits with per-habit streaks and weekly targets, one-off
  tasks, recurring scheduled tasks, an AI-suggested daily bonus task, and a
  "Minimum Viable Day" (MVD) focus mode.
- **Points & streaks** — earn points for completions, keep a daily streak alive,
  and spend streak freezes to protect it.
- **Rewards** — redeem earned points for self-defined rewards.
- **Gym** — an editable workout split (built for a home rings + pull-up bar setup),
  per-exercise progress vs. your last session, plus a daily nutrition log.
- **Diet** — macro goals (training vs. rest day), a meal plan, diet rules, and a
  water tracker.
- **History** — a 35-day activity heatmap, 60-day habit performance, and a
  date-grouped activity feed.
- **School** — live Canvas (UNCC) integration: courses, upcoming assignments,
  missing submissions, and deadline push reminders.
- **Assistant** — an AI morning briefing (calendar + Canvas + habits, written by
  Gemini) pushed at your chosen time, plus lead-time reminders before calendar
  events and assignment deadlines. Timed pushes are driven by `/api/tick`,
  designed to be hit every ~10 min by a free external pinger (cron-job.org)
  since Vercel Hobby crons only run daily.
- **Calendar** — reads your Google Calendar private ICS feed(s), recurring
  events included, and shows a Today timeline on the dashboard.
- **Reminders** — web-push notifications via a daily Vercel cron, with an in-app
  fallback reminder.
- **Data** — one-click export/import backup (raw SQLite locally, JSON on cloud).

## Tech stack

- **Next.js 16** (App Router, Server Components & Server Actions)
- **Drizzle ORM** over **libSQL / Turso** (local file in dev, Turso in production)
- **Tailwind CSS**, **lucide-react**
- **web-push** for notifications, **@google/generative-ai** for bonus-task suggestions
- Deployed on **Vercel**

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in as needed (all optional for local dev)
npm run dev
```

With no `TURSO_*` env vars set, the app uses a local SQLite file at `data/life.db`
and seeds itself on first load.

## Environment variables

See `.env.example`. All are optional for local development:

- `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` — cloud database (unset = local file).
- `NEXT_PUBLIC_APP_TZ` — IANA timezone anchoring the app's "today" (streaks,
  habit days). Required on Vercel, whose servers run in UTC and reserve `TZ`.
- `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` — web-push (generate
  with `npx web-push generate-vapid-keys`).
- `CRON_SECRET` — shared secret the daily push cron (`/api/push-notify`, scheduled
  in `vercel.json`) must present.
- `GEMINI_API_KEY` — enables AI-generated bonus-task suggestions and the AI
  morning briefing (both fall back gracefully when unset).
- `CANVAS_BASE_URL` / `CANVAS_API_TOKEN` — Canvas LMS integration (School page,
  assignment reminders). Token: Canvas → Account → Settings → New Access Token.
- `GCAL_ICS_URLS` — comma-separated private ICS feed URLs (`Label|url` supported)
  for the Today timeline and event reminders.

## Scripts

```bash
npm run dev        # start dev server
npm run build      # production build
npm run start      # serve the production build
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
```

## Backups

The Settings page exports/imports a full backup. Locally that's the raw
`data/life.db` SQLite file; on Turso it's a JSON dump. For automatic backups, keep
the `data/` folder inside an iCloud/Dropbox synced directory and symlink it back.
