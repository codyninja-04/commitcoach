import Link from 'next/link'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { HabitCard } from '@/components/habits/HabitCard'
import { PlusIcon } from '@/components/ui/Icons'
import { loadHabitViews, loadProfile } from '@/lib/habits/load'
import { scheduleLabel } from '@/lib/habits/schedule'
import { completionRate, history, pct } from '@/lib/habits/stats'
import { habitLimit } from '@/lib/plan'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Habits' }
export const dynamic = 'force-dynamic'

export default async function HabitsPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const profile = await loadProfile(supabase, user.id)
  const { today, views } = await loadHabitViews(supabase, user.id, profile.timezone, { includeArchived: true })
  const active = views.filter((v) => v.habit.is_active)
  const archived = views.filter((v) => !v.habit.is_active)
  const limit = habitLimit(profile)
  const atLimit = limit !== null && active.length >= limit

  const card = (v: (typeof views)[number]) => (
    <HabitCard
      key={v.habit.id}
      id={v.habit.id}
      name={v.habit.name}
      category={v.habit.category}
      schedule={scheduleLabel(v.habit)}
      commitment={v.habit.current_commitment}
      streak={{ current: v.streaks.current, unit: v.streaks.unit }}
      rate={pct(completionRate(v.habit, v.map, today, v.start, 28))}
      strip={history(v.habit, v.map, today, v.start, 14)}
      archived={!v.habit.is_active}
    />
  )

  return (
    <div>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Habits</h1>
          <p className="mt-1 text-sm text-muted">
            {active.length === 0
              ? 'Nothing tracked yet.'
              : `${active.length} active${limit !== null ? ` of ${limit} on the free plan` : ''}`}
          </p>
        </div>
        {atLimit ? (
          <Link href="/settings#plan" className="btn-secondary">
            Upgrade for more
          </Link>
        ) : (
          <Link href="/habits/new" className="btn-primary">
            <PlusIcon size={17} /> New habit
          </Link>
        )}
      </div>

      {active.length === 0 ? (
        <div className="card px-6 py-12 text-center">
          <p className="font-semibold">No active habits</p>
          <p className="mx-auto mt-1 max-w-xs text-sm text-muted">
            Pick one thing you want to do more often. Small enough to do on a bad day.
          </p>
          <Link href="/habits/new" className="btn-primary mt-5">
            Add your first habit
          </Link>
        </div>
      ) : (
        <div className="space-y-3">{active.map(card)}</div>
      )}

      <Legend />

      {archived.length > 0 && (
        <details className="mt-10">
          <summary className="cursor-pointer text-sm font-semibold text-muted hover:text-text">
            Archived ({archived.length})
          </summary>
          <div className="mt-3 space-y-3">{archived.map(card)}</div>
        </details>
      )}
    </div>
  )
}

function Legend() {
  const items = [
    ['bg-completed', 'Done'],
    ['bg-missed/45', 'Missed'],
    ['border border-dashed border-muted/40', 'Not logged'],
    ['bg-subtle', 'Not due'],
  ]
  return (
    <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] text-muted">
      {items.map(([cls, label]) => (
        <span key={label} className="inline-flex items-center gap-1.5">
          <span className={`h-2.5 w-2.5 rounded-[3px] ${cls}`} /> {label}
        </span>
      ))}
    </div>
  )
}
