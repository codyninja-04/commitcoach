import type { SupabaseClient } from '@supabase/supabase-js'
import { addDays, todayIn } from '@/lib/dates'
import type { Checkin, Habit, Profile } from '@/lib/types'
import { type CheckinMap, type Streaks, computeStreaks, habitStart, toMap } from './schedule'

/** How far back pages read check-ins. Long enough for the 90 day grid and streaks. */
export const HISTORY_DAYS = 400

export interface HabitView {
  habit: Habit
  checkins: Checkin[]
  map: CheckinMap
  start: string
  streaks: Streaks
}

export async function loadProfile(supabase: SupabaseClient, userId: string): Promise<Profile> {
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (data) return data as Profile

  // The sign up trigger normally creates this. Covers users from before it existed.
  const { data: created } = await supabase.from('profiles').insert({ id: userId }).select('*').single()
  return (
    (created as Profile | null) ?? {
      id: userId,
      display_name: null,
      timezone: 'Asia/Singapore',
      plan: 'free',
      reminder_enabled: false,
      reminder_hour: 20,
      last_reminded_on: null,
    }
  )
}

export function buildView(habit: Habit, checkins: Checkin[], today: string, tz: string): HabitView {
  const map = toMap(checkins)
  const start = habitStart(habit, map, tz)
  const computed = computeStreaks(habit, map, today, start)
  // Keep a longest streak that predates the history window.
  const streaks = { ...computed, longest: Math.max(computed.longest, habit.longest_streak ?? 0) }
  return { habit, checkins, map, start, streaks }
}

export async function loadHabitViews(
  supabase: SupabaseClient,
  userId: string,
  tz: string,
  opts: { includeArchived?: boolean; habitId?: string } = {}
): Promise<{ today: string; views: HabitView[] }> {
  const today = todayIn(tz)
  const since = addDays(today, -HISTORY_DAYS)

  let habitsQuery = supabase.from('habits').select('*').eq('user_id', userId).order('created_at', { ascending: true })
  if (!opts.includeArchived) habitsQuery = habitsQuery.eq('is_active', true)
  if (opts.habitId) habitsQuery = habitsQuery.eq('id', opts.habitId)

  let checkinsQuery = supabase
    .from('checkins')
    .select('*')
    .eq('user_id', userId)
    .gte('checkin_date', since)
    .order('checkin_date', { ascending: true })
  if (opts.habitId) checkinsQuery = checkinsQuery.eq('habit_id', opts.habitId)

  const [{ data: habits }, { data: checkins }] = await Promise.all([habitsQuery, checkinsQuery])

  const byHabit = new Map<string, Checkin[]>()
  for (const c of (checkins ?? []) as Checkin[]) {
    const list = byHabit.get(c.habit_id) ?? []
    list.push(c)
    byHabit.set(c.habit_id, list)
  }

  const views = ((habits ?? []) as Habit[]).map((h) => buildView(h, byHabit.get(h.id) ?? [], today, tz))
  return { today, views }
}

/** Writes the computed streaks back to the cache columns when they changed. */
export async function syncStreakCache(supabase: SupabaseClient, view: HabitView) {
  const { habit, streaks } = view
  if (habit.current_streak === streaks.current && habit.longest_streak === streaks.longest) return
  await supabase
    .from('habits')
    .update({ current_streak: streaks.current, longest_streak: streaks.longest })
    .eq('id', habit.id)
}
