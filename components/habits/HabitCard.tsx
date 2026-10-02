import Link from 'next/link'
import { StreakBadge } from '@/components/today/StreakBadge'
import { ChevronRightIcon } from '@/components/ui/Icons'
import type { DayStatus } from '@/lib/types'
import { CATEGORY_LABEL, type Category } from '@/lib/types'

export const STATUS_CLASS: Record<DayStatus, string> = {
  done: 'bg-completed',
  missed: 'bg-missed/45',
  unlogged: 'border border-dashed border-muted/40 bg-transparent',
  not_due: 'bg-subtle',
  before_start: 'bg-subtle/50',
  future: 'bg-transparent',
}

export function HabitCard({
  id,
  name,
  category,
  schedule,
  commitment,
  streak,
  rate,
  strip,
  archived,
}: {
  id: string
  name: string
  category: Category | null
  schedule: string
  commitment: string | null
  streak: { current: number; unit: 'days' | 'weeks' }
  rate: string
  strip: { date: string; status: DayStatus }[]
  archived?: boolean
}) {
  return (
    <Link
      href={`/habits/${id}`}
      className={`card group block p-4 transition hover:border-text/20 sm:p-5 ${archived ? 'opacity-70' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-base font-semibold">{name}</h3>
            {archived && <span className="rounded-full bg-subtle px-2 py-0.5 text-[11px] font-semibold text-muted">Archived</span>}
          </div>
          <p className="mt-0.5 truncate text-[13px] text-muted">
            {category ? `${CATEGORY_LABEL[category]} · ` : ''}
            {schedule}
            {commitment ? ` · ${commitment}` : ''}
          </p>
        </div>
        <ChevronRightIcon size={18} className="mt-1 shrink-0 text-muted transition group-hover:translate-x-0.5" />
      </div>

      <div className="mt-4 flex items-end justify-between gap-4">
        <div className="flex gap-[3px]" aria-label="Last 14 days">
          {strip.map((c) => (
            <span key={c.date} title={`${c.date}: ${c.status.replace('_', ' ')}`} className={`h-5 w-2.5 rounded-[3px] sm:w-3 ${STATUS_CLASS[c.status]}`} />
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-3 text-[13px]">
          <span className="text-muted">
            <span className="font-semibold text-text">{rate}</span> 4 wk
          </span>
          <StreakBadge count={streak.current} unit={streak.unit} size="sm" />
        </div>
      </div>
    </Link>
  )
}
