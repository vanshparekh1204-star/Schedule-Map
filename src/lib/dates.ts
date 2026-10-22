import type { DateStr } from './types'

const DAY_MS = 86_400_000

/** Date strings are treated as UTC midnight internally, which keeps day math free of DST jumps. */
function toUTC(d: DateStr): number {
  const [y, m, day] = d.split('-').map(Number)
  return Date.UTC(y, m - 1, day)
}

function fromUTC(ms: number): DateStr {
  const d = new Date(ms)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function fromLocalDate(d: Date): DateStr {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

/** A Date at local noon on that day, for formatting with Intl/date-fns. */
export function toLocalDate(d: DateStr): Date {
  const [y, m, day] = d.split('-').map(Number)
  return new Date(y, m - 1, day, 12)
}

/** Today's date, where the day only turns over at `rolloverHour` (night owls finish "today" at 2am). */
export function todayStr(rolloverHour = 0, now = new Date()): DateStr {
  return fromLocalDate(new Date(now.getTime() - rolloverHour * 3_600_000))
}

export function addDays(d: DateStr, n: number): DateStr {
  return fromUTC(toUTC(d) + n * DAY_MS)
}

/** Whole days from a to b (b − a). */
export function diffDays(a: DateStr, b: DateStr): number {
  return Math.round((toUTC(b) - toUTC(a)) / DAY_MS)
}

/** 0 = Sunday. */
export function weekday(d: DateStr): number {
  return new Date(toUTC(d)).getUTCDay()
}

export function addMonths(d: DateStr, n: number): DateStr {
  const [y, m, day] = d.split('-').map(Number)
  const target = new Date(Date.UTC(y, m - 1 + n, 1))
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate()
  target.setUTCDate(Math.min(day, lastDay))
  return fromUTC(target.getTime())
}

export function startOfWeek(d: DateStr, weekStart: 0 | 1): DateStr {
  const back = (weekday(d) - weekStart + 7) % 7
  return addDays(d, -back)
}

export function startOfMonth(d: DateStr): DateStr {
  return d.slice(0, 8) + '01'
}

export function endOfMonth(d: DateStr): DateStr {
  return addDays(addMonths(startOfMonth(d), 1), -1)
}

export function eachDay(from: DateStr, to: DateStr): DateStr[] {
  const out: DateStr[] = []
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d)
  return out
}

export function minDate(a: DateStr, b: DateStr): DateStr {
  return a < b ? a : b
}

export function maxDate(a: DateStr, b: DateStr): DateStr {
  return a > b ? a : b
}

/** Minutes since midnight for `HH:mm`. */
export function timeToMin(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

export function minToTime(min: number): string {
  const m = ((min % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}
