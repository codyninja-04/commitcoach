import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { AdjustmentSuggestion } from '@/components/habits/AdjustmentSuggestion'
import { HabitActions } from '@/components/habits/HabitActions'
import { HabitCalendar } from '@/components/habits/HabitCalendar'
import { PatternInsightCard } from '@/components/habits/PatternInsightCard'
import { StreakBadge } from '@/components/today/StreakBadge'
import { ArrowLeftIcon, SparkIcon } from '@/components/ui/Icons'
import { isUuid } from '@/lib/api'
import { diffDays, formatDate, relativeDay } from '@/lib/dates'
import { loadHabitViews, loadProfile } from '@/lib/habits/load'
import { scheduleLabel } from '@/lib/habits/schedule'
import {
  PATTERN_MIN_DAYS,
  completionRate,
  detectWeekdayPattern,
  history,
  pct,
  tagCounts,
  weekdayBreakdown,
} from '@/lib/habits/stats'
import { hasPro } from '@/lib/plan'
import { createClient } from '@/lib/supabase/server'
import type { AdjustmentSuggestion as Suggestion } from '@/lib/types'
import { CATEGORY_LABEL, TAG_LABEL, WEEKDAY_SHORT } from '@/lib/types'

export const metadata: Metadata = { title: 'Habit' }
export const dynamic = 'force-dynamic'

const ADJUST_MIN_DAYS = 14

export default async function HabitDetailPage({ params }: { params: { id: string } }) {
  if (!isUuid(params.id)) notFound()
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const profile = await loadProfile(supabase, user.id)
  const { today, views } = await loadHabitViews(supabase, user.id, profile.timezone, {
    habitId: params.id,
    includeArchived: true,
  })
  const view = views[0]
  if (!view) notFound()

  const { habit, map, start, checkins, streaks } = view

  const { data: latestSuggestion } = await supabase
    .from('adjustment_suggestions')
    .select('*')
    .eq('habit_id', habit.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const daysTracked = Math.max(0, diffDays(today, start))
  const cells = history(habit, map, today, start, 90)
  const pattern = detectWeekdayPattern(habit, map, checkins, today, start)
  const rate4 = completionRate(habit, map, today, start, 28)
  const totalDone = checkins.filter((c) => c.completed).length
  const weekdays = weekdayBreakdown(habit, map, today, start, 56)
  const tags = tagCounts(checkins.filter((c) => diffDays(today, c.checkin_date) <= 56))
  const misses = checkins
    .filter((c) => !c.completed)
    .slice(-5)
    .reverse()

  // A suggestion stays visible for a day so reloading does not lose it.
  const suggestion = latestSuggestion as Suggestion | null
  const freshSuggestion =
    suggestion && (suggestion.status === 'pending' || Date.now() - new Date(suggestion.created_at).getTime() < 86_400_000)
      ? suggestion
      : null

  const pro = hasPro(profile)
  const waitReason = !pro
    ? 'Adjustment suggestions are part of Pro.'
    : daysTracked < ADJUST_MIN_DAYS
      ? `The coach needs two weeks of check-ins first. ${ADJUST_MIN_DAYS - daysTracked} days to go.`
      : null

  const history_ = [...(habit.adjustment_history ?? [])].reverse()

  return (
    <div className="space-y-5">
      <Link href="/habits" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-text">
        <ArrowLeftIcon size={16} /> Habits
      </Link>

      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow">
            {habit.category ? `${CATEGORY_LABEL[habit.category]} · ` : ''}
            {scheduleLabel(habit)}
            {!habit.is_active ? ' · Archived' : ''}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">{habit.name}</h1>
          {habit.current_commitment && <p className="mt-1 text-[15px] text-text/80">{habit.current_commitment}</p>}
          {habit.description && <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted">{habit.description}</p>}
        </div>
        <StreakBadge count={streaks.current} unit={streaks.unit} />
      </header>

      <div className="grid grid-cols-3 gap-2.5">
        <Stat label="Longest streak" value={`${streaks.longest}`} unit={streaks.unit === 'weeks' ? 'wks' : 'days'} />
        <Stat label="Last 4 weeks" value={pct(rate4)} />
        <Stat label="Times done" value={`${totalDone}`} />
      </div>

      <section className="card p-5">
        <h2 className="eyebrow mb-4">Last 90 days</h2>
        <HabitCalendar cells={cells} today={today} />
      </section>

      <PatternInsightCard pattern={pattern} daysTracked={daysTracked} minDays={PATTERN_MIN_DAYS}>
        {habit.is_active && (
          <AdjustmentSuggestion
            habitId={habit.id}
            initial={freshSuggestion}
            canAsk={pro && daysTracked >= ADJUST_MIN_DAYS}
            waitReason={waitReason}
          />
        )}
      </PatternInsightCard>

      {habit.target_frequency !== 'weekly' && weekdays.some((d) => d.due > 0) && (
        <section className="card p-5">
          <h2 className="eyebrow">By weekday, last 8 weeks</h2>
          <div className="mt-4 grid grid-cols-7 gap-2">
            {weekdays.map((d) => {
              const r = d.due ? d.done / d.due : null
              return (
                <div key={d.day} className="text-center">
                  <div className="relative mx-auto h-24 w-full max-w-[36px] overflow-hidden rounded-lg bg-subtle">
                    {r !== null && (
                      <div
                        className={`absolute inset-x-0 bottom-0 rounded-lg ${pattern?.day === d.day ? 'bg-streak/70' : 'bg-primary/80'}`}
                        style={{ height: `${Math.max(4, r * 100)}%` }}
                      />
                    )}
                  </div>
                  <p className="mt-1.5 text-[11px] font-semibold">{WEEKDAY_SHORT[d.day]}</p>
                  <p className="text-[11px] tabular-nums text-muted">{d.due ? `${d.done}/${d.due}` : '-'}</p>
                </div>
              )
            })}
          </div>
          {tags.length > 0 && (
            <p className="mt-4 text-[13px] text-muted">
              Reasons logged:{' '}
              {tags.map((t, i) => (
                <span key={t.tag}>
                  {i > 0 ? ', ' : ''}
                  <span className="font-semibold text-text">{TAG_LABEL[t.tag].toLowerCase()}</span> {t.count}
                </span>
              ))}
            </p>
          )}
        </section>
      )}

      <section className="card p-5">
        <h2 className="eyebrow">Commitment history</h2>
        {habit.original_commitment && habit.original_commitment !== habit.current_commitment && (
          <p className="mt-2 text-sm">
            Started as <span className="font-semibold">{habit.original_commitment}</span>, now{' '}
            <span className="font-semibold">{habit.current_commitment || habit.name}</span>.
          </p>
        )}
        {history_.length === 0 ? (
          <p className="reflection mt-2 text-muted">
            No adjustments yet. Started {formatDate(start, { day: 'numeric', month: 'long', year: 'numeric' })}.
          </p>
        ) : (
          <ol className="mt-3 space-y-3 border-l border-border pl-4">
            {history_.map((a, i) => (
              <li key={`${a.date}-${i}`} className="relative">
                <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-primary" />
                <p className="text-[12px] font-semibold text-muted">{formatDate(a.date, { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                <p className="mt-0.5 text-sm">
                  <span className="text-muted line-through decoration-muted/50">{a.from}</span>
                  <span className="mx-1.5 text-muted">to</span>
                  <span className="font-semibold">{a.to}</span>
                </p>
                <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{a.reason}</p>
              </li>
            ))}
          </ol>
        )}
      </section>

      {misses.length > 0 && (
        <section className="card p-5">
          <h2 className="eyebrow">Recent misses</h2>
          <ul className="mt-3 divide-y divide-border">
            {misses.map((m) => (
              <li key={m.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-1.5 text-[13px]">
                  <span className="font-semibold">{relativeDay(m.checkin_date, today)}</span>
                  {m.context_tags?.map((t) => (
                    <span key={t} className="rounded-full bg-subtle px-2 py-0.5 text-[12px] font-medium text-muted">
                      {TAG_LABEL[t]}
                    </span>
                  ))}
                </div>
                {m.miss_reason && <p className="mt-1 text-sm italic text-muted">&ldquo;{m.miss_reason}&rdquo;</p>}
                {m.ai_reflection && (
                  <p className="reflection mt-2 flex gap-2">
                    <SparkIcon size={14} className="mt-1 shrink-0 text-primary" />
                    <span>{m.ai_reflection}</span>
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <HabitActions id={habit.id} active={habit.is_active} />
    </div>
  )
}

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="card px-3.5 py-3">
      <p className="text-[11px] font-medium text-muted">{label}</p>
      <p className="mt-0.5 text-xl font-bold tabular-nums tracking-tight">
        {value}
        {unit && <span className="ml-1 text-[12px] font-medium text-muted">{unit}</span>}
      </p>
    </div>
  )
}
