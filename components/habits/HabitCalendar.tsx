import { addDays, formatDate, startOfWeek } from '@/lib/dates'
import type { DayStatus } from '@/lib/types'
import { STATUS_CLASS } from './HabitCard'

const STATUS_TEXT: Record<DayStatus, string> = {
  done: 'done',
  missed: 'missed',
  unlogged: 'not logged',
  not_due: 'not due',
  before_start: 'before you started',
  future: '',
}

/**
 * GitHub style grid of the last 90 days. Columns are weeks starting Monday,
 * rows are weekdays. Misses use a soft tone on purpose: a missed day is data.
 */
export function HabitCalendar({ cells, today }: { cells: { date: string; status: DayStatus }[]; today: string }) {
  const byDate = new Map(cells.map((c) => [c.date, c.status]))
  const first = startOfWeek(cells[0]?.date ?? today)
  const last = startOfWeek(today)

  const weeks: string[] = []
  for (let w = first; w <= last; w = addDays(w, 7)) weeks.push(w)

  const months = weeks.map((w, i) => {
    const label = formatDate(w, { month: 'short' })
    const prev = i > 0 ? formatDate(weeks[i - 1], { month: 'short' }) : null
    return label !== prev ? label : ''
  })

  const counts = cells.reduce(
    (acc, c) => {
      if (c.status === 'done') acc.done++
      if (c.status === 'missed') acc.missed++
      if (c.status === 'unlogged' && c.date !== today) acc.unlogged++
      return acc
    },
    { done: 0, missed: 0, unlogged: 0 }
  )

  return (
    <div>
      <div className="flex max-w-[440px] gap-2">
        <div className="grid shrink-0 grid-rows-[14px_repeat(7,minmax(0,1fr))] gap-[3px] pr-1 text-[10px] text-muted">
          <span />
          {['Mon', '', 'Wed', '', 'Fri', '', 'Sun'].map((d, i) => (
            <span key={i} className="flex items-center leading-none">
              {d}
            </span>
          ))}
        </div>

        <div
          className="grid flex-1 gap-[3px]"
          style={{ gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))` }}
          role="grid"
          aria-label="Check-ins over the last 90 days"
        >
          {weeks.map((week, wi) => (
            <div key={week} className="grid grid-rows-[14px_repeat(7,minmax(0,1fr))] gap-[3px]" role="row">
              <span className="truncate text-[10px] leading-[14px] text-muted">{months[wi]}</span>
              {Array.from({ length: 7 }, (_, d) => {
                const date = addDays(week, d)
                const status = byDate.get(date) ?? (date > today ? 'future' : 'before_start')
                const label = status === 'future' ? '' : `${formatDate(date, { weekday: 'short', day: 'numeric', month: 'short' })}: ${STATUS_TEXT[status]}`
                return (
                  <span
                    key={date}
                    role="gridcell"
                    title={label || undefined}
                    aria-label={label || undefined}
                    className={`aspect-square w-full rounded-[3px] ${STATUS_CLASS[status]} ${
                      date === today ? 'ring-2 ring-primary/50 ring-offset-1 ring-offset-surface' : ''
                    }`}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[12px] text-muted">
        <span>
          <span className="font-semibold text-text">{counts.done}</span> done ·{' '}
          <span className="font-semibold text-text">{counts.missed}</span> missed ·{' '}
          <span className="font-semibold text-text">{counts.unlogged}</span> not logged
        </span>
        <span className="flex items-center gap-3">
          {(['done', 'missed', 'unlogged', 'not_due'] as DayStatus[]).map((s) => (
            <span key={s} className="inline-flex items-center gap-1">
              <span className={`h-2.5 w-2.5 rounded-[3px] ${STATUS_CLASS[s]}`} />
              {STATUS_TEXT[s]}
            </span>
          ))}
        </span>
      </div>
    </div>
  )
}
