import Link from 'next/link'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { HabitForm } from '@/components/habits/HabitForm'
import { ArrowLeftIcon } from '@/components/ui/Icons'
import { loadProfile } from '@/lib/habits/load'
import { habitLimit } from '@/lib/plan'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'New habit' }

export default async function NewHabitPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const profile = await loadProfile(supabase, user.id)
  const limit = habitLimit(profile)
  let atLimit = false
  if (limit !== null) {
    const { count } = await supabase
      .from('habits')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_active', true)
    atLimit = (count ?? 0) >= limit
  }

  return (
    <div className="mx-auto max-w-xl">
      <Link href="/habits" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-text">
        <ArrowLeftIcon size={16} /> Habits
      </Link>
      <h1 className="text-2xl font-bold tracking-tight">New habit</h1>
      <p className="mb-7 mt-1 text-sm leading-relaxed text-muted">
        Start smaller than you think you need to. A commitment you keep on a bad week beats an ambitious one you drop.
      </p>

      {atLimit ? (
        <div className="card p-6">
          <p className="font-semibold">You are tracking {limit} habits already</p>
          <p className="mt-1 text-sm text-muted">
            The free plan covers {limit} at a time. Archive one you are done with, or go Pro for unlimited habits.
          </p>
          <div className="mt-5 flex gap-3">
            <Link href="/habits" className="btn-secondary">
              Manage habits
            </Link>
            <Link href="/settings#plan" className="btn-primary">
              See Pro
            </Link>
          </div>
        </div>
      ) : (
        <div className="card p-5 sm:p-7">
          <HabitForm />
        </div>
      )}
    </div>
  )
}
