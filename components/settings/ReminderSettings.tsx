'use client'

import { useEffect, useState } from 'react'
import { BellIcon } from '@/components/ui/Icons'

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

function hourLabel(h: number) {
  const suffix = h < 12 ? 'am' : 'pm'
  const twelve = h % 12 === 0 ? 12 : h % 12
  return `${twelve}${suffix}`
}

type Support = 'checking' | 'unsupported' | 'denied' | 'ready'

/**
 * One daily nudge at the hour the user picks, only if something due today is
 * still unlogged. Subscription lives per device, the hour lives on the profile.
 */
export function ReminderSettings({
  enabled: initialEnabled,
  hour: initialHour,
  timezone,
}: {
  enabled: boolean
  hour: number
  timezone: string
}) {
  const [support, setSupport] = useState<Support>('checking')
  const [subscribed, setSubscribed] = useState(false)
  const [hour, setHour] = useState(initialHour)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window) || !vapid) {
      setSupport('unsupported')
      return
    }
    if (Notification.permission === 'denied') {
      setSupport('denied')
      return
    }
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        setSubscribed(Boolean(sub) && initialEnabled)
        setSupport('ready')
      })
      .catch(() => setSupport('unsupported'))
  }, [vapid, initialEnabled])

  async function enable() {
    setBusy(true)
    setMessage(null)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setSupport(permission === 'denied' ? 'denied' : 'ready')
        return
      }
      const reg = await navigator.serviceWorker.ready
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapid!) as BufferSource,
        }))
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub.toJSON()),
      })
      if (!res.ok) throw new Error()
      setSubscribed(true)
      setMessage('Reminders are on for this device.')
    } catch {
      setMessage('Could not turn on reminders. Try again, or check your browser settings.')
    } finally {
      setBusy(false)
    }
  }

  async function disable() {
    setBusy(true)
    setMessage(null)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      await fetch('/api/push/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: sub?.endpoint }),
      })
      await sub?.unsubscribe()
      setSubscribed(false)
      setMessage('Reminders are off for this device.')
    } finally {
      setBusy(false)
    }
  }

  async function changeHour(h: number) {
    setHour(h)
    await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reminder_hour: h }),
    })
  }

  return (
    <section className="card p-5">
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
          <BellIcon size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold">Daily reminder</h2>
          <p className="mt-0.5 text-[13px] leading-relaxed text-muted">
            One notification a day, only if something due is still unlogged. Never more than that.
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <label htmlFor="reminder-hour" className="text-sm font-medium">
          Remind me at
        </label>
        <select
          id="reminder-hour"
          value={hour}
          onChange={(e) => changeHour(Number(e.target.value))}
          className="input w-auto py-2"
        >
          {Array.from({ length: 24 }, (_, h) => (
            <option key={h} value={h}>
              {hourLabel(h)}
            </option>
          ))}
        </select>
        <span className="text-[12px] text-muted">{timezone.replace(/_/g, ' ')}</span>
      </div>

      <div className="mt-5">
        {support === 'checking' ? (
          <div className="h-10 w-40 animate-pulse rounded-xl bg-subtle" />
        ) : support === 'unsupported' ? (
          <p className="text-[13px] text-muted">
            This browser does not support push notifications. On iPhone, add CommitCoach to your home screen first.
          </p>
        ) : support === 'denied' ? (
          <p className="text-[13px] text-muted">
            Notifications are blocked for this site. Allow them in your browser settings, then reload this page.
          </p>
        ) : subscribed ? (
          <button onClick={disable} disabled={busy} className="btn-secondary">
            {busy ? 'Turning off...' : 'Turn off on this device'}
          </button>
        ) : (
          <button onClick={enable} disabled={busy} className="btn-primary">
            {busy ? 'Turning on...' : 'Turn on reminders'}
          </button>
        )}
        {message && (
          <p className="mt-2.5 text-[13px] text-muted" aria-live="polite">
            {message}
          </p>
        )}
      </div>
    </section>
  )
}
