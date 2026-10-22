import { useMemo } from 'react'
import type { Data } from '../db/useData'
import { ledger, outlook, plural } from '../lib/rewards'
import type { RewardRule } from '../lib/types'

export function useRewardState(rule: RewardRule, data: Data) {
  return useMemo(() => {
    const periods = ledger(rule, data.tasks, data.log, data.redemptions, data.today, data.settings.weekStart)
    const current = periods[periods.length - 1]
    const look = outlook(rule, current.score)
    const periodWord = rule.period === 'week' ? 'week' : 'month'
    const nextLabel = `next ${periodWord}`

    let outlookText: string
    if (current.score.planned === 0) outlookText = `Nothing in scope is planned this ${periodWord} yet.`
    else if (look.next)
      outlookText = `${look.next.needed} more kept ${look.next.needed === 1 ? 'task earns' : 'tasks earn'} ${plural(look.next.tier.allowance, rule.unit)} ${nextLabel}.`
    else outlookText = `On track for ${plural(look.securedAllowance, rule.unit)} ${nextLabel}.`

    const redemptions = data.redemptions
      .filter((r) => r.ruleId === rule.id && r.periodStart === current.start)
      .sort((a, b) => b.at - a.at)

    return { periods, current, outlook: look, outlookText, periodWord, redemptions }
  }, [rule, data.tasks, data.log, data.redemptions, data.today, data.settings.weekStart])
}
