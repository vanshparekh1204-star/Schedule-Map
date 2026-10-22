import { addDays, addMonths, startOfMonth, startOfWeek } from './dates'
import { tally, type CompletionIndex, type Tally } from './recurrence'
import type { DateStr, Redemption, RewardRule, RewardTier, Task } from './types'

export function periodStartOf(date: DateStr, period: RewardRule['period'], weekStart: 0 | 1): DateStr {
  return period === 'week' ? startOfWeek(date, weekStart) : startOfMonth(date)
}

export function nextPeriodStart(start: DateStr, period: RewardRule['period']): DateStr {
  return period === 'week' ? addDays(start, 7) : addMonths(start, 1)
}

export function periodEnd(start: DateStr, period: RewardRule['period']): DateStr {
  return addDays(nextPeriodStart(start, period), -1)
}

export function tasksInScope(rule: RewardRule, tasks: Task[]): Task[] {
  const s = rule.scope
  switch (s.type) {
    case 'all':
      return tasks
    case 'high':
      return tasks.filter((t) => t.priority === 'high')
    case 'area':
      return tasks.filter((t) => t.area === s.area)
    case 'task':
      return tasks.filter((t) => t.id === s.taskId)
  }
}

export function sortedTiers(rule: RewardRule): RewardTier[] {
  return [...rule.tiers].sort((a, b) => b.min - a.min)
}

/** The best tier the score reaches. Compared in whole numbers so exactly 80% counts as 80%. */
export function tierFor(rule: RewardRule, done: number, planned: number): RewardTier | null {
  return sortedTiers(rule).find((t) => done * 100 >= t.min * planned) ?? null
}

export function earnedFrom(rule: RewardRule, score: Tally): number {
  if (score.planned === 0) return rule.base
  return tierFor(rule, score.done, score.planned)?.allowance ?? 0
}

export interface PeriodLedger {
  start: DateStr
  end: DateStr
  /** What last period's score earned for this one. */
  earned: number
  /** Unused allowance carried in from last period (rollover only). */
  carried: number
  allowance: number
  used: number
  remaining: number
  /** This period's own score, which decides next period's allowance. */
  score: Tally
  fromBase: boolean
}

/** Every period from the rule's first up to the one containing `today`, oldest first. */
export function ledger(
  rule: RewardRule,
  tasks: Task[],
  log: CompletionIndex,
  redemptions: Redemption[],
  today: DateStr,
  weekStart: 0 | 1,
): PeriodLedger[] {
  const scoped = tasksInScope(rule, tasks)
  const first = periodStartOf(rule.since, rule.period, weekStart)
  const current = periodStartOf(today, rule.period, weekStart)
  const out: PeriodLedger[] = []
  let carry = 0
  let prev: Tally | null = null

  for (let start = first; start <= current; start = nextPeriodStart(start, rule.period)) {
    const end = periodEnd(start, rule.period)
    const fromBase = prev === null || prev.planned === 0
    const earned = prev === null ? rule.base : earnedFrom(rule, prev)
    const carried = rule.rollover ? carry : 0
    const allowance = earned + carried
    const used = redemptions.filter((r) => r.ruleId === rule.id && r.periodStart === start).length
    const remaining = Math.max(0, allowance - used)
    const score = tally(scoped, log, start, end, rule.skipsCountAsMissed)
    out.push({ start, end, earned, carried, allowance, used, remaining, score, fromBase })
    carry = remaining
    prev = score
  }
  return out
}

export interface Outlook {
  /** What next period gets if nothing else is kept this period. */
  securedAllowance: number
  /** The next tier up, and how many more kept tasks reach it. */
  next: { tier: RewardTier; needed: number } | null
}

/**
 * Where this period's score stands. `planned` covers the whole period,
 * so the score only goes up as tasks are kept.
 */
export function outlook(rule: RewardRule, score: Tally): Outlook {
  const { done, planned } = score
  if (planned === 0) return { securedAllowance: rule.base, next: null }
  const securedAllowance = earnedFrom(rule, score)
  const next = sortedTiers(rule)
    .reverse()
    .filter((t) => t.allowance > securedAllowance)
    .map((tier) => ({ tier, needed: Math.ceil((tier.min * planned) / 100) - done }))
    .find((x) => x.needed > 0 && x.needed <= planned - done)
  return { securedAllowance, next: next ?? null }
}

export function plural(n: number, unit: string): string {
  if (n === 1) return `${n} ${unit}`
  if (/(s|x|ch|sh)$/.test(unit)) return `${n} ${unit}es`
  if (/[^aeiou]y$/.test(unit)) return `${n} ${unit.slice(0, -1)}ies`
  return `${n} ${unit}s`
}

/** Plain-words version of the tiers, e.g. "80% or more earns 3 orders. 60% or more earns 2. Below that, 1." */
export function describeTiers(rule: RewardRule): string {
  const tiers = sortedTiers(rule)
  const parts: string[] = []
  tiers.forEach((t, i) => {
    const amount = i === 0 ? plural(t.allowance, rule.unit) : String(t.allowance)
    parts.push(t.min === 0 ? `Below that, ${amount}.` : `${t.min}% or more earns ${amount}.`)
  })
  if (tiers.length && tiers[tiers.length - 1].min > 0) parts.push('Below that, none.')
  return parts.join(' ')
}
