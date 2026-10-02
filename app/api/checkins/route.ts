import { NextResponse } from 'next/server'
import { cleanText, isUuid, jsonError, readJson, requireUser } from '@/lib/api'
import { addDays, isDateString, todayIn } from '@/lib/dates'
import { loadHabitViews, loadProfile, syncStreakCache } from '@/lib/habits/load'
import { CONTEXT_TAGS, type ContextTag } from '@/lib/types'

/** How far back a check-in can be logged or changed. */
const BACKFILL_DAYS = 6

export async function POST(req: Request) {
  const auth = await requireUser()
  if (auth.error) return auth.error
  const { supabase, user } = auth

  const body = await readJson(req)
  if (!body || !isUuid(body.habit_id) || typeof body.completed !== 'boolean') return jsonError('Invalid request')

  const profile = await loadProfile(supabase, user.id)
  const today = todayIn(profile.timezone)
  const date = isDateString(body.date) ? body.date : today
  if (date > today) return jsonError('That day has not happened yet')
  if (date < addDays(today, -BACKFILL_DAYS)) return jsonError(`You can log up to ${BACKFILL_DAYS} days back`)

  const { data: habit } = await supabase
    .from('habits')
    .select('id, is_active')
    .eq('id', body.habit_id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!habit) return jsonError('Habit not found', 404)
  if (!habit.is_active) return jsonError('This habit is archived')

  const tags = Array.isArray(body.context_tags)
    ? CONTEXT_TAGS.filter((t) => (body.context_tags as unknown[]).includes(t))
    : []

  const row = {
    habit_id: habit.id,
    user_id: user.id,
    checkin_date: date,
    completed: body.completed,
    logged_at: new Date().toISOString(),
    miss_reason: body.completed ? null : cleanText(body.miss_reason, 500),
    context_tags: body.completed ? null : (tags as ContextTag[]),
    ai_reflection: null,
    ai_suggestion: null,
  }

  const { data: checkin, error } = await supabase
    .from('checkins')
    .upsert(row, { onConflict: 'habit_id,checkin_date' })
    .select('*')
    .single()
  if (error) return jsonError('Could not save the check-in', 500)

  const { views } = await loadHabitViews(supabase, user.id, profile.timezone, { habitId: habit.id })
  if (views[0]) await syncStreakCache(supabase, views[0])

  return NextResponse.json({ checkin, streaks: views[0]?.streaks ?? null })
}

/** Undo: removes the check-in for a habit on a date. */
export async function DELETE(req: Request) {
  const auth = await requireUser()
  if (auth.error) return auth.error
  const { supabase, user } = auth

  const url = new URL(req.url)
  const habitId = url.searchParams.get('habit_id')
  const date = url.searchParams.get('date')
  if (!isUuid(habitId) || !isDateString(date)) return jsonError('Invalid request')

  const profile = await loadProfile(supabase, user.id)
  const today = todayIn(profile.timezone)
  if (date < addDays(today, -BACKFILL_DAYS)) return jsonError('That check-in is too old to change')

  const { error } = await supabase
    .from('checkins')
    .delete()
    .eq('habit_id', habitId)
    .eq('user_id', user.id)
    .eq('checkin_date', date)
  if (error) return jsonError('Could not undo the check-in', 500)

  const { views } = await loadHabitViews(supabase, user.id, profile.timezone, { habitId })
  if (views[0]) await syncStreakCache(supabase, views[0])

  return NextResponse.json({ ok: true, streaks: views[0]?.streaks ?? null })
}
