'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function ProfileSettings({ name, email }: { name: string; email: string }) {
  const router = useRouter()
  const [value, setValue] = useState(name)
  const [state, setState] = useState<'idle' | 'saving' | 'saved'>('idle')

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setState('saving')
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ display_name: value }),
    })
    setState(res.ok ? 'saved' : 'idle')
    router.refresh()
  }

  return (
    <section className="card p-5">
      <h2 className="text-base font-semibold">Profile</h2>
      <form onSubmit={save} className="mt-4 space-y-4">
        <div>
          <label htmlFor="display-name" className="label">
            What should we call you?
          </label>
          <div className="flex gap-2">
            <input
              id="display-name"
              value={value}
              onChange={(e) => {
                setValue(e.target.value)
                setState('idle')
              }}
              maxLength={60}
              className="input"
            />
            <button type="submit" disabled={state === 'saving' || value === name} className="btn-secondary shrink-0">
              {state === 'saving' ? 'Saving...' : state === 'saved' ? 'Saved' : 'Save'}
            </button>
          </div>
        </div>
        <p className="text-[13px] text-muted">
          Signed in with Google as <span className="font-medium text-text">{email}</span>
        </p>
      </form>
    </section>
  )
}
