import { addDays, dateInTz, dateRange, startOfWeek, weekdayOf } from '@/lib/dates'
import type { DayStatus, Habit, Weekday } from '@/lib/types'
import { WEEKDAY_SHORT } from '@/lib/types'

/**
 * Scheduling and streak rules. These run on the server for every page so the
 * numbers never drift from the raw check-ins. The stored streak columns are
 * only a cache for things like the reminder cron.
 *
 * Rules:
 * - A due day with no check-in counts as a miss once the day is over. Today
 *   is never held against you until it ends.
 * - Weekly habits (N times a week) have no fixed days. Their streak is counted
 *   in weeks where the target was hit. The current week only counts once met.
 */

export interface SlimCheckin {
  checkin_date: string
  completed: boolean
}

export type CheckinMap = Map<string, SlimCheckin>

type ScheduleFields = Pick<Habit, 'target_frequency' | 'custom_days' | 'weekly_target' | 'created_at'>

export function toMap(checkins: SlimCheckin[]): CheckinMap {
  const map: CheckinMap = new Map()
  for (const c of checkins) map.set(c.checkin_date, c)
  return map
}

/** For day based habits, whether this weekday is one the habit is meant to happen. */
export function isScheduledWeekday(habit: ScheduleFields, day: Weekday): boolean {
  switch (habit.target_frequency) {
    case 'daily':
      return true
    case 'weekdays':
      return day !== 'sat' && day !== 'sun'
    case 'custom':
      return (habit.custom_days ?? []).includes(day)
    case 'weekly':
      return true
  }
}

export function scheduleLabel(habit: Pick<Habit, 'target_frequency' | 'custom_days' | 'weekly_target'>): string {
  switch (habit.target_frequency) {
    case 'daily':
      return 'Every day'
    case 'weekdays':
      return 'Weekdays'
    case 'weekly': {
      const n = habit.weekly_target ?? 1
      return n === 1 ? 'Once a week' : `${n}x a week`
    }
    case 'custom': {
      const order: Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
      const days = order.filter((d) => habit.custom_days?.includes(d))
      return days.length ? days.map((d) => WEEKDAY_SHORT[d]).join(', ') : 'No days set'
    }
  }
}

/**
 * The first day a habit is judged. Normally the day it was created, but a
 * back-filled check-in from earlier pulls the start back to it.
 */
export function habitStart(habit: ScheduleFields, map: CheckinMap, tz: string): string {
  let start = dateInTz(habit.created_at, tz)
  map.forEach((_, date) => {
    if (date < start) start = date
  })
  return start
}

export function weekCompletions(weekStart: string, map: CheckinMap, until?: string): number {
  let n = 0
  for (let i = 0; i < 7; i++) {
    const d = addDays(weekStart, i)
    if (until && d > until) break
    if (map.get(d)?.completed) n++
  }
  return n
}

export function dayStatus(
  habit: ScheduleFields,
  date: string,
  map: CheckinMap,
  today: string,
  start: string
): DayStatus {
  if (date > today) return 'future'
  const c = map.get(date)
  if (c) return c.completed ? 'done' : 'missed'
  if (date < start) return 'before_start'
  if (habit.target_frequency === 'weekly') return 'not_due'
  if (!isScheduledWeekday(habit, weekdayOf(date))) return 'not_due'
  return 'unlogged'
}

/**
 * Whether the habit belongs on the check-in list for a given date. Weekly
 * habits stay on the list until the week's target is met, and also show on
 * any day that already has a check-in so it can be changed.
 */
export function isDueOn(habit: ScheduleFields, date: string, map: CheckinMap): boolean {
  if (map.has(date)) return true
  if (habit.target_frequency === 'weekly') {
    const done = weekCompletions(startOfWeek(date), map)
    return done < (habit.weekly_target ?? 1)
  }
  return isScheduledWeekday(habit, weekdayOf(date))
}

export interface Streaks {
  current: number
  longest: number
  unit: 'days' | 'weeks'
}

export function computeStreaks(habit: ScheduleFields, map: CheckinMap, today: string, start: string): Streaks {
  if (habit.target_frequency === 'weekly') return weeklyStreaks(habit, map, today, start)

  let run = 0
  let longest = 0
  for (const date of dateRange(start, today)) {
    const status = dayStatus(habit, date, map, today, start)
    if (status === 'done') {
      run++
      if (run > longest) longest = run
    } else if (status === 'missed') {
      run = 0
    } else if (status === 'unlogged' && date !== today) {
      run = 0
    }
  }
  return { current: run, longest, unit: 'days' }
}

function weeklyStreaks(habit: ScheduleFields, map: CheckinMap, today: string, start: string): Streaks {
  const target = habit.weekly_target ?? 1
  const thisWeek = startOfWeek(today)
  let run = 0
  let longest = 0
  for (let week = startOfWeek(start); week <= thisWeek; week = addDays(week, 7)) {
    const done = weekCompletions(week, map, today)
    if (done >= target) {
      run++
      if (run > longest) longest = run
    } else if (week !== thisWeek) {
      run = 0
    }
  }
  return { current: run, longest, unit: 'weeks' }
}

/** Plain description of the commitment, falling back to the schedule. */
export function commitmentText(habit: Habit): string {
  return habit.current_commitment?.trim() || `${habit.name}, ${scheduleLabel(habit).toLowerCase()}`
}
