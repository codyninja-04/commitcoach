import { FlameIcon } from '@/components/ui/Icons'

/**
 * Current streak with a flame. A zero streak shows a quiet grey flame rather
 * than nothing, because starting over is a normal state, not an error.
 */
export function StreakBadge({
  count,
  unit,
  size = 'lg',
}: {
  count: number
  unit: 'days' | 'weeks'
  size?: 'lg' | 'sm'
}) {
  const lit = count > 0
  const label = `${count} ${unit === 'weeks' ? (count === 1 ? 'week' : 'weeks') : count === 1 ? 'day' : 'days'} streak`

  if (size === 'sm') {
    return (
      <span className="inline-flex items-center gap-1 text-[13px] font-bold tabular-nums" aria-label={label}>
        <FlameIcon size={14} className={lit ? 'text-streak' : 'text-muted/40'} />
        {count}
      </span>
    )
  }

  return (
    <div className="flex flex-col items-end leading-none" aria-label={label}>
      <div className="flex items-center gap-1">
        <FlameIcon size={20} className={lit ? 'text-streak' : 'text-muted/30'} />
        <span className={`text-[32px] font-extrabold tabular-nums tracking-tight ${lit ? 'text-text' : 'text-muted/60'}`}>
          {count}
        </span>
      </div>
      <span className="mt-1 text-[11px] font-medium text-muted">{unit === 'weeks' ? 'week streak' : 'day streak'}</span>
    </div>
  )
}
