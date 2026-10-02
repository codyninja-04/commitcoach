'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SparkIcon } from '@/components/ui/Icons'
import type { AdjustmentSuggestion as Suggestion, Weekday } from '@/lib/types'
import { WEEKDAYS, WEEKDAY_SHORT } from '@/lib/types'

function scheduleText(s: Suggestion): string {
  switch (s.suggested_frequency) {
    case 'daily':
      return 'every day'
    case 'weekdays':
      return 'weekdays'
    case 'weekly':
      return `${s.suggested_weekly_target ?? 1}x a week`
    case 'custom':
      return WEEKDAYS.filter((d) => s.suggested_custom_days?.includes(d as Weekday))
        .map((d) => WEEKDAY_SHORT[d])
        .join(', ')
    default:
      return ''
  }
}

/**
 * Asks the coach whether this habit's commitment should change, then lets the
 * user accept or keep things as they are. Keeping it is a normal answer.
 */
export function AdjustmentSuggestion({
  habitId,
  initial,
  canAsk,
  waitReason,
}: {
  habitId: string
  initial: Suggestion | null
  canAsk: boolean
  waitReason: string | null
}) {
  const router = useRouter()
  const [suggestion, setSuggestion] = useState<Suggestion | null>(initial)
  const [busy, setBusy] = useState<'ask' | 'accept' | 'dismiss' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [resolved, setResolved] = useState<'accepted' | 'dismissed' | null>(null)

  async function ask() {
    setBusy('ask')
    setError(null)
    try {
      const res = await fetch('/api/coaching/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ habit_id: habitId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSuggestion(data.suggestion)
      setResolved(null)
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : 'Could not reach the coach')
    } finally {
      setBusy(null)
    }
  }

  async function act(action: 'accept' | 'dismiss') {
    if (!suggestion) return
    setBusy(action)
    setError(null)
    try {
      const res = await fetch(`/api/coaching/suggestions/${suggestion.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResolved(action === 'accept' ? 'accepted' : 'dismissed')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : 'Could not save that')
    } finally {
      setBusy(null)
    }
  }

  const pending = suggestion && suggestion.status === 'pending' && suggestion.should_adjust && !resolved

  return (
    <div className="rounded-xl border border-primary/20 bg-primary-soft/40 p-4">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-primary">
        <SparkIcon size={13} /> Coach
      </p>

      {pending && suggestion ? (
        <div className="mt-2 animate-fade-in">
          <p className="text-sm font-semibold">
            Suggested: {suggestion.suggested_commitment}
            {scheduleText(suggestion) ? `, ${scheduleText(suggestion)}` : ''}
          </p>
          <p className="reflection mt-1.5">{suggestion.reason}</p>
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <button onClick={() => act('accept')} disabled={busy !== null} className="btn-primary h-11">
              {busy === 'accept' ? 'Applying...' : 'Accept adjustment'}
            </button>
            <button onClick={() => act('dismiss')} disabled={busy !== null} className="btn-secondary h-11">
              {busy === 'dismiss' ? 'Saving...' : 'Keep as is'}
            </button>
          </div>
        </div>
      ) : resolved === 'accepted' ? (
        <p className="reflection mt-2">Adjusted. The new commitment starts today and the change is in the history below.</p>
      ) : resolved === 'dismissed' ? (
        <p className="reflection mt-2">Keeping it as is. You can ask again tomorrow if things change.</p>
      ) : suggestion && !suggestion.should_adjust ? (
        <div className="mt-2">
          <p className="text-sm font-semibold">No change needed right now</p>
          <p className="reflection mt-1">{suggestion.reason}</p>
        </div>
      ) : (
        <div className="mt-2">
          <p className="reflection">
            Not sure the bar is set right? The coach can look at your last eight weeks and say whether this commitment
            should shrink, move days, or stay exactly as it is.
          </p>
          {canAsk ? (
            <button onClick={ask} disabled={busy !== null} className="btn-secondary mt-3.5">
              {busy === 'ask' ? 'Looking at your data...' : 'Should I adjust this?'}
            </button>
          ) : (
            waitReason && <p className="mt-2 text-[13px] text-muted">{waitReason}</p>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-[13px] text-text">
          {error}
        </p>
      )}
    </div>
  )
}
