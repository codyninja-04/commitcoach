import Link from 'next/link'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { ConsistencyChart } from '@/components/insights/ConsistencyChart'
import { CrossHabitPatterns } from '@/components/insights/CrossHabitPatterns'
import { diffDays } from '@/lib/dates'
import { loadHabitViews, loadProfile } from '@/lib/habits/load'
import { completionRate, pct, tagCounts, weekdayBreakdown, weeklyConsistency } from '@/lib/habits/stats'
import { hasPro } from '@/lib/plan'
import { createClient } from '@/lib/supabase/server'
import type { ContextTag, PatternInsight, Weekday } from '@/lib/types'
import { TAG_LABEL, WEEKDAYS, WEEKDAY_SHORT } from '@/lib/types'

export const metadata: Metadata = { title: 'Insights' }
export const dynamic = 'force-dynamic'

export default async function InsightsPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const profile = await loadProfile(supabase, user.id)
  const { today, views } = await loadHabitViews(supabase, user.id, profile.timezone)

  const { data: latest } = await supabase
    .from('pattern_insights')
    .select('*')
    .eq('user_id', user.id)
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (views.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Insights</h1>
        <div className="card mt-6 px-6 py-12 text-center">
          <p className="font-semibold">Nothing to look at yet</p>
          <p className="mx-auto mt-1 max-w-xs text-sm text-muted">Add a habit and check in for a couple of weeks. This page fills in from there.</p>
          <Link href="/habits/new" className="btn-primary mt-5">
            Add a habit
          </Link>
        </div>
      </div>
    )
  }

  const trend = weeklyConsistency(views, today, 12)

  // Overall 4 week rate, weighted by how often each habit was due.
  let due = 0
  let done = 0
  const weekdayTotals = new Map<Weekday, { due: number; done: number }>(WEEKDAYS.map((d) => [d, { due: 0, done: 0 }]))
  for (const v of views) {
    if (v.habit.target_frequency === 'weekly') continue
    for (const d of weekdayBreakdown(v.habit, v.map, today, v.start, 28)) {
      due += d.due
      done += d.done
      const t = weekdayTotals.get(d.day)!
      t.due += d.due
      t.done += d.done
    }
  }

  const rates = views
    .map((v) => ({ name: v.habit.name, id: v.habit.id, rate: completionRate(v.habit, v.map, today, v.start, 28) }))
    .filter((r): r is { name: string; id: string; rate: number } => r.rate !== null)
    .sort((a, b) => b.rate - a.rate)
  const steadiest = rates[0]
  const shakiest = rates.length > 1 ? rates[rates.length - 1] : null

  const allCheckins = views.flatMap((v) => v.checkins.filter((c) => diffDays(today, c.checkin_date) <= 56))
  const tags = tagCounts(allCheckins)
  const tagTotal = tags.reduce((s, t) => s + t.count, 0)

  const weekdayRows = WEEKDAYS.map((d) => {
    const t = weekdayTotals.get(d)!
    return { day: d, rate: t.due ? t.done / t.due : null }
  })
  const weakest = weekdayRows.filter((r) => r.rate !== null).sort((a, b) => a.rate! - b.rate!)[0]

  const pro = hasPro(profile)
  const tracked = Math.max(...views.map((v) => diffDays(today, v.start)))
  const disabledReason = !pro
    ? 'Cross-habit pattern detection is part of Pro.'
    : tracked < 14
      ? `Patterns need at least two weeks of check-ins on a habit. ${14 - tracked} days to go.`
      : null

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Insights</h1>
        <p className="mt-1 text-sm text-muted">How the last few weeks actually went, without the guilt.</p>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        <Tile label="Last 4 weeks" value={pct(due ? done / due : null)} note="of due days done" />
        <Tile
          label="Steadiest"
          value={steadiest ? pct(steadiest.rate) : '--'}
          note={steadiest?.name ?? 'Not enough data'}
          href={steadiest ? `/habits/${steadiest.id}` : undefined}
        />
        <Tile
          label="Needs a look"
          value={shakiest ? pct(shakiest.rate) : '--'}
          note={shakiest?.name ?? 'Only one habit'}
          href={shakiest ? `/habits/${shakiest.id}` : undefined}
          className="col-span-2 sm:col-span-1"
        />
      </div>

      <section className="card p-5">
        <h2 className="text-base font-semibold">Consistency trend</h2>
        <p className="mb-4 mt-0.5 text-[13px] text-muted">Share of due check-ins done each week, last 12 weeks</p>
        <ConsistencyChart data={trend} habits={views.map((v) => ({ id: v.habit.id, name: v.habit.name }))} />
      </section>

      <div className="grid gap-5 md:grid-cols-2">
        <section className="card p-5">
          <h2 className="text-base font-semibold">By weekday</h2>
          <p className="mt-0.5 text-[13px] text-muted">All day-based habits, last 4 weeks</p>
          <ul className="mt-4 space-y-2">
            {weekdayRows.map((r) => (
              <li key={r.day} className="flex items-center gap-3 text-[13px]">
                <span className="w-8 font-semibold">{WEEKDAY_SHORT[r.day]}</span>
                <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-subtle">
                  {r.rate !== null && (
                    <span
                      className={`absolute inset-y-0 left-0 rounded-full ${weakest?.day === r.day ? 'bg-streak/70' : 'bg-primary/80'}`}
                      style={{ width: `${Math.max(3, r.rate * 100)}%` }}
                    />
                  )}
                </span>
                <span className="w-10 text-right tabular-nums text-muted">{pct(r.rate)}</span>
              </li>
            ))}
          </ul>
          {weakest && weakest.rate !== null && weakest.rate < 0.75 && (
            <p className="mt-4 text-[13px] leading-relaxed text-muted">
              {WEEKDAY_SHORT[weakest.day]} is your hardest day. Worth asking what is different about it.
            </p>
          )}
        </section>

        <section className="card p-5">
          <h2 className="text-base font-semibold">What gets in the way</h2>
          <p className="mt-0.5 text-[13px] text-muted">Reasons you logged, last 8 weeks</p>
          {tags.length === 0 ? (
            <p className="mt-4 text-sm text-muted">No reasons logged yet. When you miss a day, tagging why is what makes this useful.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {tags.map((t) => (
                <TagRow key={t.tag} tag={t.tag} count={t.count} total={tagTotal} />
              ))}
            </ul>
          )}
        </section>
      </div>

      <CrossHabitPatterns
        initial={(latest as PatternInsight | null) ?? null}
        enabled={disabledReason === null}
        disabledReason={disabledReason}
      />
    </div>
  )
}

function Tile({
  label,
  value,
  note,
  href,
  className = '',
}: {
  label: string
  value: string
  note: string
  href?: string
  className?: string
}) {
  const body = (
    <>
      <p className="text-[11px] font-medium text-muted">{label}</p>
      <p className="mt-0.5 text-2xl font-bold tabular-nums tracking-tight">{value}</p>
      <p className="truncate text-[12px] text-muted">{note}</p>
    </>
  )
  return href ? (
    <Link href={href} className={`card block px-4 py-3 transition hover:border-text/20 ${className}`}>
      {body}
    </Link>
  ) : (
    <div className={`card px-4 py-3 ${className}`}>{body}</div>
  )
}

function TagRow({ tag, count, total }: { tag: ContextTag; count: number; total: number }) {
  return (
    <li className="flex items-center gap-3 text-[13px]">
      <span className="w-24 font-semibold">{TAG_LABEL[tag]}</span>
      <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-subtle">
        <span className="absolute inset-y-0 left-0 rounded-full bg-text/40" style={{ width: `${(count / total) * 100}%` }} />
      </span>
      <span className="w-6 text-right tabular-nums text-muted">{count}</span>
    </li>
  )
}
