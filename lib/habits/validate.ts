import { cleanText } from '@/lib/api'
import type { Category, Frequency, Weekday } from '@/lib/types'
import { CATEGORIES, FREQUENCIES, WEEKDAYS } from '@/lib/types'

export interface HabitInput {
  name?: string
  description?: string | null
  category?: Category | null
  target_frequency?: Frequency
  custom_days?: Weekday[] | null
  weekly_target?: number | null
  current_commitment?: string | null
}

/**
 * Validates habit fields from a request body. With partial=true, missing
 * fields are left alone (for PATCH). Schedule fields are always normalised
 * together so a habit can never end up 'custom' with no days.
 */
export function parseHabitInput(
  body: Record<string, unknown>,
  partial: boolean
): { value: HabitInput; error?: never } | { error: string; value?: never } {
  const value: HabitInput = {}

  if (!partial || 'name' in body) {
    const name = cleanText(body.name, 80)
    if (!name) return { error: 'Give the habit a name' }
    value.name = name
  }

  if ('description' in body) value.description = cleanText(body.description, 500)

  if ('category' in body) {
    const c = body.category
    if (c !== null && !CATEGORIES.includes(c as Category)) return { error: 'Unknown category' }
    value.category = (c as Category | null) ?? null
  }

  if ('current_commitment' in body) value.current_commitment = cleanText(body.current_commitment, 200)

  if (!partial || 'target_frequency' in body) {
    const f = body.target_frequency ?? 'daily'
    if (!FREQUENCIES.includes(f as Frequency)) return { error: 'Unknown frequency' }
    value.target_frequency = f as Frequency

    if (f === 'custom') {
      const raw = Array.isArray(body.custom_days) ? body.custom_days : []
      const days = WEEKDAYS.filter((d) => raw.includes(d))
      if (!days.length) return { error: 'Pick at least one day' }
      value.custom_days = days
    } else {
      value.custom_days = null
    }

    if (f === 'weekly') {
      const n = Number(body.weekly_target)
      if (!Number.isInteger(n) || n < 1 || n > 7) return { error: 'Times per week must be between 1 and 7' }
      value.weekly_target = n
    } else {
      value.weekly_target = null
    }
  }

  return { value }
}
