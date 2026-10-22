import { describe, expect, it } from 'vitest'
import { eachDay } from './dates'
import { indexCompletions, occKey } from './recurrence'
import { describeTiers, ledger, outlook, plural, tierFor } from './rewards'
import type { Completion, Redemption, RewardRule, Task } from './types'

// Weeks start Monday. 5 Oct 2026 is a Monday.
const W1 = '2026-10-05'
const W2 = '2026-10-12'
const W3 = '2026-10-19'

function daily(id: string, extra: Partial<Task> = {}): Task {
  return {
    id,
    title: id,
    notes: '',
    priority: 'general',
    area: 'self',
    part: 'anytime',
    pauses: [],
    createdAt: 0,
    schedule: { kind: 'daily', start: W1, days: [], every: 2, end: { type: 'forever' }, skip: [] },
    ...extra,
  }
}

const rule = (extra: Partial<RewardRule> = {}): RewardRule => ({
  id: 'r1',
  name: 'Order food',
  unit: 'order',
  period: 'week',
  scope: { type: 'all' },
  tiers: [
    { min: 80, allowance: 3 },
    { min: 60, allowance: 2 },
    { min: 0, allowance: 1 },
  ],
  base: 2,
  skipsCountAsMissed: false,
  rollover: false,
  active: true,
  since: W1,
  ...extra,
})

/** Marks the first `n` days of a 7-day week done for a task, the rest left open. */
function keep(taskId: string, weekStart: string, n: number, status: Completion['status'] = 'done'): Completion[] {
  return eachDay(weekStart, weekStart.replace(/\d\d$/, (d) => String(Number(d) + 6).padStart(2, '0')))
    .slice(0, n)
    .map((date) => ({ id: occKey(taskId, date), taskId, date, status, at: 0 }))
}

describe('tierFor', () => {
  it('treats exactly 80% as reaching the 80% tier', () => {
    expect(tierFor(rule(), 4, 5)?.allowance).toBe(3)
    expect(tierFor(rule(), 79, 100)?.allowance).toBe(2)
    expect(tierFor(rule(), 0, 10)?.allowance).toBe(1)
  })
  it('gives nothing below the lowest tier when that tier is above 0%', () => {
    const r = rule({ tiers: [{ min: 80, allowance: 3 }] })
    expect(tierFor(r, 1, 10)).toBeNull()
  })
})

describe('ledger', () => {
  it('uses the base allowance first, then last week’s score', () => {
    const tasks = [daily('a')]
    // Week 1: 6 of 7 kept (86%) → week 2 earns 3. Week 2: 4 of 7 (57%) → week 3 earns 1.
    const log = indexCompletions([...keep('a', W1, 6), ...keep('a', W2, 4)])
    const l = ledger(rule(), tasks, log, [], '2026-10-21', 1)
    expect(l.map((p) => p.start)).toEqual([W1, W2, W3])
    expect(l.map((p) => p.earned)).toEqual([2, 3, 1])
    expect(l[0].fromBase).toBe(true)
  })

  it('takes redemptions off what is left', () => {
    const redemptions: Redemption[] = [
      { id: 'x', ruleId: 'r1', periodStart: W1, at: 0 },
      { id: 'y', ruleId: 'r1', periodStart: W1, at: 0 },
      { id: 'z', ruleId: 'other', periodStart: W1, at: 0 },
    ]
    const l = ledger(rule(), [daily('a')], indexCompletions([]), redemptions, '2026-10-07', 1)
    expect(l[0]).toMatchObject({ allowance: 2, used: 2, remaining: 0 })
  })

  it('carries unused allowance forward only with rollover', () => {
    const tasks = [daily('a')]
    const log = indexCompletions(keep('a', W1, 7))
    const used: Redemption[] = [{ id: 'x', ruleId: 'r1', periodStart: W1, at: 0 }]
    const off = ledger(rule(), tasks, log, used, W2, 1)
    expect(off[1]).toMatchObject({ earned: 3, carried: 0, allowance: 3 })
    const on = ledger(rule({ rollover: true }), tasks, log, used, W2, 1)
    expect(on[1]).toMatchObject({ earned: 3, carried: 1, allowance: 4 })
  })

  it('leaves skips out of the score unless they count as missed', () => {
    const tasks = [daily('a')]
    // 5 done, 2 skipped: 5/5 = 100% normally, 5/7 = 71% when skips count.
    const log = indexCompletions([...keep('a', W1, 5), ...keep('a', W1, 7, 'skipped').slice(5)])
    expect(ledger(rule(), tasks, log, [], W2, 1)[1].earned).toBe(3)
    expect(ledger(rule({ skipsCountAsMissed: true }), tasks, log, [], W2, 1)[1].earned).toBe(2)
  })

  it('only scores tasks in scope', () => {
    const tasks = [daily('a', { priority: 'high' }), daily('b')]
    const log = indexCompletions(keep('a', W1, 7))
    expect(ledger(rule(), tasks, log, [], W2, 1)[1].earned).toBe(1) // 7 of 14 = 50%
    expect(ledger(rule({ scope: { type: 'high' } }), tasks, log, [], W2, 1)[1].earned).toBe(3)
    expect(ledger(rule({ scope: { type: 'task', taskId: 'b' } }), tasks, log, [], W2, 1)[1].earned).toBe(1)
  })

  it('falls back to the base allowance when nothing was planned', () => {
    const l = ledger(rule(), [], indexCompletions([]), [], W2, 1)
    expect(l[1].earned).toBe(2)
  })
})

describe('outlook', () => {
  it('says how many more kept tasks reach the next tier', () => {
    // 18 of 32 kept so far: 56%, securing 1. 60% needs 20 (2 more). 80% needs 26.
    const o = outlook(rule(), { planned: 32, done: 18, skipped: 0 })
    expect(o.securedAllowance).toBe(1)
    expect(o.next).toEqual({ tier: { min: 60, allowance: 2 }, needed: 2 })
  })
  it('has no next tier once the top one is reached', () => {
    expect(outlook(rule(), { planned: 10, done: 9, skipped: 0 }).next).toBeNull()
  })
})

describe('wording', () => {
  it('describes tiers in plain words', () => {
    expect(describeTiers(rule())).toBe('80% or more earns 3 orders. 60% or more earns 2. Below that, 1.')
    expect(plural(1, 'order')).toBe('1 order')
    expect(plural(2, 'pastry')).toBe('2 pastries')
    expect(plural(3, 'movie night')).toBe('3 movie nights')
  })
})
