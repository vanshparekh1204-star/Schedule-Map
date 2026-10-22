import { describe, expect, it } from 'vitest'
import { parseDate, parseQuickAdd } from './quickAdd'
import type { Area } from './types'

// Thursday 22 October 2026
const TODAY = '2026-10-22'
const areas: Area[] = [
  { id: 'self', name: 'Self-care' },
  { id: 'faith', name: 'Faith' },
  { id: 'work', name: 'Work' },
]
const parse = (s: string) => parseQuickAdd(s, TODAY, areas)

describe('parseDate', () => {
  it('reads relative and calendar dates', () => {
    expect(parseDate('tomorrow', TODAY)).toBe('2026-10-23')
    expect(parseDate('sat', TODAY)).toBe('2026-10-24')
    expect(parseDate('thursday', TODAY)).toBe(TODAY)
    expect(parseDate('next thursday', TODAY)).toBe('2026-10-29')
    expect(parseDate('30 nov', TODAY)).toBe('2026-11-30')
    expect(parseDate('nov 30th', TODAY)).toBe('2026-11-30')
    expect(parseDate('5 jan', TODAY)).toBe('2027-01-05')
    expect(parseDate('25/12', TODAY)).toBe('2026-12-25')
  })
})

describe('parseQuickAdd', () => {
  it('reads a daily routine with a time and a span', () => {
    const p = parse('skincare every day 9pm for 1 month #self')
    expect(p.title).toBe('Skincare')
    expect(p.area).toBe('self')
    expect(p.time).toBe('21:00')
    expect(p.part).toBe('night')
    expect(p.schedule).toMatchObject({ kind: 'daily', start: TODAY, end: { type: 'until', date: '2026-11-21' } })
  })

  it('reads a one-off task with priority and a date', () => {
    const p = parse('call the bank tomorrow !high')
    expect(p.title).toBe('Call the bank')
    expect(p.priority).toBe('high')
    expect(p.schedule).toMatchObject({ kind: 'once', start: '2026-10-23' })
  })

  it('reads weekday lists and exceptions', () => {
    expect(parse('gym every mon, wed and fri at 7am').schedule).toMatchObject({ kind: 'weekdays', days: [1, 3, 5] })
    expect(parse('gym on tuesdays').schedule).toMatchObject({ kind: 'weekdays', days: [2] })
    const p = parse('pray daily except sunday')
    expect(p.title).toBe('Pray')
    expect(p.schedule.days).toEqual([1, 2, 3, 4, 5, 6])
    expect(parse('standup weekdays 9:30').schedule.days).toEqual([1, 2, 3, 4, 5])
  })

  it('keeps time-of-day words that are part of the title', () => {
    const p = parse('morning prayer daily')
    expect(p.title).toBe('Morning prayer')
    expect(p.part).toBe('anytime')
    expect(parse('pray every morning').part).toBe('morning')
  })

  it('treats "on friday" as a date, not a repeat', () => {
    const p = parse('pay rent on friday')
    expect(p.title).toBe('Pay rent')
    expect(p.schedule).toMatchObject({ kind: 'once', start: '2026-10-23' })
  })

  it('reads intervals, counts, start dates and durations', () => {
    expect(parse('water plants every 3 days').schedule).toMatchObject({ kind: 'interval', every: 3 })
    expect(parse('stretch every other day 10 times').schedule).toMatchObject({
      kind: 'interval',
      every: 2,
      end: { type: 'count', count: 10 },
    })
    const p = parse('walk daily from monday for 2 weeks 30 min')
    expect(p.durationMin).toBe(30)
    expect(p.schedule).toMatchObject({ start: '2026-10-26', end: { type: 'until', date: '2026-11-08' } })
  })

  it('leaves unknown tags in the title', () => {
    expect(parse('read #books').title).toBe('Read #books')
  })
})
