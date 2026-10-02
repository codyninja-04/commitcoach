import { addDays, dateRange, diffDays, formatDate, startOfWeek, weekdayOf } from '@/lib/dates'
import type { Checkin, ContextTag, DayStatus, Habit, Weekday } from '@/lib/types'
import { WEEKDAYS } from '@/lib/types'
import { type CheckinMap, dayStatus, isScheduledWeekday, weekCompletions } from './schedule'

/**
 * Plain number crunching over check-ins. Anything that can be counted is
 * counted here rather than asked of the model, so the evidence shown next to
 * an AI insight is always exact.
 */

type ScheduleFields = Pick<Habit, 'target_frequency' | 'custom_days' | 'weekly_target' | 'created_at'>

export interface DayCell {
  date: string
  status: DayStatus
}

export function history(habit: ScheduleFields, map: CheckinMap, today: string, start: string, days: number): DayCell[] {
  return dateRange(addDays(today, -(days - 1)), today).map((date) => ({
    date,
    status: dayStatus(habit, date, map, today, start),
  }))
}

export interface WeekdayStat {
  day: Weekday
  due: number
  done: number
  missed: number
}

/** Per weekday counts over a trailing window. Today is left out unless logged. */
export function weekdayBreakdown(
  habit: ScheduleFields,
  map: CheckinMap,
  today: string,
  start: string,
  windowDays = 56
): WeekdayStat[] {
  const stats = new Map<Weekday, WeekdayStat>(WEEKDAYS.map((d) => [d, { day: d, due: 0, done: 0, missed: 0 }]))
  for (const cell of history(habit, map, today, start, windowDays)) {
    const s = stats.get(weekdayOf(cell.date))!
    if (cell.status === 'done') {
      s.due++
      s.done++
    } else if (cell.status === 'missed' || (cell.status === 'unlogged' && cell.date !== today)) {
      s.due++
      s.missed++
    }
  }
  return WEEKDAYS.map((d) => stats.get(d)!)
}

/** Completion rate over a trailing window, or null when nothing was due yet. */
export function completionRate(
  habit: ScheduleFields,
  map: CheckinMap,
  today: string,
  start: string,
  windowDays = 28
): number | null {
  if (habit.target_frequency === 'weekly') {
    const target = habit.weekly_target ?? 1
    let met = 0
    let total = 0
    const thisWeek = startOfWeek(today)
    for (let i = Math.ceil(windowDays / 7); i >= 1; i--) {
      const week = addDays(thisWeek, -7 * i)
      if (addDays(week, 6) < start) continue
      total++
      if (weekCompletions(week, map) >= target) met++
    }
    return total ? met / total : null
  }

  let due = 0
  let done = 0
  for (const cell of history(habit, map, today, start, windowDays)) {
    if (cell.status === 'done') {
      due++
      done++
    } else if (cell.status === 'missed' || (cell.status === 'unlogged' && cell.date !== today)) {
      due++
    }
  }
  return due ? done / due : null
}

export function tagCounts(checkins: Pick<Checkin, 'completed' | 'context_tags'>[]): { tag: ContextTag; count: number }[] {
  const counts = new Map<ContextTag, number>()
  for (const c of checkins) {
    if (c.completed) continue
    for (const t of c.context_tags ?? []) counts.set(t, (counts.get(t) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
}

export interface WeekdayPattern {
  day: Weekday
  missed: number
  of: number
  commonTag: ContextTag | null
  otherRate: number
}

/** Minimum history before we call anything a pattern. Matches the spec's three weeks. */
export const PATTERN_MIN_DAYS = 21

/**
 * Looks for one weekday that fails far more often than the rest, using the
 * last six occurrences of each day. Needs three weeks of history, three or
 * more misses, and a clear gap against the other days so a generally rough
 * month does not get blamed on Mondays.
 */
export function detectWeekdayPattern(
  habit: ScheduleFields,
  map: CheckinMap,
  checkins: Pick<Checkin, 'checkin_date' | 'completed' | 'context_tags'>[],
  today: string,
  start: string
): WeekdayPattern | null {
  if (habit.target_frequency === 'weekly') return null
  if (diffDays(today, start) < PATTERN_MIN_DAYS) return null

  const yesterday = addDays(today, -1)
  const cells = history(habit, map, yesterday, start, 42).filter(
    (c) => c.status === 'done' || c.status === 'missed' || c.status === 'unlogged'
  )

  let best: WeekdayPattern | null = null
  for (const day of WEEKDAYS) {
    if (!isScheduledWeekday(habit, day)) continue
    const mine = cells.filter((c) => weekdayOf(c.date) === day).slice(-6)
    const others = cells.filter((c) => weekdayOf(c.date) !== day)
    if (mine.length < 4 || others.length < 4) continue

    const missed = mine.filter((c) => c.status !== 'done').length
    const rate = missed / mine.length
    const otherRate = others.filter((c) => c.status !== 'done').length / others.length
    if (missed < 3 || rate < 0.6 || rate - otherRate < 0.25) continue

    if (!best || rate > best.missed / best.of) {
      const tags = tagCounts(checkins.filter((c) => weekdayOf(c.checkin_date) === day))
      best = { day, missed, of: mine.length, commonTag: tags[0]?.tag ?? null, otherRate }
    }
  }
  return best
}

export interface ConsistencyPoint {
  week: string
  label: string
  overall: number | null
  [habitId: string]: number | null | string
}

/**
 * Weekly completion percentage, overall and per habit, for the trend chart.
 * Weekly-target habits count as min(done, target) out of target.
 */
export function weeklyConsistency(
  habits: { habit: ScheduleFields & { id: string }; map: CheckinMap; start: string }[],
  today: string,
  weeks = 12
): ConsistencyPoint[] {
  const thisWeek = startOfWeek(today)
  const points: ConsistencyPoint[] = []

  for (let i = weeks - 1; i >= 0; i--) {
    const week = addDays(thisWeek, -7 * i)
    const point: ConsistencyPoint = { week, label: formatDate(week), overall: null }
    let allDue = 0
    let allDone = 0

    for (const { habit, map, start } of habits) {
      let due = 0
      let done = 0
      if (habit.target_frequency === 'weekly') {
        if (addDays(week, 6) >= start) {
          const target = habit.weekly_target ?? 1
          const count = weekCompletions(week, map, today)
          // The current week only counts as far as it has got.
          if (week !== thisWeek || count >= target) {
            due = target
            done = Math.min(count, target)
          }
        }
      } else {
        for (let d = 0; d < 7; d++) {
          const date = addDays(week, d)
          if (date > today) break
          const status = dayStatus(habit, date, map, today, start)
          if (status === 'done') {
            due++
            done++
          } else if (status === 'missed' || (status === 'unlogged' && date !== today)) {
            due++
          }
        }
      }
      point[habit.id] = due ? Math.round((done / due) * 100) : null
      allDue += due
      allDone += done
    }

    point.overall = allDue ? Math.round((allDone / allDue) * 100) : null
    points.push(point)
  }
  return points
}

export function pct(rate: number | null): string {
  return rate === null ? '--' : `${Math.round(rate * 100)}%`
}
