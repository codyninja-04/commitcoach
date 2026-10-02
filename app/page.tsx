import Link from 'next/link'
import { CheckIcon, FlameIcon, LogoMark, SparkIcon, XIcon } from '@/components/ui/Icons'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const STEPS = [
  {
    title: 'Check in, done or missed',
    body: 'Two big buttons. Missing is a normal answer, not something to hide by just not opening the app.',
  },
  {
    title: 'Say what got in the way',
    body: 'One tap tags like busy, tired or travel, and a note if you want. The coach replies calmly, and only names a pattern when there is one.',
  },
  {
    title: 'See the pattern',
    body: 'After a few weeks the numbers show up: the same weekday, the same reason, two habits that fall over together.',
  },
  {
    title: 'Adjust instead of quitting',
    body: 'If the bar is too high, the coach suggests a smaller version. You accept it or keep things as they are. Either is fine.',
  },
]

export default async function LandingPage() {
  let signedIn = false
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    signedIn = Boolean(user)
  }

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5">
        <Link href="/" className="flex items-center gap-2 text-[15px] font-bold tracking-tight">
          <LogoMark size={26} />
          CommitCoach
        </Link>
        <nav className="flex items-center gap-2">
          {signedIn ? (
            <Link href="/today" className="btn-primary">
              Open app
            </Link>
          ) : (
            <>
              <Link href="/login" className="btn-ghost">
                Sign in
              </Link>
              <Link href="/signup" className="btn-primary">
                Get started
              </Link>
            </>
          )}
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-5xl items-center gap-12 px-5 pb-20 pt-12 md:grid-cols-[1.1fr_1fr] md:pt-20">
          <div className="animate-rise-in">
            <p className="eyebrow text-primary">Habit tracking that asks why</p>
            <h1 className="mt-4 text-[40px] font-extrabold leading-[1.05] tracking-tight sm:text-[52px]">
              A broken streak is data, not a verdict.
            </h1>
            <p className="mt-5 max-w-md text-[17px] leading-relaxed text-muted">
              Most trackers show you a red X and leave you to feel bad about it. CommitCoach asks what happened, learns
              when and why you slip, and helps you adjust the plan so you keep going instead of quitting.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href={signedIn ? '/today' : '/signup'} className="btn-primary h-12 px-6 text-[15px]">
                {signedIn ? 'Go to today' : 'Start with one habit'}
              </Link>
              <span className="text-[13px] text-muted">Free for up to 3 habits</span>
            </div>
          </div>

          <Preview />
        </section>

        <section className="border-y border-border bg-surface">
          <div className="mx-auto max-w-5xl px-5 py-16">
            <h2 className="max-w-lg text-2xl font-bold tracking-tight">How it works</h2>
            <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((s, i) => (
                <li key={s.title}>
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-primary-soft text-sm font-bold text-text">
                    {i + 1}
                  </span>
                  <h3 className="mt-4 font-semibold">{s.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-5 py-16">
          <div className="grid gap-10 md:grid-cols-2">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Patterns, with the numbers attached</h2>
              <p className="mt-3 leading-relaxed text-muted">
                &ldquo;You struggle with consistency&rdquo; is useless. &ldquo;You missed the gym on 4 of the last 5 Mondays,
                and 3 of those were tagged busy&rdquo; is something you can act on. Counts are worked out from your check-ins
                directly, and the coach only interprets them.
              </p>
            </div>
            <div className="card p-5">
              <p className="eyebrow">Pattern</p>
              <p className="mt-2 text-[15px] font-semibold">You have missed this on 4 of the last 5 Mondays.</p>
              <p className="reflection mt-1.5 text-muted">
                The most common reason logged was &ldquo;busy&rdquo;. Other days you miss about 12% of the time.
              </p>
              <div className="mt-4 rounded-xl border border-primary/20 bg-primary-soft/40 p-4">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-primary">
                  <SparkIcon size={13} /> Coach
                </p>
                <p className="mt-1.5 text-sm font-semibold">Suggested: 20 minute home workout on Mondays</p>
                <p className="reflection mt-1">
                  Mondays are carrying your late meetings. Keeping a smaller version alive that day protects the habit without
                  pretending the calendar is different.
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <span className="btn-primary pointer-events-none h-10 text-[13px]">Accept adjustment</span>
                  <span className="btn-secondary pointer-events-none h-10 text-[13px]">Keep as is</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-border bg-surface">
          <div className="mx-auto max-w-5xl px-5 py-16">
            <h2 className="text-2xl font-bold tracking-tight">Pricing</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-border p-6">
                <p className="font-semibold">Free</p>
                <p className="mt-1 text-3xl font-extrabold tracking-tight">$0</p>
                <ul className="mt-5 space-y-2 text-sm">
                  {['Up to 3 habits', 'Daily check-ins and streaks', '90 day calendar', 'Daily reminders'].map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <CheckIcon size={15} className="text-primary" strokeWidth={2.5} /> {f}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border-2 border-primary/50 p-6">
                <p className="font-semibold">Pro</p>
                <p className="mt-1 text-3xl font-extrabold tracking-tight">
                  $4<span className="text-base font-medium text-muted"> / month</span>
                </p>
                <ul className="mt-5 space-y-2 text-sm">
                  {[
                    'Unlimited habits',
                    'Coach reflections on missed days',
                    'Cross-habit pattern detection',
                    'Adjustment suggestions',
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <CheckIcon size={15} className="text-primary" strokeWidth={2.5} /> {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-10 text-[13px] text-muted">
        <span className="flex items-center gap-2">
          <LogoMark size={20} /> CommitCoach
        </span>
        <span>No leaderboards. No guilt. Just honest iteration.</span>
      </footer>
    </div>
  )
}

/** Static mock of the check-in flow so the idea lands before sign up. */
function Preview() {
  return (
    <div className="relative mx-auto w-full max-w-sm animate-rise-in [animation-delay:120ms]">
      <div className="card p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-semibold">Gym</p>
            <p className="text-[13px] text-muted">45 minutes · Mon, Wed, Fri</p>
          </div>
          <div className="flex items-center gap-1">
            <FlameIcon size={18} className="text-streak" />
            <span className="text-[28px] font-extrabold leading-none">11</span>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <span className="btn h-11 bg-completed text-white">
            <CheckIcon size={17} strokeWidth={2.5} /> Done
          </span>
          <span className="btn h-11 border border-border text-muted">
            <XIcon size={16} /> Missed
          </span>
        </div>
      </div>

      <div className="card mt-3 p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-semibold">Journal</p>
            <p className="text-[13px] text-muted">Five lines before bed · Every day</p>
          </div>
          <div className="flex items-center gap-1">
            <FlameIcon size={18} className="text-muted/30" />
            <span className="text-[28px] font-extrabold leading-none text-muted/60">0</span>
          </div>
        </div>
        <div className="mt-3 flex gap-1.5">
          <span className="rounded-full bg-subtle px-2.5 py-0.5 text-[12px] font-medium text-muted">Tired</span>
          <span className="rounded-full bg-subtle px-2.5 py-0.5 text-[12px] font-medium text-muted">Busy</span>
        </div>
        <div className="mt-3 rounded-xl bg-primary-soft/50 p-3.5">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-primary">
            <SparkIcon size={13} /> Coach
          </p>
          <p className="reflection mt-1.5">
            That is the third Thursday in a row tagged tired. Thursdays follow your late Wednesday shift, so writing two
            lines that night might be the realistic version.
          </p>
        </div>
      </div>
    </div>
  )
}
