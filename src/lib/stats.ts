import { addDays, eachDay, weekday } from './dates'
import { occKey, occursOn, streaks, type CompletionIndex } from './recurrence'
import type { DateStr, Task } from './types'

export interface DayTotal {
  planned: number
  done: number
}

/** Planned and kept per day. Skipped occurrences are left out of both. */
export function dailyTotals(tasks: Task[], log: CompletionIndex, from: DateStr, to: DateStr): Map<DateStr, DayTotal> {
  const out = new Map<DateStr, DayTotal>()
  for (const d of eachDay(from, to)) {
    const t: DayTotal = { planned: 0, done: 0 }
    for (const task of tasks) {
      if (!occursOn(task, d)) continue
      const st = log.get(occKey(task.id, d))?.status
      if (st === 'skipped') continue
      t.planned++
      if (st === 'done') t.done++
    }
    out.set(d, t)
  }
  return out
}

export function sumRange(totals: Map<DateStr, DayTotal>, from: DateStr, to: DateStr): DayTotal {
  const s: DayTotal = { planned: 0, done: 0 }
  for (const d of eachDay(from, to)) {
    const t = totals.get(d)
    if (t) {
      s.planned += t.planned
      s.done += t.done
    }
  }
  return s
}

export const pct = (t: DayTotal) => (t.planned ? Math.round((t.done / t.planned) * 100) : null)

/** Kept share per weekday (0 = Sunday) over a range. */
export function byWeekday(totals: Map<DateStr, DayTotal>, from: DateStr, to: DateStr): DayTotal[] {
  const out = Array.from({ length: 7 }, () => ({ planned: 0, done: 0 }))
  for (const d of eachDay(from, to)) {
    const t = totals.get(d)
    if (!t) continue
    out[weekday(d)].planned += t.planned
    out[weekday(d)].done += t.done
  }
  return out
}

export function byArea(tasks: Task[], log: CompletionIndex, from: DateStr, to: DateStr): Map<string, DayTotal> {
  const out = new Map<string, DayTotal>()
  for (const area of new Set(tasks.map((t) => t.area))) {
    const scoped = tasks.filter((t) => t.area === area)
    out.set(area, sumRange(dailyTotals(scoped, log, from, to), from, to))
  }
  return out
}

export function topStreaks(tasks: Task[], log: CompletionIndex, today: DateStr, n: number) {
  return tasks
    .filter((t) => t.schedule.kind !== 'once')
    .map((t) => ({ task: t, ...streaks(t, log, today) }))
    .filter((s) => s.best > 0)
    .sort((a, b) => b.current - a.current || b.best - a.best)
    .slice(0, n)
}

/** Week start dates for the last `n` weeks, oldest first, ending with the current week. */
export function lastWeeks(currentWeekStart: DateStr, n: number): DateStr[] {
  return Array.from({ length: n }, (_, i) => addDays(currentWeekStart, -7 * (n - 1 - i)))
}
