import type { Profile } from './types'

export const FREE_HABIT_LIMIT = 3

/**
 * Billing is not wired up yet, so limits stay off unless ENFORCE_PRO=true.
 * Every gate goes through here so turning them on is one env var.
 */
export function limitsEnforced(): boolean {
  return process.env.ENFORCE_PRO === 'true'
}

export function hasPro(profile: Pick<Profile, 'plan'>): boolean {
  return !limitsEnforced() || profile.plan === 'pro'
}

export function habitLimit(profile: Pick<Profile, 'plan'>): number | null {
  return hasPro(profile) ? null : FREE_HABIT_LIMIT
}

export const PRO_REQUIRED = 'This is a Pro feature. Free accounts get tracking for up to 3 habits.'
