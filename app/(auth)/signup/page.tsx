import Link from 'next/link'
import type { Metadata } from 'next'
import { AuthShell } from '@/components/auth/AuthShell'
import { GoogleButton } from '@/components/auth/GoogleButton'

export const metadata: Metadata = { title: 'Create an account' }

export default function SignupPage() {
  return (
    <AuthShell
      title="Start with one habit"
      subtitle="Track it honestly for a few weeks. When you miss a day, tell us why. We will help you see the pattern."
    >
      <GoogleButton next="/habits/new" label="Sign up with Google" />
      <p className="text-center text-[13px] text-muted">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-text underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </AuthShell>
  )
}
