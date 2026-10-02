'use client'

import Link from 'next/link'
import { CheckIcon, SparkIcon, UndoIcon, XIcon } from '@/components/ui/Icons'
import type { Checkin } from '@/lib/types'
import { TAG_LABEL } from '@/lib/types'
import { StreakBadge } from './StreakBadge'

export interface TodayItem {
  key: string
  date: string
  habit: {
    id: string
    name: string
    commitment: string | null
    schedule: string
  }
  checkin: Checkin | null
  streak: { current: number; unit: 'days' | 'weeks' }
  week: { done: number; target: number } | null
}

export interface ReflectionState {
  loading: boolean
  text: string | null
  suggestion: string | null
}

export function HabitCheckIn({
  item,
  saving,
  reflection,
  onDone,
  onMiss,
  onUndo,
  index = 0,
}: {
  item: TodayItem
  saving: boolean
  reflection: ReflectionState | undefined
  onDone: () => void
  onMiss: () => void
  onUndo: () => void
  index?: number
}) {
  const { habit, checkin, streak, week } = item
  const done = checkin?.completed === true
  const missed = checkin?.completed === false
  const reflectionText = reflection?.text ?? checkin?.ai_reflection ?? null
  const suggestion = reflection?.suggestion ?? checkin?.ai_suggestion ?? null

  return (
    <article
      className={`card animate-rise-in p-4 transition sm:p-5 ${done ? 'border-completed/30' : ''}`}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Link href={`/habits/${habit.id}`} className="text-base font-semibold leading-snug hover:underline">
            {habit.name}
          </Link>
          <p className="mt-0.5 truncate text-[13px] text-muted">
            {habit.commitment ? `${habit.commitment} · ` : ''}
            {habit.schedule}
            {week ? ` · ${week.done} of ${week.target} this week` : ''}
          </p>
        </div>
        <StreakBadge count={streak.current} unit={streak.unit} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={onDone}
          disabled={saving}
          aria-pressed={done}
          className={`btn h-12 rounded-xl text-[15px] ${
            done
              ? 'bg-completed text-white'
              : missed
                ? 'border border-border bg-surface text-muted hover:bg-subtle'
                : 'border border-completed/30 bg-completed/[0.07] text-completed hover:bg-completed/[0.12]'
          }`}
        >
          <CheckIcon size={18} strokeWidth={2.5} className={done ? 'animate-pop' : ''} />
          Done
        </button>
        <button
          type="button"
          onClick={onMiss}
          disabled={saving}
          aria-pressed={missed}
          className={`btn h-12 rounded-xl text-[15px] ${
            missed
              ? 'border border-text/15 bg-subtle text-text'
              : 'border border-border bg-surface text-muted hover:bg-subtle hover:text-text'
          }`}
        >
          <XIcon size={17} strokeWidth={2.3} />
          Missed
        </button>
      </div>

      {missed && (
        <div className="mt-4 animate-fade-in space-y-3">
          {(checkin?.context_tags?.length || checkin?.miss_reason) && (
            <div className="flex flex-wrap items-center gap-1.5 text-[13px] text-muted">
              {checkin?.context_tags?.map((t) => (
                <span key={t} className="rounded-full bg-subtle px-2.5 py-0.5 font-medium">
                  {TAG_LABEL[t]}
                </span>
              ))}
              {checkin?.miss_reason && <span className="truncate italic">&ldquo;{checkin.miss_reason}&rdquo;</span>}
            </div>
          )}

          {(reflection?.loading || reflectionText) && (
            <div className="rounded-xl bg-primary-soft/50 p-3.5" aria-live="polite">
              <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-primary">
                <SparkIcon size={13} /> Coach
              </p>
              {reflection?.loading && !reflectionText ? (
                <div className="space-y-2 py-1">
                  <div className="h-3 w-11/12 animate-pulse rounded bg-primary/15" />
                  <div className="h-3 w-3/4 animate-pulse rounded bg-primary/15" />
                </div>
              ) : (
                <p className="reflection">{reflectionText}</p>
              )}
              {suggestion && (
                <p className="mt-2.5 border-t border-primary/15 pt-2.5 text-[13px] leading-relaxed text-text/90">
                  <span className="font-semibold">Worth trying: </span>
                  {suggestion}{' '}
                  <Link href={`/habits/${habit.id}`} className="font-semibold text-primary underline-offset-4 hover:underline">
                    Review this habit
                  </Link>
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {checkin && (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={onUndo}
            disabled={saving}
            className="inline-flex items-center gap-1 text-[12px] font-medium text-muted hover:text-text"
          >
            <UndoIcon size={13} /> Undo
          </button>
        </div>
      )}
    </article>
  )
}
