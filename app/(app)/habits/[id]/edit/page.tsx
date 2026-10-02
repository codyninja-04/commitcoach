import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { HabitForm } from '@/components/habits/HabitForm'
import { ArrowLeftIcon } from '@/components/ui/Icons'
import { isUuid } from '@/lib/api'
import { createClient } from '@/lib/supabase/server'
import type { Habit } from '@/lib/types'

export const metadata: Metadata = { title: 'Edit habit' }

export default async function EditHabitPage({ params }: { params: { id: string } }) {
  if (!isUuid(params.id)) notFound()
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase.from('habits').select('*').eq('id', params.id).eq('user_id', user.id).maybeSingle()
  if (!data) notFound()
  const habit = data as Habit

  return (
    <div className="mx-auto max-w-xl">
      <Link
        href={`/habits/${habit.id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-text"
      >
        <ArrowLeftIcon size={16} /> {habit.name}
      </Link>
      <h1 className="text-2xl font-bold tracking-tight">Edit habit</h1>
      <p className="mb-7 mt-1 text-sm text-muted">
        Changes to the commitment or schedule are saved to the habit&apos;s adjustment history.
      </p>
      <div className="card p-5 sm:p-7">
        <HabitForm habit={habit} />
      </div>
    </div>
  )
}
