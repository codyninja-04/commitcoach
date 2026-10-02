'use client'

import { useState } from 'react'
import { SparkIcon } from '@/components/ui/Icons'
import type { PatternInsight } from '@/lib/types'

function ago(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 2) return 'just now'
  if (mins < 60) return `${mins} minutes ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.round(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

/**
 * Claude's read of the whole picture. Generated on request, stored, and shown
 * again until the user asks for a fresh one.
 */
export function CrossHabitPatterns({
  initial,
  enabled,
  disabledReason,
}: {
  initial: PatternInsight | null
  enabled: boolean
  disabledReason: string | null
}) {
  const [insight, setInsight] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/insights/patterns', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setInsight(data.insight)
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : 'Could not run the analysis')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-1.5 text-base font-semibold">
            <SparkIcon size={16} className="text-primary" /> What the coach sees
          </h2>
          <p className="mt-0.5 text-[13px] text-muted">
            {insight
              ? `Read across ${insight.based_on_checkins ?? 0} tracked habit days, ${ago(insight.generated_at)}`
              : 'A read across all your habits, looking for what actually drives the misses.'}
          </p>
        </div>
        {enabled && (
          <button onClick={run} disabled={busy} className={insight ? 'btn-secondary' : 'btn-primary'}>
            {busy ? 'Analysing...' : insight ? 'Refresh' : 'Find my patterns'}
          </button>
        )}
      </div>

      {!enabled && disabledReason && <p className="mt-4 rounded-xl bg-subtle px-4 py-3 text-sm text-muted">{disabledReason}</p>}

      {error && (
        <p role="alert" className="mt-4 rounded-xl border border-border bg-subtle px-4 py-3 text-sm">
          {error}
        </p>
      )}

      {busy && !insight && (
        <div className="mt-5 space-y-3" aria-busy="true">
          {[0, 1].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-subtle" />
          ))}
        </div>
      )}

      {insight && (
        <div className={`mt-5 space-y-3 transition ${busy ? 'opacity-50' : ''}`}>
          {insight.cross_habit_insight && (
            <div className="rounded-xl border border-primary/20 bg-primary-soft/40 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-primary">Across habits</p>
              <p className="reflection mt-1.5">{insight.cross_habit_insight}</p>
            </div>
          )}

          {insight.patterns.length === 0 ? (
            <p className="reflection text-muted">
              Nothing stands out yet. That usually means the misses are random rather than structural, which is good news.
              Keep logging honestly and check back in a week or two.
            </p>
          ) : (
            insight.patterns.map((p, i) => (
              <article key={i} className="rounded-xl border border-border p-4">
                <p className="eyebrow">{p.habit_name}</p>
                <p className="mt-1.5 text-[15px] font-semibold leading-snug">{p.pattern_description}</p>
                <dl className="mt-3 space-y-2 text-sm">
                  <div>
                    <dt className="inline font-semibold">Trigger: </dt>
                    <dd className="inline text-text/80">{p.trigger}</dd>
                  </div>
                  <div>
                    <dt className="inline font-semibold">Try: </dt>
                    <dd className="inline text-text/80">{p.recommendation}</dd>
                  </div>
                </dl>
              </article>
            ))
          )}
        </div>
      )}
    </section>
  )
}
