import { Link } from 'react-router'
import type { Data } from '../db/useData'
import type { RewardRule } from '../lib/types'
import { Coin } from './Coins'
import { useRewardState } from './rewardState'

/** One-line reward status shown under the dial. */
export function RewardLine({ rule, data }: { rule: RewardRule; data: Data }) {
  const { current, outlookText, periodWord } = useRewardState(rule, data)
  return (
    <Link
      to="/rewards"
      className="press group flex items-center gap-4 rounded-2xl bg-surface px-4 py-3 ring-1 ring-line hover:bg-surface-2 hover:shadow-[var(--shadow-raised)]"
    >
      <Coin size={38} className="shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline justify-between gap-x-3">
          <span className="font-semibold">{rule.name}</span>
          <span className="text-[14px] text-ink-soft tabular-nums">
            {current.remaining} of {current.allowance} left this {periodWord}
          </span>
        </span>
        <span className="block text-[13.5px] text-ink-faint">{outlookText}</span>
      </span>
    </Link>
  )
}
