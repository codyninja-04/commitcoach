import type { Habit } from '@/lib/types'
import { commitmentText, scheduleLabel } from './schedule'

/** One line used in adjustment history, e.g. "Gym 45 minutes (3x a week)". */
export function describeCommitment(habit: Habit): string {
  return `${commitmentText(habit)} (${scheduleLabel(habit).toLowerCase()})`
}
