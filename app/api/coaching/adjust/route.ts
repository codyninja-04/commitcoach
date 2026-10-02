import { NextResponse } from 'next/server'
import { isUuid, jsonError, readJson, requireUser } from '@/lib/api'
import { addDays, diffDays } from '@/lib/dates'
import { suggestAdjustment } from '@/lib/claude/habit-adjuster'
import { loadHabitViews, loadProfile } from '@/lib/habits/load'
import { commitmentText, scheduleLabel } from '@/lib/habits/schedule'
import { completionRate, pct, tagCounts, weekdayBreakdown } from '@/lib/habits/stats'
import { PRO_REQUIRED, hasPro } from '@/lib/plan'
import { TAG_LABEL, WEEKDAY_SHORT } from '@/lib/types'

export const maxDuration = 30

const MIN_DAYS = 14

/**
 * Claude looks at one habit and says whether the commitment should change.
 * Returns the existing suggestion if one was made in the last day so the
 * button cannot be used to shop for a different answer.
 */
export async function POST(req: Request) {
  const auth = await requireUser()
  if (auth.error) return auth.error
  const { supabase, user } = auth

  const body = await readJson(req)
  if (!body || !isUuid(body.habit_id)) return jsonError('Invalid request')

  const profile = await loadProfile(supabase, user.id)
  if (!hasPro(profile)) return jsonError(PRO_REQUIRED, 403)

  const { data: recent } = await supabase
    .from('adjustment_suggestions')
    .select('*')
    .eq('habit_id', body.habit_id)
    .eq('user_id', user.id)
    .gte('created_at', new Date(Date.now() - 86_400_000).toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (recent) return NextResponse.json({ suggestion: recent, reused: true })

  const { today, views } = await loadHabitViews(supabase, user.id, profile.timezone, { habitId: body.habit_id })
  const view = views[0]
  if (!view) return jsonError('Habit not found', 404)

  const tracked = diffDays(today, view.start)
  if (tracked < MIN_DAYS) {
    return jsonError(`Give it two weeks of check-ins first. ${MIN_DAYS - tracked} days to go.`, 400)
  }

  const { habit, map, start, checkins } = view
  const breakdown = weekdayBreakdown(habit, map, today, start, 56)
    .filter((d) => d.due > 0)
    .map((d) => `${WEEKDAY_SHORT[d.day]} ${d.done}/${d.due}`)
    .join(', ')
  const since = addDays(today, -56)
  const recentCheckins = checkins.filter((c) => c.checkin_date >= since)
  const tags = tagCounts(recentCheckins)
    .slice(0, 4)
    .map((t) => `${TAG_LABEL[t.tag].toLowerCase()} (${t.count})`)
    .join(', ')
  const notes = recentCheckins
    .filter((c) => !c.completed && c.miss_reason)
    .slice(-6)
    .map((c) => c.miss_reason!.slice(0, 140))
  const priorRate = completionRate(habit, map, addDays(today, -28), start, 28)

  let out
  try {
    out = await suggestAdjustment({
      habitName: habit.name,
      commitment: commitmentText(habit),
      schedule: scheduleLabel(habit),
      daysTracked: tracked,
      completionLast4Weeks: pct(completionRate(habit, map, today, start, 28)),
      completionPrior4Weeks: pct(priorRate),
      weekdayBreakdown: habit.target_frequency === 'weekly' ? 'not tracked by weekday' : breakdown,
      topMissReasons: tags,
      recentMissNotes: notes,
      previousAdjustments: (habit.adjustment_history ?? [])
        .slice(-3)
        .map((a) => `${a.date}: ${a.from} to ${a.to}`)
        .join('; '),
    })
  } catch (err) {
    console.error('adjustment suggestion failed', err)
    return jsonError('Could not get a suggestion right now. Try again in a few minutes.', 502)
  }

  // Only one open suggestion per habit at a time.
  await supabase
    .from('adjustment_suggestions')
    .update({ status: 'dismissed', resolved_at: new Date().toISOString() })
    .eq('habit_id', habit.id)
    .eq('status', 'pending')

  const { data, error } = await supabase
    .from('adjustment_suggestions')
    .insert({
      ...out,
      habit_id: habit.id,
      user_id: user.id,
      status: out.should_adjust ? 'pending' : 'dismissed',
      resolved_at: out.should_adjust ? null : new Date().toISOString(),
    })
    .select('*')
    .single()
  if (error) return jsonError('Could not save the suggestion', 500)

  return NextResponse.json({ suggestion: data, reused: false })
}
