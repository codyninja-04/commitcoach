import Link from 'next/link'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import type { TodayItem } from '@/components/today/HabitCheckIn'
import { TodayBoard } from '@/components/today/TodayBoard'
import { PlusIcon } from '@/components/ui/Icons'
import { addDays, formatLongDate, hourIn, startOfWeek } from '@/lib/dates'
import { type HabitView, loadHabitViews, loadProfile } from '@/lib/habits/load'
import { dayStatus, isDueOn, scheduleLabel, weekCompletions } from '@/lib/habits/schedule'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Today' }
export const dynamic = 'force-dynamic'

function toItem(v: HabitView, date: string): TodayItem {
  const { habit } = v
  const weekly = habit.target_frequency === 'weekly'
  return {
    key: `${habit.id}:${date}`,
    date,
    habit: { id: habit.id, name: habit.name, commitment: habit.current_commitment, schedule: scheduleLabel(habit) },
    checkin: v.checkins.find((c) => c.checkin_date === date) ?? null,
    streak: { current: v.streaks.current, unit: v.streaks.unit },
    week: weekly ? { done: weekCompletions(startOfWeek(date), v.map), target: habit.weekly_target ?? 1 } : null,
  }
}

function greeting(hour: number) {
  if (hour < 5) return 'Still up'
  if (hour < 12) return 'Morning'
  if (hour < 18) return 'Afternoon'
  return 'Evening'
}

export default async function TodayPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const profile = await loadProfile(supabase, user.id)
  const { today, views } = await loadHabitViews(supabase, user.id, profile.timezone)
  const yesterday = addDays(today, -1)

  const todayItems = views.filter((v) => isDueOn(v.habit, today, v.map)).map((v) => toItem(v, today))

  // Yesterday's due habits that were never logged. Weekly habits are left
  // out because they have no fixed day to catch up on.
  const catchUp = views
    .filter((v) => v.habit.target_frequency !== 'weekly' && dayStatus(v.habit, yesterday, v.map, today, v.start) === 'unlogged')
    .map((v) => toItem(v, yesterday))

  const firstName = (profile.display_name || (user.user_metadata?.full_name as string | undefined) || '').split(' ')[0]
  const restDay = views.length > 0 && todayItems.length === 0

  return (
    <div>
      <p className="eyebrow">{formatLongDate(today)}</p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight">
        {greeting(hourIn(profile.timezone))}
        {firstName ? `, ${firstName}` : ''}
      </h1>
      <p className="mb-6 mt-1 text-sm text-muted">
        {views.length === 0
          ? 'Nothing to check in yet.'
          : restDay
            ? 'Nothing is scheduled today.'
            : 'Mark each one done or missed. Both are useful.'}
      </p>

      {views.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {restDay && (
            <div className="card mb-6 p-6 text-center">
              <p className="font-semibold">A rest day</p>
              <p className="mt-1 text-sm text-muted">None of your habits are due today. Recovery counts too.</p>
            </div>
          )}
          <TodayBoard
            items={[...todayItems, ...catchUp]}
            today={today}
            dayLabels={{ [today]: 'Today', [yesterday]: 'Yesterday, still open' }}
          />
        </>
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="card animate-rise-in px-6 py-12 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary-soft text-primary">
        <PlusIcon size={26} />
      </div>
      <h2 className="mt-5 text-lg font-bold">Start with one habit</h2>
      <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted">
        Pick something small enough that you could do it on a bad day. You can always raise the bar later.
      </p>
      <Link href="/habits/new" className="btn-primary mt-6">
        Add a habit
      </Link>
    </div>
  )
}
