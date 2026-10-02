export const CATEGORIES = [
  'health',
  'productivity',
  'learning',
  'mindfulness',
  'social',
  'finance',
  'other',
] as const
export type Category = (typeof CATEGORIES)[number]

export const FREQUENCIES = ['daily', 'weekdays', 'weekly', 'custom'] as const
export type Frequency = (typeof FREQUENCIES)[number]

export const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
export type Weekday = (typeof WEEKDAYS)[number]

export const CONTEXT_TAGS = ['busy', 'tired', 'forgot', 'unmotivated', 'travel', 'sick', 'other'] as const
export type ContextTag = (typeof CONTEXT_TAGS)[number]

export interface Adjustment {
  date: string
  from: string
  to: string
  reason: string
}

export interface Profile {
  id: string
  display_name: string | null
  timezone: string
  plan: 'free' | 'pro'
  reminder_enabled: boolean
  reminder_hour: number
  last_reminded_on: string | null
}

export interface Habit {
  id: string
  user_id: string
  created_at: string
  updated_at: string
  name: string
  description: string | null
  category: Category | null
  target_frequency: Frequency
  custom_days: Weekday[] | null
  weekly_target: number | null
  current_streak: number
  longest_streak: number
  is_active: boolean
  original_commitment: string | null
  current_commitment: string | null
  adjustment_history: Adjustment[]
}

export interface Checkin {
  id: string
  habit_id: string
  user_id: string
  checkin_date: string
  completed: boolean
  logged_at: string
  miss_reason: string | null
  context_tags: ContextTag[] | null
  ai_reflection: string | null
  ai_suggestion: string | null
}

export interface Pattern {
  habit_name: string
  pattern_description: string
  trigger: string
  recommendation: string
}

export interface PatternInsight {
  id: string
  user_id: string
  generated_at: string
  based_on_checkins: number | null
  patterns: Pattern[]
  cross_habit_insight: string | null
}

export interface AdjustmentSuggestion {
  id: string
  habit_id: string
  user_id: string
  created_at: string
  resolved_at: string | null
  status: 'pending' | 'accepted' | 'dismissed'
  should_adjust: boolean
  reason: string
  suggested_commitment: string | null
  suggested_frequency: Frequency | null
  suggested_custom_days: Weekday[] | null
  suggested_weekly_target: number | null
}

/** What a single day looks like for one habit. */
export type DayStatus = 'done' | 'missed' | 'unlogged' | 'not_due' | 'future' | 'before_start'

export const CATEGORY_LABEL: Record<Category, string> = {
  health: 'Health',
  productivity: 'Productivity',
  learning: 'Learning',
  mindfulness: 'Mindfulness',
  social: 'Social',
  finance: 'Finance',
  other: 'Other',
}

export const TAG_LABEL: Record<ContextTag, string> = {
  busy: 'Busy',
  tired: 'Tired',
  forgot: 'Forgot',
  unmotivated: 'Unmotivated',
  travel: 'Travel',
  sick: 'Sick',
  other: 'Other',
}

export const WEEKDAY_LABEL: Record<Weekday, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
}

export const WEEKDAY_SHORT: Record<Weekday, string> = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun',
}
