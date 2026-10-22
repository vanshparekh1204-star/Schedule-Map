import { describe, expect, it } from 'vitest'
import { addDays, addMonths, diffDays, startOfWeek, todayStr } from './dates'
import {
  indexCompletions,
  lastDate,
  nextOccurrences,
  occKey,
  occursOn,
  streaks,
  tally,
  DURATION_PRESETS,
} from './recurrence'
import type { Completion, Schedule, Task } from './types'

function task(schedule: Partial<Schedule>, extra: Partial<Task> = {}): Task {
  return {
    id: 't1',
    title: 'Test',
    notes: '',
    priority: 'general',
    area: 'a',
    part: 'anytime',
    pauses: [],
    createdAt: 0,
    schedule: { kind: 'daily', start: '2026-10-01', days: [], every: 2, end: { type: 'forever' }, skip: [], ...schedule },
    ...extra,
  }
}

const log = (entries: [string, Completion['status']][]) =>
  indexCompletions(entries.map(([date, status]) => ({ id: occKey('t1', date), taskId: 't1', date, status, at: 0 })))

describe('dates', () => {
  it('does day math across DST and month ends', () => {
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30')
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(diffDays('2026-03-01', '2026-04-01')).toBe(31)
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28')
    expect(addMonths('2028-01-31', 1)).toBe('2028-02-29')
  })
  it('starts weeks on the chosen day', () => {
    // 22 Oct 2026 is a Thursday
    expect(startOfWeek('2026-10-22', 1)).toBe('2026-10-19')
    expect(startOfWeek('2026-10-22', 0)).toBe('2026-10-18')
    expect(startOfWeek('2026-10-19', 1)).toBe('2026-10-19')
  })
  it('keeps "today" until the rollover hour', () => {
    expect(todayStr(3, new Date(2026, 9, 23, 2, 30))).toBe('2026-10-22')
    expect(todayStr(3, new Date(2026, 9, 23, 3, 0))).toBe('2026-10-23')
    expect(todayStr(0, new Date(2026, 9, 23, 0, 5))).toBe('2026-10-23')
  })
})

describe('occursOn', () => {
  it('handles one-off tasks', () => {
    const t = task({ kind: 'once', start: '2026-10-05' })
    expect(occursOn(t, '2026-10-05')).toBe(true)
    expect(occursOn(t, '2026-10-06')).toBe(false)
  })

  it('repeats daily from the start date', () => {
    const t = task({ kind: 'daily' })
    expect(occursOn(t, '2026-09-30')).toBe(false)
    expect(occursOn(t, '2026-10-01')).toBe(true)
    expect(occursOn(t, '2027-02-14')).toBe(true)
  })

  it('repeats on chosen weekdays', () => {
    const t = task({ kind: 'weekdays', days: [1, 3, 5] }) // Mon Wed Fri
    expect(occursOn(t, '2026-10-19')).toBe(true) // Mon
    expect(occursOn(t, '2026-10-20')).toBe(false) // Tue
    expect(occursOn(t, '2026-10-23')).toBe(true) // Fri
    expect(occursOn(t, '2026-10-25')).toBe(false) // Sun
  })

  it('repeats every N days', () => {
    const t = task({ kind: 'interval', every: 3 })
    expect(occursOn(t, '2026-10-01')).toBe(true)
    expect(occursOn(t, '2026-10-02')).toBe(false)
    expect(occursOn(t, '2026-10-04')).toBe(true)
    expect(occursOn(t, '2026-10-31')).toBe(true)
  })

  it('leaves out skipped days', () => {
    const t = task({ kind: 'daily', skip: ['2026-10-10'] })
    expect(occursOn(t, '2026-10-09')).toBe(true)
    expect(occursOn(t, '2026-10-10')).toBe(false)
  })

  it('stops after an until date, inclusive', () => {
    const t = task({ kind: 'daily', end: { type: 'until', date: '2026-10-31' } })
    expect(occursOn(t, '2026-10-31')).toBe(true)
    expect(occursOn(t, '2026-11-01')).toBe(false)
  })

  it('stops after a number of times', () => {
    const daily = task({ kind: 'daily', end: { type: 'count', count: 3 } })
    expect(occursOn(daily, '2026-10-03')).toBe(true)
    expect(occursOn(daily, '2026-10-04')).toBe(false)

    // Thu 1 Oct 2026 start, Mon/Thu only: Thu 1, Mon 5, Thu 8 are the first three
    const wk = task({ kind: 'weekdays', days: [1, 4], end: { type: 'count', count: 3 } })
    expect(occursOn(wk, '2026-10-08')).toBe(true)
    expect(occursOn(wk, '2026-10-12')).toBe(false)
    expect(lastDate(wk.schedule)).toBe('2026-10-08')

    const every2 = task({ kind: 'interval', every: 2, end: { type: 'count', count: 4 } })
    expect(lastDate(every2.schedule)).toBe('2026-10-07')
  })

  it('pauses between dates, and while a pause is open', () => {
    const t = task({ kind: 'daily' }, { pauses: [{ from: '2026-10-05', to: '2026-10-07' }, { from: '2026-10-20' }] })
    expect(occursOn(t, '2026-10-04')).toBe(true)
    expect(occursOn(t, '2026-10-06')).toBe(false)
    expect(occursOn(t, '2026-10-08')).toBe(true)
    expect(occursOn(t, '2026-11-30')).toBe(false)
  })

  it('handles leap days and year boundaries', () => {
    const t = task({ kind: 'interval', every: 7, start: '2028-02-22' })
    expect(occursOn(t, '2028-02-29')).toBe(true)
    const y = task({ kind: 'daily', start: '2026-12-30', end: { type: 'until', date: '2027-01-02' } })
    expect(nextOccurrences(y, '2026-12-01', 10)).toEqual(['2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02'])
  })
})

describe('duration presets', () => {
  it('end on the last day of the span', () => {
    const end = (id: string) => DURATION_PRESETS.find((p) => p.id === id)!.end('2026-10-22')
    expect(end('1w')).toBe('2026-10-28')
    expect(end('1m')).toBe('2026-11-21')
    expect(end('3m')).toBe('2027-01-21')
  })
})

describe('streaks', () => {
  it('counts kept days and ignores unscheduled ones', () => {
    const t = task({ kind: 'weekdays', days: [1, 3, 5], start: '2026-10-05' })
    const l = log([
      ['2026-10-05', 'done'],
      ['2026-10-07', 'done'],
      ['2026-10-09', 'done'],
      ['2026-10-12', 'done'],
    ])
    expect(streaks(t, l, '2026-10-13')).toEqual({ current: 4, best: 4 })
  })

  it('breaks on a missed day, but not on a skip or an open today', () => {
    const t = task({ kind: 'daily', start: '2026-10-01' })
    const l = log([
      ['2026-10-01', 'done'],
      ['2026-10-02', 'done'],
      ['2026-10-03', 'done'],
      // 4th missed
      ['2026-10-05', 'done'],
      ['2026-10-06', 'skipped'],
      ['2026-10-07', 'done'],
    ])
    expect(streaks(t, l, '2026-10-08')).toEqual({ current: 2, best: 3 })
  })
})

describe('tally', () => {
  it('leaves skips out of planned unless asked', () => {
    const t = task({ kind: 'daily', start: '2026-10-01' })
    const l = log([
      ['2026-10-01', 'done'],
      ['2026-10-02', 'skipped'],
    ])
    expect(tally([t], l, '2026-10-01', '2026-10-04')).toEqual({ planned: 3, done: 1, skipped: 1 })
    expect(tally([t], l, '2026-10-01', '2026-10-04', true)).toEqual({ planned: 4, done: 1, skipped: 1 })
  })
})
