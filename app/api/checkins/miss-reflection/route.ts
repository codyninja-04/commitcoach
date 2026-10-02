import { NextResponse } from 'next/server'
import { isUuid, jsonError, readJson, requireUser } from '@/lib/api'
import { addDays, weekdayOf } from '@/lib/dates'
import { fallbackReflection, reflectOnMiss } from '@/lib/claude/miss-reflector'
import { buildView, loadHabitViews, loadProfile } from '@/lib/habits/load'
import { commitmentText } from '@/lib/habits/schedule'
import { completionRate, pct } from '@/lib/habits/stats'
import { hasPro } from '@/lib/plan'
import type { Checkin } from '@/lib/types'
import { WEEKDAY_LABEL } from '@/lib/types'

export const maxDuration = 30

/**
 * Claude reflects on one missed check-in. The result is stored on the row,
 * so asking twice for the same miss costs nothing.
 */
export async function POST(req: Request) {
  const auth = await requireUser()
  if (auth.error) return auth.error
  const { supabase, user } = auth

  const body = await readJson(req)
  if (!body || !isUuid(body.checkin_id)) return jsonError('Invalid request')

  const { data: row } = await supabase
    .from('checkins')
    .select('*')
    .eq('id', body.checkin_id)
    .eq('user_id', user.id)
    .maybeSingle()
  const checkin = row as Checkin | null
  if (!checkin) return jsonError('Check-in not found', 404)
  if (checkin.completed) return jsonError('Reflections are only for missed days')

  if (checkin.ai_reflection) {
    return NextResponse.json({ reflection: checkin.ai_reflection, suggestion: checkin.ai_suggestion, ai: true })
  }

  const tags = checkin.context_tags ?? []
  const profile = await loadProfile(supabase, user.id)

  if (!hasPro(profile)) {
    return NextResponse.json({ reflection: fallbackReflection(tags), suggestion: null, ai: false })
  }

  const { today, views } = await loadHabitViews(supabase, user.id, profile.timezone, {
    habitId: checkin.habit_id,
    includeArchived: true,
  })
  const view = views[0]
  if (!view) return jsonError('Habit not found', 404)

  // Streak as it stood going into the missed day.
  const before = buildView(
    view.habit,
    view.checkins.filter((c) => c.checkin_date < checkin.checkin_date),
    addDays(checkin.checkin_date, -1),
    profile.timezone
  )

  const since = addDays(today, -42)
  const recentMissHistory = view.checkins
    .filter((c) => !c.completed && c.id !== checkin.id && c.checkin_date >= since)
    .map((c) => ({
      date: c.checkin_date,
      weekday: WEEKDAY_LABEL[weekdayOf(c.checkin_date)],
      reason: c.miss_reason,
      tags: c.context_tags ?? [],
    }))

  let reflection: string
  let suggestion: string | null = null
  let ai = true
  try {
    const out = await reflectOnMiss({
      habitName: view.habit.name,
      commitment: commitmentText(view.habit),
      weekday: WEEKDAY_LABEL[weekdayOf(checkin.checkin_date)],
      missReason: checkin.miss_reason,
      contextTags: tags,
      recentMissHistory,
      currentStreak: before.streaks.current,
      streakUnit: before.streaks.unit,
      completionRate: pct(completionRate(view.habit, view.map, today, view.start, 28)),
    })
    reflection = out.reflection || fallbackReflection(tags)
    suggestion = out.suggestion
  } catch (err) {
    console.error('miss reflection failed', err)
    reflection = fallbackReflection(tags)
    ai = false
  }

  if (ai) {
    await supabase
      .from('checkins')
      .update({ ai_reflection: reflection, ai_suggestion: suggestion })
      .eq('id', checkin.id)
  }

  return NextResponse.json({ reflection, suggestion, ai })
}
