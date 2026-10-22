import { addDays, addMonths, weekday } from './dates'
import { fmtRelative, fmtShort, fmtDayMonth, fmtTime, fmtDuration, describeRepeat } from './format'
import { partForTime, PART_LABEL } from './recurrence'
import type { Area, DateStr, PartOfDay, Priority, Schedule } from './types'

export interface QuickParse {
  title: string
  priority: Priority
  area?: string
  time?: string
  durationMin?: number
  part: PartOfDay
  schedule: Schedule
  /** What was understood, in words, to show as chips under the input. */
  chips: string[]
}

const WD = String.raw`(?:sun(?:day)?|mon(?:day)?|tue(?:s|sday)?|wed(?:nesday)?|thu(?:r|rs|rsday)?|fri(?:day)?|sat(?:urday)?)`
const MON = String.raw`(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)`
const ORD = String.raw`(?:st|nd|rd|th)?`
const DATE = String.raw`(?:today|tomorrow|tmrw|(?:next\s+)?${WD}|\d{1,2}${ORD}\s+${MON}|${MON}\s+\d{1,2}${ORD}|\d{1,2}\/\d{1,2})`
const NUM_WORDS: Record<string, number> = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, ten: 10 }

const WEEKDAY_INDEX: [RegExp, number][] = [
  [/^sun/, 0],
  [/^mon/, 1],
  [/^tue/, 2],
  [/^wed/, 3],
  [/^thu/, 4],
  [/^fri/, 5],
  [/^sat/, 6],
]
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

function weekdayOf(word: string): number {
  return WEEKDAY_INDEX.find(([re]) => re.test(word))![1]
}

function num(word: string): number {
  return NUM_WORDS[word] ?? Number(word)
}

/** Turns a date phrase into a day on or after `today`. */
export function parseDate(text: string, today: DateStr): DateStr | null {
  const t = text.trim().toLowerCase()
  if (t === 'today') return today
  if (t === 'tomorrow' || t === 'tmrw') return addDays(today, 1)
  let m = t.match(new RegExp(String.raw`^(next\s+)?(${WD})$`))
  if (m) {
    let ahead = (weekdayOf(m[2]) - weekday(today) + 7) % 7
    if (ahead === 0 && m[1]) ahead = 7
    return addDays(today, ahead)
  }
  let day: number | undefined
  let month: number | undefined
  if ((m = t.match(new RegExp(String.raw`^(\d{1,2})${ORD}\s+(${MON})$`)))) {
    day = Number(m[1])
    month = MONTHS.indexOf(m[2].slice(0, 3))
  } else if ((m = t.match(new RegExp(String.raw`^(${MON})\s+(\d{1,2})${ORD}$`)))) {
    day = Number(m[2])
    month = MONTHS.indexOf(m[1].slice(0, 3))
  } else if ((m = t.match(/^(\d{1,2})\/(\d{1,2})$/))) {
    day = Number(m[1])
    month = Number(m[2]) - 1
  }
  if (day === undefined || month === undefined || month < 0 || month > 11 || day < 1 || day > 31) return null
  let year = Number(today.slice(0, 4))
  const make = (y: number) => `${y}-${String(month! + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  if (make(year) < today) year++
  return make(year)
}

function to24h(h: number, min: number, ampm?: string): string | null {
  if (ampm) {
    if (h < 1 || h > 12) return null
    if (ampm === 'pm' && h !== 12) h += 12
    if (ampm === 'am' && h === 12) h = 0
  }
  if (h > 23 || min > 59) return null
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

/**
 * Reads a one-line task like "skincare every day 9pm for 1 month !high #self-care".
 * Whatever isn't recognised becomes the title.
 */
export function parseQuickAdd(input: string, base: DateStr, areas: Area[]): QuickParse {
  let rest = ` ${input} `
  const chips: string[] = []
  const take = (re: RegExp, fn: (...m: string[]) => boolean | void) => {
    rest = rest.replace(re, (...args) => {
      const groups = args.slice(0, -2).map((g) => (typeof g === 'string' ? g.toLowerCase() : g))
      return fn(...groups) === false ? args[0] : ' '
    })
  }

  let priority = 'general' as Priority
  take(/\s(?:!high|!h|!!|high priority)(?=\s)/gi, () => {
    priority = 'high'
  })

  let area: string | undefined
  take(/\s#([\p{L}\d-]+)(?=\s)/giu, (_, tag) => {
    const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\d]/gu, '')
    const found = areas.find((a) => norm(a.name) === norm(tag)) ?? areas.find((a) => norm(a.name).startsWith(norm(tag)))
    if (!found) return false
    area = found.id
  })

  let durationMin: number | undefined
  take(/\s(?:for\s+)?(\d+|an?|one|two)\s*(min|mins|minutes?|m|h|hrs?|hours?)(?=\s)/gi, (_, n, unit) => {
    durationMin = unit.startsWith('h') ? num(n) * 60 : num(n)
  })

  let span: { n: number; unit: string } | undefined
  take(/\sfor\s+(\d+|an?|one|two|three|four|six|ten)\s+(days?|weeks?|months?)(?=\s)/gi, (_, n, unit) => {
    span = { n: num(n), unit }
  })

  let until: DateStr | undefined
  take(new RegExp(String.raw`\s(?:until|till|til)\s+(${DATE})(?=\s)`, 'gi'), (_, d) => {
    until = parseDate(d, base) ?? undefined
    if (!until) return false
  })

  let count: number | undefined
  take(/\s(\d+)\s+times(?=\s)/gi, (_, n) => {
    count = Number(n)
  })

  let start: DateStr | undefined
  take(new RegExp(String.raw`\s(?:from|starting|starts)\s+(${DATE})(?=\s)`, 'gi'), (_, d) => {
    start = parseDate(d, base) ?? undefined
    if (!start) return false
  })

  let kind: Schedule['kind'] = 'once'
  let days: number[] = []
  let every = 2
  let part: PartOfDay | undefined

  take(/\severy\s+other\s+day(?=\s)/gi, () => {
    kind = 'interval'
    every = 2
  })
  take(/\severy\s+(\d+)\s+days(?=\s)/gi, (_, n) => {
    kind = 'interval'
    every = Math.max(2, Number(n))
  })
  take(/\s(?:every\s*day|daily|each\s+day)(?=\s)/gi, () => {
    kind = 'daily'
  })
  take(/\severy\s+(morning|afternoon|evening|night)(?=\s)/gi, (_, p) => {
    kind = 'daily'
    part = p as PartOfDay
  })
  take(/\s(?:every\s+)?weekdays?(?=\s)/gi, () => {
    kind = 'weekdays'
    days = [1, 2, 3, 4, 5]
  })
  take(/\s(?:every\s+|on\s+)?weekends?(?=\s)/gi, () => {
    kind = 'weekdays'
    days = [0, 6]
  })
  const dayList = String.raw`${WD}s?(?:\s*(?:,|and|&)\s*${WD}s?)*`
  take(new RegExp(String.raw`\s(?:every|on|each)\s+(${dayList})(?=\s)`, 'gi'), (_, list) => {
    const found = list.match(new RegExp(WD, 'g'))!.map(weekdayOf)
    // "on friday" alone is a single date, not a repeat. Plural ("on fridays") or "every" repeats.
    if (found.length === 1 && /^on\s/.test(_.trim()) && !/s$/.test(list.trim())) return false
    kind = 'weekdays'
    days = [...new Set(found)]
  })
  take(new RegExp(String.raw`\s(?:except|but\s+not|not\s+on)\s+(${dayList})(?=\s)`, 'gi'), (_, list) => {
    const drop = list.match(new RegExp(WD, 'g'))!.map(weekdayOf)
    if (kind === 'once' || kind === 'daily' || kind === 'interval') {
      kind = 'weekdays'
      days = [0, 1, 2, 3, 4, 5, 6]
    }
    days = days.filter((d) => !drop.includes(d))
  })

  let time: string | undefined
  take(/\s(?:at\s+)?(noon|midday|midnight)(?=\s)/gi, (_, w) => {
    time = w === 'midnight' ? '00:00' : '12:00'
  })
  take(/\s(?:at\s+)?(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)(?=\s)/gi, (_, h, m, ap) => {
    time = to24h(Number(h), Number(m ?? 0), ap) ?? undefined
    if (!time) return false
  })
  take(/\s(?:at\s+)?(\d{1,2})[:.](\d{2})(?=\s)/gi, (_, h, m) => {
    time = to24h(Number(h), Number(m)) ?? undefined
    if (!time) return false
  })

  let date: DateStr | undefined
  take(/\stonight(?=\s)/gi, () => {
    date = base
    part = 'night'
  })
  take(/\s(?:in\s+the|this|at)\s+(morning|afternoon|evening|night)(?=\s)/gi, (_, p) => {
    part = p as PartOfDay
  })
  if (kind === 'once') {
    take(new RegExp(String.raw`\s(?:on\s+|by\s+)?(${DATE})(?=\s)`, 'gi'), (_, d) => {
      if (date) return false
      date = parseDate(d, base) ?? undefined
      if (!date) return false
    })
  }

  const schedStart = kind === 'once' ? (date ?? start ?? base) : (start ?? base)
  let end: Schedule['end'] = { type: 'forever' }
  if (kind !== 'once') {
    if (until) end = { type: 'until', date: until }
    else if (count) end = { type: 'count', count }
    else if (span) {
      const u = span.unit
      const last = u.startsWith('day')
        ? addDays(schedStart, span.n - 1)
        : u.startsWith('week')
          ? addDays(schedStart, span.n * 7 - 1)
          : addDays(addMonths(schedStart, span.n), -1)
      end = { type: 'until', date: last }
    }
  }

  const schedule: Schedule = { kind, start: schedStart, days, every, end, skip: [] }
  const resolvedPart: PartOfDay = time ? partForTime(time) : (part ?? 'anytime')

  if (priority === 'high') chips.push('High priority')
  if (area) chips.push(areas.find((a) => a.id === area)!.name)
  if (kind === 'once') chips.push(fmtRelative(schedStart, base))
  else {
    chips.push(describeRepeat(schedule))
    if (schedStart !== base) chips.push(`From ${fmtShort(schedStart)}`)
    if (end.type === 'until') chips.push(`Until ${fmtDayMonth(end.date)}`)
    if (end.type === 'count') chips.push(`${end.count} times`)
  }
  if (time) chips.push(fmtTime(time))
  else if (part) chips.push(PART_LABEL[part])
  if (durationMin) chips.push(fmtDuration(durationMin))

  const title = rest
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^(?:at|on|for|every|and|,)\s+/i, '')
    .replace(/\s+(?:at|on|for|every|and|from|,)$/i, '')
    .trim()

  return {
    title: title.charAt(0).toUpperCase() + title.slice(1),
    priority,
    area,
    time,
    durationMin,
    part: resolvedPart,
    schedule,
    chips,
  }
}
