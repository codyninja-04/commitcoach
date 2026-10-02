import { NextResponse } from 'next/server'
import { jsonError, readJson, requireUser } from '@/lib/api'
import { loadHabitViews, loadProfile } from '@/lib/habits/load'
import { parseHabitInput } from '@/lib/habits/validate'
import { habitLimit } from '@/lib/plan'

export async function GET() {
  const auth = await requireUser()
  if (auth.error) return auth.error
  const { supabase, user } = auth

  const profile = await loadProfile(supabase, user.id)
  const { views } = await loadHabitViews(supabase, user.id, profile.timezone, { includeArchived: true })

  return NextResponse.json({
    habits: views.map((v) => ({ ...v.habit, current_streak: v.streaks.current, longest_streak: v.streaks.longest })),
  })
}

export async function POST(req: Request) {
  const auth = await requireUser()
  if (auth.error) return auth.error
  const { supabase, user } = auth

  const body = await readJson(req)
  if (!body) return jsonError('Invalid request')

  const parsed = parseHabitInput(body, false)
  if (parsed.error !== undefined) return jsonError(parsed.error)
  const input = parsed.value

  const profile = await loadProfile(supabase, user.id)
  const limit = habitLimit(profile)
  if (limit !== null) {
    const { count } = await supabase
      .from('habits')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_active', true)
    if ((count ?? 0) >= limit) {
      return jsonError(`Free accounts can track ${limit} habits at a time. Archive one or upgrade to Pro.`, 403)
    }
  }

  const commitment = input.current_commitment ?? null
  const { data, error } = await supabase
    .from('habits')
    .insert({
      ...input,
      user_id: user.id,
      original_commitment: commitment,
      current_commitment: commitment,
    })
    .select('*')
    .single()

  if (error) return jsonError('Could not save the habit', 500)
  return NextResponse.json({ habit: data }, { status: 201 })
}
