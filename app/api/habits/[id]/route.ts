import { NextResponse } from 'next/server'
import { isUuid, jsonError, readJson, requireUser } from '@/lib/api'
import { todayIn } from '@/lib/dates'
import { describeCommitment } from '@/lib/habits/describe'
import { loadHabitViews, loadProfile } from '@/lib/habits/load'
import { parseHabitInput } from '@/lib/habits/validate'
import { habitLimit } from '@/lib/plan'
import type { Adjustment, Habit } from '@/lib/types'

type Ctx = { params: { id: string } }

export async function GET(_req: Request, { params }: Ctx) {
  if (!isUuid(params.id)) return jsonError('Not found', 404)
  const auth = await requireUser()
  if (auth.error) return auth.error
  const { supabase, user } = auth

  const profile = await loadProfile(supabase, user.id)
  const { views } = await loadHabitViews(supabase, user.id, profile.timezone, {
    includeArchived: true,
    habitId: params.id,
  })
  const view = views[0]
  if (!view) return jsonError('Not found', 404)

  return NextResponse.json({ habit: view.habit, checkins: view.checkins, streaks: view.streaks })
}

export async function PATCH(req: Request, { params }: Ctx) {
  if (!isUuid(params.id)) return jsonError('Not found', 404)
  const auth = await requireUser()
  if (auth.error) return auth.error
  const { supabase, user } = auth

  const body = await readJson(req)
  if (!body) return jsonError('Invalid request')

  const { data: existing } = await supabase.from('habits').select('*').eq('id', params.id).eq('user_id', user.id).maybeSingle()
  if (!existing) return jsonError('Not found', 404)
  const habit = existing as Habit

  const parsed = parseHabitInput(body, true)
  if (parsed.error !== undefined) return jsonError(parsed.error)
  const update: Record<string, unknown> = { ...parsed.value }

  const profile = await loadProfile(supabase, user.id)

  if (typeof body.is_active === 'boolean') {
    if (body.is_active && !habit.is_active) {
      const limit = habitLimit(profile)
      if (limit !== null) {
        const { count } = await supabase
          .from('habits')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_active', true)
        if ((count ?? 0) >= limit) return jsonError(`Free accounts can track ${limit} habits at a time.`, 403)
      }
    }
    update.is_active = body.is_active
  }

  // A manual change to the commitment or schedule is still an adjustment worth remembering.
  const after = { ...habit, ...parsed.value } as Habit
  const key = (h: Habit) =>
    JSON.stringify([h.current_commitment ?? '', h.target_frequency, h.custom_days ?? [], h.weekly_target ?? null])
  if (key(habit) !== key(after)) {
    const entry: Adjustment = {
      date: todayIn(profile.timezone),
      from: describeCommitment(habit),
      to: describeCommitment(after),
      reason: 'Edited by you',
    }
    update.adjustment_history = [...(habit.adjustment_history ?? []), entry]
    if (!habit.original_commitment && habit.current_commitment) update.original_commitment = habit.current_commitment
  }

  const { data, error } = await supabase.from('habits').update(update).eq('id', params.id).select('*').single()
  if (error) return jsonError('Could not update the habit', 500)
  return NextResponse.json({ habit: data })
}

export async function DELETE(_req: Request, { params }: Ctx) {
  if (!isUuid(params.id)) return jsonError('Not found', 404)
  const auth = await requireUser()
  if (auth.error) return auth.error
  const { supabase, user } = auth

  const { error } = await supabase.from('habits').delete().eq('id', params.id).eq('user_id', user.id)
  if (error) return jsonError('Could not delete the habit', 500)
  return NextResponse.json({ ok: true })
}
