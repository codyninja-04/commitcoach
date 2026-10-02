'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Category, Frequency, Habit, Weekday } from '@/lib/types'
import { CATEGORIES, CATEGORY_LABEL, WEEKDAYS, WEEKDAY_SHORT } from '@/lib/types'

const FREQ_OPTIONS: { value: Frequency; label: string; hint: string }[] = [
  { value: 'daily', label: 'Every day', hint: 'Seven days a week' },
  { value: 'weekdays', label: 'Weekdays', hint: 'Monday to Friday' },
  { value: 'weekly', label: 'Times a week', hint: 'Any days you like' },
  { value: 'custom', label: 'Specific days', hint: 'Pick the days' },
]

const EXAMPLES = ['Read 10 pages', 'Gym session', 'Journal before bed', 'No phone in bed', 'Walk 20 minutes']

export function HabitForm({ habit }: { habit?: Habit }) {
  const router = useRouter()
  const editing = Boolean(habit)

  const [name, setName] = useState(habit?.name ?? '')
  const [commitment, setCommitment] = useState(habit?.current_commitment ?? '')
  const [description, setDescription] = useState(habit?.description ?? '')
  const [category, setCategory] = useState<Category | null>(habit?.category ?? null)
  const [frequency, setFrequency] = useState<Frequency>(habit?.target_frequency ?? 'daily')
  const [days, setDays] = useState<Weekday[]>(habit?.custom_days ?? ['mon', 'wed', 'fri'])
  const [perWeek, setPerWeek] = useState(habit?.weekly_target ?? 3)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleDay(d: Weekday) {
    setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setError('Give the habit a name')
    if (frequency === 'custom' && days.length === 0) return setError('Pick at least one day')

    setBusy(true)
    setError(null)
    const res = await fetch(editing ? `/api/habits/${habit!.id}` : '/api/habits', {
      method: editing ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        current_commitment: commitment,
        description,
        category,
        target_frequency: frequency,
        custom_days: frequency === 'custom' ? days : null,
        weekly_target: frequency === 'weekly' ? perWeek : null,
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(data.error || 'Could not save')
      setBusy(false)
      return
    }
    router.push(editing ? `/habits/${habit!.id}` : '/today')
    router.refresh()
  }

  return (
    <form onSubmit={submit} className="space-y-7">
      <div>
        <label htmlFor="name" className="label">
          What is the habit?
        </label>
        <input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          placeholder="Gym"
          autoFocus={!editing}
          className="input text-base"
        />
        {!editing && !name && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {EXAMPLES.map((ex) => (
              <button key={ex} type="button" onClick={() => setName(ex)} className="chip text-[12px]">
                {ex}
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <label htmlFor="commitment" className="label">
          What counts as done?
        </label>
        <input
          id="commitment"
          value={commitment}
          onChange={(e) => setCommitment(e.target.value)}
          maxLength={200}
          placeholder="45 minutes, any workout counts"
          className="input"
        />
        <p className="mt-1.5 text-[12px] leading-relaxed text-muted">
          Be specific so a check-in is a yes or a no. If this ever needs to shrink, the coach will suggest it.
        </p>
      </div>

      <fieldset>
        <legend className="label">How often?</legend>
        <div className="grid grid-cols-2 gap-2">
          {FREQ_OPTIONS.map((o) => {
            const on = frequency === o.value
            return (
              <button
                key={o.value}
                type="button"
                aria-pressed={on}
                onClick={() => setFrequency(o.value)}
                className={`rounded-xl border px-3.5 py-3 text-left transition ${
                  on ? 'border-primary/60 bg-primary-soft/60' : 'border-border bg-surface hover:bg-subtle'
                }`}
              >
                <span className="block text-sm font-semibold">{o.label}</span>
                <span className="block text-[12px] text-muted">{o.hint}</span>
              </button>
            )
          })}
        </div>

        {frequency === 'weekly' && (
          <div className="mt-3 flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
            <span className="text-sm font-medium">Times per week</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPerWeek((n) => Math.max(1, n - 1))}
                className="grid h-9 w-9 place-items-center rounded-lg border border-border text-lg hover:bg-subtle"
                aria-label="Fewer times"
              >
                -
              </button>
              <span className="w-6 text-center text-lg font-bold tabular-nums" aria-live="polite">
                {perWeek}
              </span>
              <button
                type="button"
                onClick={() => setPerWeek((n) => Math.min(7, n + 1))}
                className="grid h-9 w-9 place-items-center rounded-lg border border-border text-lg hover:bg-subtle"
                aria-label="More times"
              >
                +
              </button>
            </div>
          </div>
        )}

        {frequency === 'custom' && (
          <div className="mt-3 grid grid-cols-7 gap-1.5" role="group" aria-label="Days">
            {WEEKDAYS.map((d) => {
              const on = days.includes(d)
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleDay(d)}
                  className={`h-11 rounded-xl border text-[13px] font-semibold transition ${
                    on ? 'border-primary bg-primary text-white' : 'border-border bg-surface text-muted hover:bg-subtle'
                  }`}
                >
                  {WEEKDAY_SHORT[d]}
                </button>
              )
            })}
          </div>
        )}
      </fieldset>

      <fieldset>
        <legend className="label">
          Category <span className="font-normal text-muted">Optional</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={category === c}
              onClick={() => setCategory(category === c ? null : c)}
              className={`chip ${category === c ? 'chip-on' : ''}`}
            >
              {CATEGORY_LABEL[c]}
            </button>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="description" className="label">
          Why does it matter to you? <span className="font-normal text-muted">Optional</span>
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
          rows={2}
          placeholder="I sleep better and I am less snappy at work."
          className="input resize-none"
        />
      </div>

      {error && (
        <p role="alert" className="rounded-xl border border-border bg-subtle px-3.5 py-2.5 text-sm">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button type="button" onClick={() => router.back()} className="btn-secondary h-12 flex-1">
          Cancel
        </button>
        <button type="submit" disabled={busy} className="btn-primary h-12 flex-[2]">
          {busy ? 'Saving...' : editing ? 'Save changes' : 'Start tracking'}
        </button>
      </div>
    </form>
  )
}
