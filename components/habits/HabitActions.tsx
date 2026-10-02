'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function HabitActions({ id, active }: { id: string; active: boolean }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function setActive(next: boolean) {
    setBusy(true)
    setError(null)
    const res = await fetch(`/api/habits/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: next }),
    })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) return setError(data.error || 'Could not update')
    router.refresh()
  }

  async function remove() {
    setBusy(true)
    const res = await fetch(`/api/habits/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      setBusy(false)
      return setError('Could not delete')
    }
    router.push('/habits')
    router.refresh()
  }

  return (
    <section className="card p-5">
      <h2 className="eyebrow">Manage</h2>
      <div className="mt-3 flex flex-wrap gap-2.5">
        <Link href={`/habits/${id}/edit`} className="btn-secondary">
          Edit
        </Link>
        <button onClick={() => setActive(!active)} disabled={busy} className="btn-secondary">
          {active ? 'Archive' : 'Restore'}
        </button>
        {confirmDelete ? (
          <>
            <button onClick={remove} disabled={busy} className="btn border border-missed/40 text-missed hover:bg-missed/10">
              Delete for good
            </button>
            <button onClick={() => setConfirmDelete(false)} className="btn-ghost">
              Cancel
            </button>
          </>
        ) : (
          <button onClick={() => setConfirmDelete(true)} className="btn-ghost">
            Delete
          </button>
        )}
      </div>
      <p className="mt-3 text-[12px] leading-relaxed text-muted">
        {confirmDelete
          ? 'Deleting removes the habit and every check-in for it. This cannot be undone.'
          : 'Archiving hides it from today and keeps the history. Good for habits that have become automatic.'}
      </p>
      {error && (
        <p role="alert" className="mt-2 text-[13px]">
          {error}
        </p>
      )}
    </section>
  )
}
