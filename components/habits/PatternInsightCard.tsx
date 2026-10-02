import type { WeekdayPattern } from '@/lib/habits/stats'
import { TAG_LABEL, WEEKDAY_LABEL } from '@/lib/types'

/**
 * The pattern here is counted, not generated, so the numbers are exact.
 * The coach's suggestion sits underneath it as a separate, optional step.
 */
export function PatternInsightCard({
  pattern,
  daysTracked,
  minDays,
  children,
}: {
  pattern: WeekdayPattern | null
  daysTracked: number
  minDays: number
  children?: React.ReactNode
}) {
  const plural = `${WEEKDAY_LABEL[pattern?.day ?? 'mon']}s`

  return (
    <section className="card p-5">
      <h2 className="eyebrow">Pattern</h2>

      {daysTracked < minDays ? (
        <p className="reflection mt-2 text-muted">
          Patterns show up after three weeks of check-ins. {minDays - daysTracked} more{' '}
          {minDays - daysTracked === 1 ? 'day' : 'days'} and this will start filling in.
        </p>
      ) : pattern ? (
        <div className="mt-2">
          <p className="text-[15px] font-semibold leading-snug">
            You have missed this on {pattern.missed} of the last {pattern.of} {plural}.
          </p>
          <p className="reflection mt-1.5 text-muted">
            {pattern.commonTag ? `The most common reason logged was "${TAG_LABEL[pattern.commonTag].toLowerCase()}". ` : ''}
            Other days you miss about {Math.round(pattern.otherRate * 100)}% of the time, so {WEEKDAY_LABEL[pattern.day]} is
            the outlier, not your commitment overall.
          </p>
        </div>
      ) : (
        <p className="reflection mt-2 text-muted">
          No single day stands out. When you miss, it is spread across the week rather than tied to one day.
        </p>
      )}

      {children && <div className="mt-4">{children}</div>}
    </section>
  )
}
