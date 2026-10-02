# CommitCoach

A habit tracker that tries to understand why you miss days instead of just counting streaks.

Most trackers show you a broken streak and leave you to feel bad about it. CommitCoach asks what happened when you miss, builds up a picture over a few weeks (you always skip the gym on days with late meetings, you journal fine except in exam weeks), and suggests adjusting the commitment when the bar is clearly set too high. The idea is that habits are built by honest iteration, not perfect streaks.

## What it does

- **Today.** Every habit due today with two big buttons, Done and Missed. Yesterday's unlogged habits show up underneath so you can catch up.
- **Miss reflections.** Tapping Missed opens a short sheet with one tap tags (busy, tired, forgot, unmotivated, travel, sick, other) and an optional note. Claude replies in two or three calm sentences. If your recent history shows a repeat, it names it with the actual count and gives one concrete adjustment.
- **Habit detail.** A GitHub style calendar of the last 90 days, streaks, a weekday breakdown, a pattern card and the full commitment history.
- **Patterns.** Weekday patterns ("missed on 4 of the last 5 Mondays") are counted in code, so the numbers are exact. Claude interprets, it does not count.
- **Adjustments.** After two weeks, ask the coach whether the commitment should change. It either suggests a smaller version (fewer days, shorter session, drop the day that keeps failing) or tells you to keep going. You accept or keep as is, and accepted changes are logged.
- **Insights.** A 12 week consistency trend, weekday and miss reason breakdowns, and an on demand cross habit analysis from Claude.
- **Reminders.** One Web Push notification a day at the hour you choose, only if something due is still unlogged.
- **Your data.** JSON export and full account deletion from settings.

## Stack

Next.js 14 (App Router, PWA) · TypeScript strict · Supabase (Postgres, RLS, Google OAuth) · Claude API · Recharts · Web Push · Tailwind CSS

## How streaks work

All the rules live in `lib/habits/schedule.ts` and are recomputed from raw check-ins on every page load, so they never drift.

- A due day with no check-in counts as a miss once the day is over. Today is never held against you until it ends.
- Daily, weekday and specific day habits count streaks in days and skip days that are not scheduled.
- "N times a week" habits count streaks in weeks where the target was hit. The current week only counts once it is met.
- "Today" is the user's own timezone, which the app picks up from the browser automatically.

## Getting started

```bash
npm install
cp .env.example .env.local
npm run dev
```

### Supabase

1. Create a project and run `supabase/migrations/001_initial_schema.sql` in the SQL editor.
2. Under Authentication, enable the Google provider and add `http://localhost:3000/auth/callback` (and your production URL) to the redirect URLs.
3. Copy the project URL, anon key and service role key into `.env.local`.

### Claude

Set `ANTHROPIC_API_KEY`. The model defaults to `claude-sonnet-5-5` and can be changed with `CLAUDE_MODEL`. Every call uses a forced tool call so responses come back as validated JSON. If the API is down, missed day reflections fall back to a short fixed message so check-ins never fail.

### Push reminders

```bash
npx web-push generate-vapid-keys
```

Put the keys in `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`, and set `VAPID_SUBJECT` to a `mailto:` address.

Reminders need something to call `/api/cron/reminders` every hour with `Authorization: Bearer $CRON_SECRET`. Vercel's free plan only allows daily crons, so the repo includes a GitHub Actions workflow (`.github/workflows/reminders.yml`) that does it. To turn it on, add the `APP_URL` and `CRON_SECRET` repository secrets and set the repository variable `REMINDERS_ENABLED` to `true`. On a paid Vercel plan you can use a Vercel cron instead.

## Plans

Free covers up to 3 habits with basic tracking. Pro ($4 a month) adds unlimited habits, miss reflections, pattern detection and adjustment suggestions.

Billing is not wired up yet, so limits are off by default and everyone gets everything. Set `ENFORCE_PRO=true` to turn them on. A database trigger stops users from changing their own plan, so `plan` can only be set with the service role.

## Project layout

```
app/
  (auth)/            login and signup
  (app)/             today, habits, habit detail and edit, insights, settings
  api/               habits, checkins, miss-reflection, insights/patterns,
                     coaching/adjust, coaching/suggestions, profile, push,
                     cron/reminders, export, account
components/          today, habits, insights, settings, layout, ui
lib/
  claude/            miss-reflector, pattern-detector, habit-adjuster
  habits/            schedule (streak rules), stats, load, validate
  dates.ts           timezone safe date helpers
supabase/migrations/ schema, RLS, triggers
public/sw.js         service worker for push
```

## Scripts

- `npm run dev` starts the dev server
- `npm run build` makes a production build
- `npm run typecheck` runs TypeScript
- `npm run lint` runs ESLint

## Not in v1

No social accountability or leaderboards, no wearable integrations, no habit template marketplace. That is on purpose.
