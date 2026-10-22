import { addDays, addMonths, diffDays, eachDay, timeToMin, weekday } from './dates'
import type { Completion, DateStr, Override, PartOfDay, Schedule, Task } from './types'

export type OccurrenceStatus = 'open' | 'done' | 'skipped'

export interface Occurrence {
  key: string
  task: Task
  date: DateStr
  /** The task's time, or the time this one occurrence was moved to. */
  time?: string
  status: OccurrenceStatus
}

export type CompletionIndex = Map<string, Completion>
export type OverrideIndex = Map<string, Override>

export const occKey = (taskId: string, date: DateStr) => `${taskId}|${date}`

export function indexCompletions(list: Completion[]): CompletionIndex {
  return new Map(list.map((c) => [c.id, c]))
}

export function indexOverrides(list: Override[]): OverrideIndex {
  return new Map(list.map((o) => [o.id, o]))
}

/** Does the repeat pattern land on this day, ignoring start, end, skips and pauses? */
function patternHits(s: Schedule, date: DateStr): boolean {
  switch (s.kind) {
    case 'once':
      return date === s.start
    case 'daily':
      return true
    case 'weekdays':
      return s.days.includes(weekday(date))
    case 'interval':
      return diffDays(s.start, date) % Math.max(1, s.every) === 0
  }
}

/** 1-based position of `date` among the pattern's days since start. Assumes the pattern hits `date`. */
function ordinal(s: Schedule, date: DateStr): number {
  const span = diffDays(s.start, date)
  switch (s.kind) {
    case 'once':
      return 1
    case 'daily':
      return span + 1
    case 'interval':
      return Math.floor(span / Math.max(1, s.every)) + 1
    case 'weekdays': {
      const fullWeeks = Math.floor((span + 1) / 7)
      let n = fullWeeks * s.days.length
      for (let d = addDays(s.start, fullWeeks * 7); d <= date; d = addDays(d, 1)) {
        if (s.days.includes(weekday(d))) n++
      }
      return n
    }
  }
}

export function isPaused(task: Task, date: DateStr): boolean {
  return task.pauses.some((p) => date >= p.from && (!p.to || date <= p.to))
}

export function isPausedNow(task: Task): boolean {
  return task.pauses.some((p) => !p.to)
}

export function occursOn(task: Task, date: DateStr): boolean {
  const s = task.schedule
  if (date < s.start) return false
  if (!patternHits(s, date)) return false
  if (s.end.type === 'until' && date > s.end.date) return false
  // Skipped days still use up a count: "10 times" means ten scheduled days.
  if (s.end.type === 'count' && ordinal(s, date) > s.end.count) return false
  if (s.skip.includes(date)) return false
  if (isPaused(task, date)) return false
  return true
}

/** The last day the schedule can happen, or null if it runs forever. */
export function lastDate(s: Schedule): DateStr | null {
  if (s.kind === 'once') return s.start
  if (s.end.type === 'forever') return null
  if (s.end.type === 'until') return s.end.date
  const count = Math.max(1, s.end.count)
  if (s.kind === 'daily') return addDays(s.start, count - 1)
  if (s.kind === 'interval') return addDays(s.start, (count - 1) * Math.max(1, s.every))
  if (s.days.length === 0) return s.start
  let n = 0
  for (let d = s.start; ; d = addDays(d, 1)) {
    if (s.days.includes(weekday(d)) && ++n === count) return d
  }
}

/** The next `n` days the task happens, from `from` onwards. */
export function nextOccurrences(task: Task, from: DateStr, n: number, horizonDays = 400): DateStr[] {
  const out: DateStr[] = []
  const last = lastDate(task.schedule)
  for (let i = 0, d = from; i < horizonDays && out.length < n; i++, d = addDays(d, 1)) {
    if (last && d > last) break
    if (occursOn(task, d)) out.push(d)
  }
  return out
}

export const PART_ORDER: PartOfDay[] = ['morning', 'afternoon', 'evening', 'night', 'anytime']

export const PART_LABEL: Record<PartOfDay, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  night: 'Night',
  anytime: 'Any time',
}

/** Hour ranges for each part of the day, used to place untimed tasks on the dial. */
export const PART_HOURS: Record<Exclude<PartOfDay, 'anytime'>, [number, number]> = {
  morning: [5, 12],
  afternoon: [12, 17],
  evening: [17, 21],
  night: [21, 29],
}

export function partForTime(time: string): PartOfDay {
  const h = timeToMin(time) / 60
  if (h >= 5 && h < 12) return 'morning'
  if (h >= 12 && h < 17) return 'afternoon'
  if (h >= 17 && h < 21) return 'evening'
  return 'night'
}

/** Minutes used to sort an occurrence within the day. Early-hours night tasks sort last. */
function sortMinute(o: Occurrence): number {
  if (o.time) {
    const m = timeToMin(o.time)
    return m < 5 * 60 ? m + 1440 : m
  }
  const part = o.task.part
  if (part === 'anytime') return 3000
  return PART_HOURS[part][0] * 60 - 1
}

export function occurrencesOn(
  tasks: Task[],
  date: DateStr,
  log: CompletionIndex,
  overrides: OverrideIndex,
): Occurrence[] {
  const out: Occurrence[] = []
  for (const task of tasks) {
    if (!occursOn(task, date)) continue
    const key = occKey(task.id, date)
    out.push({
      key,
      task,
      date,
      time: overrides.get(key)?.time ?? task.time,
      status: log.get(key)?.status ?? 'open',
    })
  }
  return out.sort(
    (a, b) =>
      sortMinute(a) - sortMinute(b) ||
      (a.task.priority === b.task.priority ? 0 : a.task.priority === 'high' ? -1 : 1) ||
      a.task.createdAt - b.task.createdAt,
  )
}

export function partOfOccurrence(o: Occurrence): PartOfDay {
  return o.time ? partForTime(o.time) : o.task.part
}

export interface Streaks {
  current: number
  best: number
}

/**
 * Consecutive scheduled days kept. Days the routine isn't scheduled, skipped days,
 * and today (while it's still open) don't break a streak.
 */
export function streaks(task: Task, log: CompletionIndex, today: DateStr): Streaks {
  let run = 0
  let best = 0
  const last = lastDate(task.schedule)
  const end = last && last < today ? last : today
  for (let d = task.schedule.start; d <= end; d = addDays(d, 1)) {
    if (!occursOn(task, d)) continue
    const st = log.get(occKey(task.id, d))?.status
    if (st === 'done') {
      run++
      best = Math.max(best, run)
    } else if (st === 'skipped' || d === today) {
      continue
    } else {
      run = 0
    }
  }
  return { current: run, best }
}

export type DayMark = 'done' | 'skipped' | 'missed' | 'open' | 'none'

/** One mark per day for the last `n` days, oldest first. */
export function recentMarks(task: Task, log: CompletionIndex, today: DateStr, n: number): { date: DateStr; mark: DayMark }[] {
  return eachDay(addDays(today, -(n - 1)), today).map((date) => {
    if (!occursOn(task, date)) return { date, mark: 'none' }
    const st = log.get(occKey(task.id, date))?.status
    if (st) return { date, mark: st }
    return { date, mark: date === today ? 'open' : 'missed' }
  })
}

export interface Tally {
  planned: number
  done: number
  skipped: number
}

/**
 * Counts occurrences between two days. Skipped occurrences are left out of `planned`
 * unless `skipsCountAsMissed`.
 */
export function tally(
  tasks: Task[],
  log: CompletionIndex,
  from: DateStr,
  to: DateStr,
  skipsCountAsMissed = false,
): Tally {
  const t: Tally = { planned: 0, done: 0, skipped: 0 }
  for (const date of eachDay(from, to)) {
    for (const task of tasks) {
      if (!occursOn(task, date)) continue
      const st = log.get(occKey(task.id, date))?.status
      if (st === 'skipped') {
        t.skipped++
        if (skipsCountAsMissed) t.planned++
      } else {
        t.planned++
        if (st === 'done') t.done++
      }
    }
  }
  return t
}

/** Preset lengths offered in the editor, turned into an inclusive end date. */
export const DURATION_PRESETS = [
  { id: '1w', label: '1 week', end: (start: DateStr) => addDays(start, 6) },
  { id: '2w', label: '2 weeks', end: (start: DateStr) => addDays(start, 13) },
  { id: '1m', label: '1 month', end: (start: DateStr) => addDays(addMonths(start, 1), -1) },
  { id: '3m', label: '3 months', end: (start: DateStr) => addDays(addMonths(start, 3), -1) },
] as const
