import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/api'

/** Everything we hold for the user, as one JSON file. */
export async function GET() {
  const auth = await requireUser()
  if (auth.error) return auth.error
  const { supabase, user } = auth

  const [profile, habits, checkins, patterns, suggestions] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('habits').select('*').eq('user_id', user.id),
    supabase.from('checkins').select('*').eq('user_id', user.id).order('checkin_date'),
    supabase.from('pattern_insights').select('*').eq('user_id', user.id),
    supabase.from('adjustment_suggestions').select('*').eq('user_id', user.id),
  ])

  const payload = {
    exported_at: new Date().toISOString(),
    email: user.email,
    profile: profile.data,
    habits: habits.data ?? [],
    checkins: checkins.data ?? [],
    pattern_insights: patterns.data ?? [],
    adjustment_suggestions: suggestions.data ?? [],
  }

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="commitcoach-export.json"',
    },
  })
}
