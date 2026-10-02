import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { DangerZone } from '@/components/settings/DangerZone'
import { ProfileSettings } from '@/components/settings/ProfileSettings'
import { ReminderSettings } from '@/components/settings/ReminderSettings'
import { CheckIcon } from '@/components/ui/Icons'
import { loadProfile } from '@/lib/habits/load'
import { FREE_HABIT_LIMIT, limitsEnforced } from '@/lib/plan'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Settings' }
export const dynamic = 'force-dynamic'

const PRO_FEATURES = [
  'Unlimited habits',
  'Coach reflections on missed days',
  'Cross-habit pattern detection',
  'Adjustment suggestions you can accept or skip',
]

export default async function SettingsPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const profile = await loadProfile(supabase, user.id)
  const name = profile.display_name || (user.user_metadata?.full_name as string | undefined) || ''
  const enforced = limitsEnforced()
  const isPro = profile.plan === 'pro'

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted">Reminders, plan and your data.</p>
      </div>

      <ProfileSettings name={name} email={user.email ?? ''} />

      <ReminderSettings enabled={profile.reminder_enabled} hour={profile.reminder_hour} timezone={profile.timezone} />

      <section id="plan" className="card scroll-mt-20 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Plan</h2>
            <p className="mt-0.5 text-[13px] text-muted">
              {isPro
                ? 'You are on Pro. Thanks for backing it.'
                : enforced
                  ? `Free: up to ${FREE_HABIT_LIMIT} habits with basic tracking.`
                  : 'Early access: every feature is unlocked while billing is being set up.'}
            </p>
          </div>
          <span className="rounded-full bg-primary-soft px-2.5 py-1 text-[12px] font-bold text-text">
            {isPro ? 'Pro' : enforced ? 'Free' : 'Early access'}
          </span>
        </div>

        <div className="mt-5 rounded-xl border border-border p-4">
          <p className="text-sm font-semibold">
            Pro <span className="font-normal text-muted">$4 a month</span>
          </p>
          <ul className="mt-3 space-y-2">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm">
                <CheckIcon size={15} className="text-primary" strokeWidth={2.5} />
                {f}
              </li>
            ))}
          </ul>
          {!isPro && enforced && (
            <p className="mt-4 text-[13px] text-muted">Paid upgrades are not open yet. Your habits and history carry over when they are.</p>
          )}
        </div>
      </section>

      <DangerZone />
    </div>
  )
}
