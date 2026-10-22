import { addDays, diffDays, toLocalDate, timeToMin } from './dates'
import { lastDate } from './recurrence'
import type { DateStr, Schedule } from './types'

const locale = typeof navigator !== 'undefined' ? navigator.language : 'en-GB'

const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, opts)
const shortFmt = fmt({ weekday: 'short', day: 'numeric', month: 'short' })
const dayMonthFmt = fmt({ day: 'numeric', month: 'short' })
const longFmt = fmt({ weekday: 'long', day: 'numeric', month: 'long' })
const weekdayFmt = fmt({ weekday: 'long' })
const weekdayShortFmt = fmt({ weekday: 'short' })
const fullDateFmt = fmt({ day: 'numeric', month: 'long', year: 'numeric' })
const monthFmt = fmt({ month: 'long' })
const monthYearFmt = fmt({ month: 'long', year: 'numeric' })
const timeFmt = fmt({ hour: 'numeric', minute: '2-digit', hour12: true })

/** "Thu 23 Oct" */
export const fmtShort = (d: DateStr) => shortFmt.format(toLocalDate(d))
/** "23 Oct" */
export const fmtDayMonth = (d: DateStr) => dayMonthFmt.format(toLocalDate(d))
/** "Thursday 23 October" */
export const fmtLong = (d: DateStr) => longFmt.format(toLocalDate(d))
/** "22 October 2026" */
export const fmtFullDate = (d: DateStr) => fullDateFmt.format(toLocalDate(d))
export const fmtWeekday =(d: DateStr) => weekdayFmt.format(toLocalDate(d))
export const fmtMonth = (d: DateStr) => monthFmt.format(toLocalDate(d))
export const fmtMonthYear = (d: DateStr) => monthYearFmt.format(toLocalDate(d))

/** Weekday names indexed 0 = Sunday, from a known Sunday (4 Jan 2026). */
export const WEEKDAY_LONG = Array.from({ length: 7 }, (_, i) => weekdayFmt.format(toLocalDate(addDays('2026-01-04', i))))
export const WEEKDAY_SHORT = Array.from({ length: 7 }, (_, i) =>
  weekdayShortFmt.format(toLocalDate(addDays('2026-01-04', i))),
)

/** "9:30 pm". Always 12-hour, whatever the device's locale. */
export function fmtTime(t: string): string {
  const m = timeToMin(t)
  return timeFmt.format(new Date(2026, 0, 1, Math.floor(m / 60), m % 60))
}

export function fmtDuration(min: number): string {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const rest = min % 60
  return rest ? `${h} h ${rest} min` : `${h} h`
}

/** "Today", "Tomorrow", "Yesterday", or "Thu 23 Oct". */
export function fmtRelative(d: DateStr, today: DateStr): string {
  const n = diffDays(today, d)
  if (n === 0) return 'Today'
  if (n === 1) return 'Tomorrow'
  if (n === -1) return 'Yesterday'
  return fmtShort(d)
}

export function joinList(items: string[]): string {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

export function orderedWeekdays(weekStart: 0 | 1): number[] {
  return Array.from({ length: 7 }, (_, i) => (i + weekStart) % 7)
}

/** The repeat pattern alone: "Every day", "Weekdays", "Mon, Wed and Fri", "Every 3 days". */
export function describeRepeat(s: Schedule, weekStart: 0 | 1 = 1): string {
  switch (s.kind) {
    case 'once':
      return 'Once'
    case 'daily':
      return 'Every day'
    case 'interval':
      return s.every === 2 ? 'Every other day' : `Every ${s.every} days`
    case 'weekdays': {
      const days = [...s.days].sort()
      const key = days.join('')
      if (key === '12345') return 'Weekdays'
      if (key === '06') return 'Weekends'
      if (days.length === 7) return 'Every day'
      if (days.length === 6) {
        const missing = [0, 1, 2, 3, 4, 5, 6].find((d) => !days.includes(d))!
        return `Every day except ${WEEKDAY_LONG[missing]}`
      }
      if (days.length === 1) return `Every ${WEEKDAY_LONG[days[0]]}`
      return joinList(orderedWeekdays(weekStart).filter((d) => days.includes(d)).map((d) => WEEKDAY_SHORT[d]))
    }
  }
}

/** Full rule in words: "Every day, until 21 Nov" or "Once, Thu 23 Oct". */
export function describeSchedule(s: Schedule, today: DateStr, weekStart: 0 | 1 = 1): string {
  if (s.kind === 'once') return fmtRelative(s.start, today)
  const parts = [describeRepeat(s, weekStart)]
  if (s.start > today) parts.push(`from ${fmtShort(s.start)}`)
  if (s.end.type === 'count') parts.push(`${s.end.count} times`)
  else if (s.end.type === 'until') {
    const last = lastDate(s)!
    parts.push(last < today ? `ended ${fmtDayMonth(last)}` : `until ${fmtDayMonth(last)}`)
  }
  return parts.join(', ')
}
