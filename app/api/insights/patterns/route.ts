import { NextResponse } from 'next/server'
import { jsonError, requireUser } from '@/lib/api'
import { addDays, diffDays, weekdayOf } from '@/lib/dates'
import { type PatternInputHabit, detectPatterns } from '@/lib/claude/pattern-detector'
import { loadHabitViews, loadProfile } from '@/lib/habits/load'
import { scheduleLabel } from '@/lib/habits/schedule'
import { history } from '@/lib/habits/stats'
import { PRO_REQUIRED, hasPro } from '@/lib/plan'
import { WEEKDAY_LABEL } from '@/lib/types'

export const maxDuration = 60

/** Habits need two weeks before they are sent for analysis at all. */
const MIN_DAYS_PER_HABIT = 14
const WINDOW_DAYS = 42
const COOLDOWN_HOURS = 6

/** Latest stored analysis. Reading is free. */
export async function GET() {
  const auth = await requireUser()
  if (auth.error) return auth.error
  const { supabase, user } = auth

  const { data } = await supabase
    .from('pattern_insights')
    .select('*')
    .eq('user_id', user.id)
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return NextResponse.json({ insight: data ?? null })
}

/** Runs a fresh cross-habit analysis. Limited to one every few hours. */
export async function POST() {
  const auth = await requireUser()
  if (auth.error) return auth.error
  const { supabase, user } = auth

  const profile = await loadProfile(supabase, user.id)
  if (!hasPro(profile)) return jsonError(PRO_REQUIRED, 403)

  const { data: last } = await supabase
    .from('pattern_insights')
    .select('generated_at')
    .eq('user_id', user.id)
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (last) {
    const hours = (Date.now() - new Date(last.generated_at).getTime()) / 3_600_000
    if (hours < COOLDOWN_HOURS) {
      const wait = Math.ceil(COOLDOWN_HOURS - hours)
      return jsonError(`Patterns need time to change. Try again in about ${wait} hour${wait === 1 ? '' : 's'}.`, 429)
    }
  }

  const { today, views } = await loadHabitViews(supabase, user.id, profile.timezone)
  const yesterday = addDays(today, -1)

  const input: PatternInputHabit[] = []
  let total = 0
  for (const v of views) {
    const tracked = diffDays(today, v.start)
    if (tracked < MIN_DAYS_PER_HABIT) continue

    const tagsByDate = new Map(v.checkins.map((c) => [c.checkin_date, c.context_tags ?? []]))
    const cells = history(v.habit, v.map, yesterday, v.start, WINDOW_DAYS).filter(
      (c) => c.status === 'done' || c.status === 'missed' || c.status === 'unlogged'
    )
    total += cells.length

    input.push({
      name: v.habit.name,
      schedule: scheduleLabel(v.habit),
      days_tracked: tracked,
      checkins: cells.map((c) => ({
        date: c.date,
        day_of_week: WEEKDAY_LABEL[weekdayOf(c.date)],
        status: c.status as 'done' | 'missed' | 'unlogged',
        context_tags: tagsByDate.get(c.date) ?? [],
      })),
    })
  }

  if (!input.length) {
    return jsonError('Patterns need at least two weeks of check-ins on a habit. Keep logging and come back.', 400)
  }

  let result
  try {
    result = await detectPatterns(input)
  } catch (err) {
    console.error('pattern detection failed', err)
    return jsonError('Could not run the analysis right now. Try again in a few minutes.', 502)
  }

  const { data, error } = await supabase
    .from('pattern_insights')
    .insert({
      user_id: user.id,
      based_on_checkins: total,
      patterns: result.patterns,
      cross_habit_insight: result.cross_habit_insight,
    })
    .select('*')
    .single()
  if (error) return jsonError('Could not save the analysis', 500)

  return NextResponse.json({ insight: data })
}
