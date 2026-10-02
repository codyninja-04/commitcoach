'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Checkin, ContextTag } from '@/lib/types'
import { HabitCheckIn, type ReflectionState, type TodayItem } from './HabitCheckIn'
import { MissReflectionPrompt } from './MissReflectionPrompt'

/**
 * Owns check-in state for a list of habits on one or more days. Done is
 * optimistic. Missed opens the sheet, saves, then asks the coach to reflect.
 */
export function TodayBoard({
  items: initial,
  dayLabels,
  today,
}: {
  items: TodayItem[]
  dayLabels: Record<string, string>
  today: string
}) {
  const router = useRouter()
  const [items, setItems] = useState(initial)
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [reflections, setReflections] = useState<Record<string, ReflectionState>>({})
  const [missing, setMissing] = useState<TodayItem | null>(null)
  const [error, setError] = useState<string | null>(null)

  const patch = useCallback((key: string, next: Partial<TodayItem>) => {
    setItems((list) => list.map((i) => (i.key === key ? { ...i, ...next } : i)))
  }, [])

  async function save(item: TodayItem, payload: { completed: boolean; context_tags?: ContextTag[]; miss_reason?: string }) {
    setSaving((s) => ({ ...s, [item.key]: true }))
    setError(null)
    try {
      const res = await fetch('/api/checkins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ habit_id: item.habit.id, date: item.date, ...payload }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not save')
      patch(item.key, {
        checkin: data.checkin as Checkin,
        streak: data.streaks ? { current: data.streaks.current, unit: data.streaks.unit } : item.streak,
      })
      return data.checkin as Checkin
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save')
      patch(item.key, { checkin: item.checkin, streak: item.streak })
      return null
    } finally {
      setSaving((s) => ({ ...s, [item.key]: false }))
    }
  }

  async function markDone(item: TodayItem) {
    if (item.checkin?.completed) return
    // Optimistic: flip to done right away, roll back on failure.
    patch(item.key, {
      checkin: { ...(item.checkin ?? ({} as Checkin)), completed: true, context_tags: null, miss_reason: null },
    })
    setReflections((r) => {
      const next = { ...r }
      delete next[item.key]
      return next
    })
    const saved = await save(item, { completed: true })
    if (saved) router.refresh()
  }

  async function submitMiss(item: TodayItem, data: { tags: ContextTag[]; reason: string }) {
    const saved = await save(item, { completed: false, context_tags: data.tags, miss_reason: data.reason })
    setMissing(null)
    if (!saved) return

    setReflections((r) => ({ ...r, [item.key]: { loading: true, text: null, suggestion: null } }))
    try {
      const res = await fetch('/api/checkins/miss-reflection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkin_id: saved.id }),
      })
      const out = await res.json()
      if (!res.ok) throw new Error(out.error)
      setReflections((r) => ({ ...r, [item.key]: { loading: false, text: out.reflection, suggestion: out.suggestion } }))
    } catch {
      setReflections((r) => ({
        ...r,
        [item.key]: { loading: false, text: 'Logged. One missed day does not undo the days before it.', suggestion: null },
      }))
    }
    router.refresh()
  }

  async function undo(item: TodayItem) {
    setSaving((s) => ({ ...s, [item.key]: true }))
    setError(null)
    try {
      const res = await fetch(`/api/checkins?habit_id=${item.habit.id}&date=${item.date}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not undo')
      patch(item.key, {
        checkin: null,
        streak: data.streaks ? { current: data.streaks.current, unit: data.streaks.unit } : item.streak,
      })
      setReflections((r) => {
        const next = { ...r }
        delete next[item.key]
        return next
      })
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not undo')
    } finally {
      setSaving((s) => ({ ...s, [item.key]: false }))
    }
  }

  const dates = Array.from(new Set(items.map((i) => i.date))).sort().reverse()
  const todays = items.filter((i) => i.date === today)
  const logged = todays.filter((i) => i.checkin).length
  const doneCount = todays.filter((i) => i.checkin?.completed).length
  const allLogged = todays.length > 0 && logged === todays.length

  return (
    <>
      {todays.length > 0 && (
        <div className="mb-6">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-semibold">
              {logged} of {todays.length} logged
            </span>
            {logged > 0 && (
              <span className="text-muted">
                {doneCount} done{logged - doneCount > 0 ? `, ${logged - doneCount} missed` : ''}
              </span>
            )}
          </div>
          <div
            className="mt-2 h-1.5 overflow-hidden rounded-full bg-subtle"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={todays.length}
            aria-valuenow={logged}
            aria-label="Check-ins logged today"
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
              style={{ width: `${(logged / todays.length) * 100}%` }}
            />
          </div>
          {allLogged && (
            <p className="mt-3 animate-fade-in text-sm text-muted">
              Everything is logged for today. Honest data is the whole job, and it is done.
            </p>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="mb-4 rounded-xl border border-border bg-subtle px-3.5 py-2.5 text-sm">
          {error}
        </p>
      )}

      {dates.map((date) => (
        <section key={date} className="mb-8">
          {dates.length > 1 && <h2 className="eyebrow mb-3">{dayLabels[date]}</h2>}
          <div className="space-y-3">
            {items
              .filter((i) => i.date === date)
              .map((item, idx) => (
                <HabitCheckIn
                  key={item.key}
                  item={item}
                  index={idx}
                  saving={!!saving[item.key]}
                  reflection={reflections[item.key]}
                  onDone={() => markDone(item)}
                  onMiss={() => setMissing(item)}
                  onUndo={() => undo(item)}
                />
              ))}
          </div>
        </section>
      ))}

      {missing && (
        <MissReflectionPrompt
          habitName={missing.habit.name}
          dayLabel={dayLabels[missing.date] ?? 'Today'}
          onClose={() => setMissing(null)}
          onSubmit={(data) => submitMiss(missing, data)}
        />
      )}
    </>
  )
}
