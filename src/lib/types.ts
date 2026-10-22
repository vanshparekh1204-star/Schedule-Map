/** A local calendar date, `yyyy-MM-dd`. Never a timestamp, so time zones can't shift it. */
export type DateStr = string

export type Priority = 'high' | 'general'
export type PartOfDay = 'morning' | 'afternoon' | 'evening' | 'night' | 'anytime'
export type RepeatKind = 'once' | 'daily' | 'weekdays' | 'interval'

export type ScheduleEnd =
  | { type: 'forever' }
  | { type: 'until'; date: DateStr }
  | { type: 'count'; count: number }

export interface Schedule {
  kind: RepeatKind
  /** First day it happens. For a one-off task, the day it happens. */
  start: DateStr
  /** Weekdays, 0 = Sunday. Used when kind is 'weekdays'. */
  days: number[]
  /** Every N days. Used when kind is 'interval'. */
  every: number
  end: ScheduleEnd
  /** Single days left out on purpose. */
  skip: DateStr[]
}

export interface Pause {
  from: DateStr
  /** Last paused day, inclusive. Missing while the pause is ongoing. */
  to?: DateStr
}

export interface Task {
  id: string
  title: string
  notes: string
  priority: Priority
  area: string
  /** `HH:mm`, when the task has a set time. */
  time?: string
  durationMin?: number
  part: PartOfDay
  schedule: Schedule
  pauses: Pause[]
  createdAt: number
}

export type CompletionStatus = 'done' | 'skipped'

export interface Completion {
  /** `${taskId}|${date}` */
  id: string
  taskId: string
  date: DateStr
  status: CompletionStatus
  at: number
}

/** Moves one occurrence to another time without changing the routine. */
export interface Override {
  id: string
  taskId: string
  date: DateStr
  time: string
}

export type RewardScope =
  | { type: 'all' }
  | { type: 'high' }
  | { type: 'area'; area: string }
  | { type: 'task'; taskId: string }

export interface RewardTier {
  /** Minimum share of planned tasks kept, 0–100. */
  min: number
  allowance: number
}

export interface RewardRule {
  id: string
  name: string
  /** Singular unit shown on coins and in sentences, e.g. "order". */
  unit: string
  period: 'week' | 'month'
  scope: RewardScope
  tiers: RewardTier[]
  /** What the first period gives, before there's a score to go on. */
  base: number
  skipsCountAsMissed: boolean
  rollover: boolean
  active: boolean
  /** Day the rule was made. Its first period is the one containing this day. */
  since: DateStr
}

export interface Redemption {
  id: string
  ruleId: string
  periodStart: DateStr
  at: number
  note?: string
}

export interface Area {
  id: string
  name: string
}

export interface Settings {
  weekStart: 0 | 1
  /** Hour after midnight when the day turns over, 0–4. */
  rolloverHour: number
  areas: Area[]
  lastBackup?: number
}
