import type { Weekday } from './types'

/**
 * Every date in the app is a plain 'YYYY-MM-DD' string in the user's own
 * timezone. Arithmetic happens at UTC noon so daylight saving never shifts a
 * day, and nothing here depends on the server's local clock.
 */

const DAY_MS = 86_400_000
const UTC_WEEKDAYS: Weekday[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

export function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
    return true
  } catch {
    return false
  }
}

function safeTz(tz: string | null | undefined): string {
  return tz && isValidTimezone(tz) ? tz : 'Asia/Singapore'
}

/** The calendar date of an instant, as seen in a timezone. */
export function dateInTz(instant: Date | string, tz: string): string {
  const d = typeof instant === 'string' ? new Date(instant) : instant
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: safeTz(tz),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

export function todayIn(tz: string): string {
  return dateInTz(new Date(), tz)
}

/** Current hour (0 to 23) in a timezone. */
export function hourIn(tz: string, now = new Date()): number {
  const h = new Intl.DateTimeFormat('en-US', { timeZone: safeTz(tz), hour: 'numeric', hourCycle: 'h23' }).format(now)
  return Number(h) % 24
}

function toUtcNoon(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  return Date.UTC(y, m - 1, d, 12)
}

function fromUtc(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

export function addDays(date: string, n: number): string {
  return fromUtc(toUtcNoon(date) + n * DAY_MS)
}

export function diffDays(later: string, earlier: string): number {
  return Math.round((toUtcNoon(later) - toUtcNoon(earlier)) / DAY_MS)
}

export function weekdayOf(date: string): Weekday {
  return UTC_WEEKDAYS[new Date(toUtcNoon(date)).getUTCDay()]
}

/** Monday of the week containing the date. Weeks start on Monday. */
export function startOfWeek(date: string): string {
  const dow = new Date(toUtcNoon(date)).getUTCDay()
  const back = (dow + 6) % 7
  return addDays(date, -back)
}

/** Inclusive list of dates from start to end. */
export function dateRange(start: string, end: string): string[] {
  const out: string[] = []
  const n = diffDays(end, start)
  for (let i = 0; i <= n; i++) out.push(addDays(start, i))
  return out
}

export function isDateString(v: unknown): v is string {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(toUtcNoon(v))
}

export function formatDate(date: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }): string {
  return new Intl.DateTimeFormat('en-SG', { ...opts, timeZone: 'UTC' }).format(new Date(toUtcNoon(date)))
}

export function formatLongDate(date: string): string {
  return formatDate(date, { weekday: 'long', day: 'numeric', month: 'long' })
}

export function relativeDay(date: string, today: string): string {
  const d = diffDays(today, date)
  if (d === 0) return 'Today'
  if (d === 1) return 'Yesterday'
  if (d < 7) return formatDate(date, { weekday: 'long' })
  return formatDate(date)
}
