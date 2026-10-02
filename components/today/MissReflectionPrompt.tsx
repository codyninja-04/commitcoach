'use client'

import { useEffect, useRef, useState } from 'react'
import { CONTEXT_TAGS, type ContextTag, TAG_LABEL } from '@/lib/types'

/**
 * Bottom sheet that opens when a habit is marked as missed. Tags are one tap,
 * the note is optional. The wording is a check-in, not an interrogation.
 */
export function MissReflectionPrompt({
  habitName,
  dayLabel,
  onSubmit,
  onClose,
}: {
  habitName: string
  dayLabel: string
  onSubmit: (data: { tags: ContextTag[]; reason: string }) => Promise<void> | void
  onClose: () => void
}) {
  const [tags, setTags] = useState<ContextTag[]>([])
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const sheetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    sheetRef.current?.querySelector<HTMLButtonElement>('button[data-tag]')?.focus()

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  function toggle(tag: ContextTag) {
    setTags((t) => (t.includes(tag) ? t.filter((x) => x !== tag) : [...t, tag]))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    try {
      await onSubmit({ tags, reason: reason.trim() })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="presentation">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 animate-fade-in bg-text/30 backdrop-blur-[2px]"
      />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="miss-title"
        className="relative w-full max-w-lg animate-sheet-up rounded-t-3xl border border-border bg-surface px-5 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-3 shadow-sheet sm:rounded-3xl sm:pb-6"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border sm:hidden" />
        <form onSubmit={submit}>
          <p className="eyebrow">{dayLabel}</p>
          <h2 id="miss-title" className="mt-1 text-lg font-bold tracking-tight">
            What happened with {habitName}?
          </h2>
          <p className="mt-1 text-sm text-muted">No judgement. This just helps spot what keeps getting in the way.</p>

          <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="What got in the way">
            {CONTEXT_TAGS.map((tag) => {
              const on = tags.includes(tag)
              return (
                <button
                  key={tag}
                  type="button"
                  data-tag
                  aria-pressed={on}
                  onClick={() => toggle(tag)}
                  className={`chip px-4 py-2 text-sm ${on ? 'chip-on' : ''}`}
                >
                  {TAG_LABEL[tag]}
                </button>
              )
            })}
          </div>

          <label htmlFor="miss-reason" className="label mt-5">
            Anything else? <span className="font-normal text-muted">Optional</span>
          </label>
          <textarea
            id="miss-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Late meeting ran over, skipped dinner, just wanted to sleep."
            className="input resize-none"
          />

          <div className="mt-5 grid grid-cols-[1fr_2fr] gap-3">
            <button type="button" onClick={onClose} className="btn-secondary h-12">
              Cancel
            </button>
            <button type="submit" disabled={busy} className="btn-primary h-12">
              {busy ? 'Logging...' : 'Log it'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
