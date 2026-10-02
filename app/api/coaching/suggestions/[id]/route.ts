import { NextResponse } from 'next/server'
import { isUuid, jsonError, readJson, requireUser } from '@/lib/api'
import { todayIn } from '@/lib/dates'
import { describeCommitment } from '@/lib/habits/describe'
import { loadProfile } from '@/lib/habits/load'
import type { Adjustment, AdjustmentSuggestion, Habit } from '@/lib/types'

/** Accept applies the suggestion to the habit and logs it. Keep as is just closes it. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  if (!isUuid(params.id)) return jsonError('Not found', 404)
  const auth = await requireUser()
  if (auth.error) return auth.error
  const { supabase, user } = auth

  const body = await readJson(req)
  const action = body?.action
  if (action !== 'accept' && action !== 'dismiss') return jsonError('Invalid request')

  const { data: row } = await supabase
    .from('adjustment_suggestions')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .maybeSingle()
  const suggestion = row as AdjustmentSuggestion | null
  if (!suggestion) return jsonError('Not found', 404)
  if (suggestion.status !== 'pending') return jsonError('This suggestion was already handled')

  const resolvedAt = new Date().toISOString()

  if (action === 'dismiss') {
    await supabase
      .from('adjustment_suggestions')
      .update({ status: 'dismissed', resolved_at: resolvedAt })
      .eq('id', suggestion.id)
    return NextResponse.json({ ok: true })
  }

  if (!suggestion.should_adjust || !suggestion.suggested_frequency || !suggestion.suggested_commitment) {
    return jsonError('There is nothing to apply')
  }

  const { data: habitRow } = await supabase.from('habits').select('*').eq('id', suggestion.habit_id).maybeSingle()
  const habit = habitRow as Habit | null
  if (!habit) return jsonError('Habit not found', 404)

  const profile = await loadProfile(supabase, user.id)
  const next: Habit = {
    ...habit,
    current_commitment: suggestion.suggested_commitment,
    target_frequency: suggestion.suggested_frequency,
    custom_days: suggestion.suggested_frequency === 'custom' ? suggestion.suggested_custom_days : null,
    weekly_target: suggestion.suggested_frequency === 'weekly' ? suggestion.suggested_weekly_target : null,
  }
  const entry: Adjustment = {
    date: todayIn(profile.timezone),
    from: describeCommitment(habit),
    to: describeCommitment(next),
    reason: suggestion.reason,
  }

  const { data: updated, error } = await supabase
    .from('habits')
    .update({
      current_commitment: next.current_commitment,
      target_frequency: next.target_frequency,
      custom_days: next.custom_days,
      weekly_target: next.weekly_target,
      original_commitment: habit.original_commitment ?? habit.current_commitment ?? habit.name,
      adjustment_history: [...(habit.adjustment_history ?? []), entry],
    })
    .eq('id', habit.id)
    .select('*')
    .single()
  if (error) return jsonError('Could not apply the adjustment', 500)

  await supabase
    .from('adjustment_suggestions')
    .update({ status: 'accepted', resolved_at: resolvedAt })
    .eq('id', suggestion.id)

  return NextResponse.json({ ok: true, habit: updated })
}
