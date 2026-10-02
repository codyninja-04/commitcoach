import { NextResponse } from 'next/server'
import { addDays, hourIn, todayIn } from '@/lib/dates'
import { isDueOn, toMap } from '@/lib/habits/schedule'
import { pushConfigured, sendPush } from '@/lib/push'
import { createServiceClient } from '@/lib/supabase/server'
import type { Habit, Profile } from '@/lib/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Runs hourly (see .github/workflows/reminders.yml). For each user whose local
 * time matches their reminder hour, sends one nudge if anything due today is
 * still unlogged. Never sends twice on the same local day.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }
  if (!pushConfigured()) return NextResponse.json({ skipped: 'VAPID keys not set' })

  const supabase = createServiceClient()
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, timezone, reminder_hour, last_reminded_on')
    .eq('reminder_enabled', true)

  let sent = 0
  let checked = 0
  const now = new Date()

  for (const p of (profiles ?? []) as Pick<Profile, 'id' | 'timezone' | 'reminder_hour' | 'last_reminded_on'>[]) {
    if (hourIn(p.timezone, now) !== p.reminder_hour) continue
    const today = todayIn(p.timezone)
    if (p.last_reminded_on === today) continue
    checked++

    const [{ data: habits }, { data: checkins }, { data: subs }] = await Promise.all([
      supabase.from('habits').select('*').eq('user_id', p.id).eq('is_active', true),
      supabase
        .from('checkins')
        .select('habit_id, checkin_date, completed')
        .eq('user_id', p.id)
        .gte('checkin_date', addDays(today, -7)),
      supabase.from('push_subscriptions').select('endpoint, p256dh, auth').eq('user_id', p.id),
    ])
    if (!subs?.length) continue

    const pending = ((habits ?? []) as Habit[]).filter((h) => {
      const map = toMap((checkins ?? []).filter((c) => c.habit_id === h.id))
      return isDueOn(h, today, map) && !map.has(today)
    })

    await supabase.from('profiles').update({ last_reminded_on: today }).eq('id', p.id)
    if (!pending.length) continue

    const body =
      pending.length === 1
        ? `${pending[0].name} is still open for today. Done or not, log it honestly.`
        : `${pending.length} habits are still open for today. Done or not, log them honestly.`

    for (const sub of subs) {
      const result = await sendPush(sub, { title: 'Daily check-in', body, url: '/today' })
      if (result === 'sent') sent++
      if (result === 'gone') await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
    }
  }

  return NextResponse.json({ checked, sent })
}
