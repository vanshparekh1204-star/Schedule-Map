import { useState } from 'react'
import { CoinStack } from '../components/Coins'
import { EXAMPLE_REWARD, RewardEditor, type RewardTarget } from '../components/RewardEditor'
import { useRewardState } from '../components/rewardState'
import { Button, Flourish } from '../components/ui'
import { redeem, unredeem } from '../db/actions'
import type { Data } from '../db/useData'
import { fromLocalDate } from '../lib/dates'
import { fmtDayMonth, fmtShort, fmtTime } from '../lib/format'
import { describeTiers, plural, sortedTiers } from '../lib/rewards'
import type { RewardRule } from '../lib/types'
import { useUI } from '../state/ui'

export function RewardsPage({ data }: { data: Data }) {
  const [target, setTarget] = useState<RewardTarget>(null)

  return (
    <div className="mx-auto max-w-[1180px] px-4 pt-4 pb-16 sm:px-8 lg:px-12 lg:pt-10">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-[40ch]">
          <h1 className="font-display text-[clamp(48px,7vw,88px)] leading-[0.95] tracking-[-0.035em]">Rewards</h1>
          <p className="mt-3 text-[16px] leading-relaxed text-ink-soft">
            Deals you make with yourself. Keep enough of this week, and next week you’ve earned something.
          </p>
        </div>
        {data.rewards.length > 0 && (
          <Button variant="primary" onClick={() => setTarget({})}>
            Create a reward
          </Button>
        )}
      </header>

      {data.rewards.length === 0 ? (
        <EmptyRewards onExample={() => setTarget({ draft: EXAMPLE_REWARD })} onBlank={() => setTarget({})} />
      ) : (
        <div className="mt-12 grid gap-16">
          {data.rewards.map((r) => (
            <RewardSection key={r.id} rule={r} data={data} onEdit={() => setTarget({ rule: r })} />
          ))}
        </div>
      )}

      <RewardEditor target={target} onClose={() => setTarget(null)} data={data} />
    </div>
  )
}

function scopeText(rule: RewardRule, data: Data) {
  const s = rule.scope
  if (s.type === 'all') return 'Counts every task'
  if (s.type === 'high') return 'Counts high-priority tasks'
  if (s.type === 'area') return `Counts ${data.settings.areas.find((a) => a.id === s.area)?.name ?? 'one area'} tasks`
  return `Counts ${data.tasks.find((t) => t.id === s.taskId)?.title ?? 'one routine'}`
}

function RewardSection({ rule, data, onEdit }: { rule: RewardRule; data: Data; onEdit: () => void }) {
  const { periods, current, outlookText, periodWord, redemptions } = useRewardState(rule, data)
  const toast = useUI((s) => s.toast)
  const { done, planned } = current.score
  const pct = planned ? Math.round((done / planned) * 100) : 0
  const history = periods.slice(0, -1).reverse()

  async function use() {
    const r = await redeem(rule.id, current.start)
    toast(`Used 1 ${rule.unit}. Enjoy it.`, { label: 'Undo', run: () => unredeem(r.id) })
  }

  return (
    <section aria-labelledby={`rw-${rule.id}`} className="grid gap-x-14 gap-y-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <div>
        <h2 id={`rw-${rule.id}`} className="font-display text-[clamp(34px,4.5vw,52px)] leading-[1] tracking-[-0.03em]">
          {rule.name}
        </h2>
        <p className="mt-4 max-w-[46ch] text-[15.5px] leading-relaxed">{describeTiers(rule)}</p>
        <p className="mt-2 text-[14px] text-ink-faint">
          {scopeText(rule, data)}. Skips {rule.skipsCountAsMissed ? 'count as missed' : 'don’t count against you'}.{' '}
          {rule.rollover ? 'Unused ones carry over.' : `Unused ones expire each ${periodWord}.`}
          {!rule.active && ' Hidden from Today.'}
        </p>
        <Button variant="outline" size="sm" className="mt-5" onClick={onEdit}>
          Edit reward
        </Button>
      </div>

      {/* On phones this comes after this week's status; on wide screens it sits under the rule. */}
      {history.length > 0 && (
        <div className="order-last lg:order-none lg:col-start-1 lg:row-start-2">
          <div className="max-w-[440px]">
            <h3 className="font-display text-[22px] tracking-[-0.01em]">Past {periodWord}s</h3>
            <table className="mt-3 w-full text-left text-[14px] tabular-nums">
              <thead className="text-ink-faint">
                <tr>
                  <th className="py-2 pr-3 font-medium">{periodWord === 'week' ? 'Week of' : 'Month of'}</th>
                  <th className="px-3 py-2 font-medium">Kept</th>
                  <th className="px-3 py-2 text-right font-medium">Had</th>
                  <th className="py-2 pl-3 text-right font-medium">Used</th>
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 8).map((p) => (
                  <tr key={p.start} className="border-t border-line">
                    <td className="py-2 pr-3">{fmtDayMonth(p.start)}</td>
                    <td className="px-3 py-2">
                      {p.score.planned ? `${Math.round((p.score.done / p.score.planned) * 100)}%` : 'Nothing planned'}
                    </td>
                    <td className="px-3 py-2 text-right">{p.allowance}</td>
                    <td className="py-2 pl-3 text-right">{p.used}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid content-start gap-5 lg:col-start-2 lg:row-span-2 lg:row-start-1">
        {/* This period's allowance */}
        <div className="rounded-[28px] bg-surface p-6 ring-1 ring-line sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div>
              <p className="text-[14px] font-semibold text-ink-soft">
                This {periodWord}, {fmtDayMonth(current.start)} to {fmtDayMonth(current.end)}
              </p>
              <p className="mt-1 font-display text-[30px] leading-tight tracking-[-0.02em]">
                {current.remaining} of {plural(current.allowance, rule.unit)} left
              </p>
              <p className="text-[13.5px] text-ink-faint">
                {current.fromBase
                  ? `Your starting amount for the first ${periodWord}.`
                  : `Earned by last ${periodWord}’s score${current.carried ? `, plus ${current.carried} carried over` : ''}.`}
              </p>
            </div>
            <CoinStack available={current.remaining} spent={current.used} />
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button variant="gold" disabled={current.remaining === 0} onClick={use}>
              Use 1 {rule.unit}
            </Button>
            {current.remaining === 0 && current.allowance > 0 && (
              <span className="text-[14px] text-ink-faint">All used this {periodWord}.</span>
            )}
          </div>
          {redemptions.length > 0 && (
            <ul className="mt-5 grid gap-1 border-t border-line pt-4 text-[14px]">
              {redemptions.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3">
                  <span className="text-ink-soft">
                    Used {fmtShort(fromLocalDate(new Date(r.at)))} at {fmtTime(localTime(r.at))}
                  </span>
                  <button
                    type="button"
                    onClick={() => unredeem(r.id)}
                    className="press rounded-full px-3 py-1 text-ink-soft hover:bg-surface-2 hover:text-ink"
                  >
                    Give back
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* What this period's score is earning for the next one */}
        <div className="rounded-[28px] bg-enamel p-6 text-enamel-ink shadow-[var(--shadow-raised)] sm:p-7">
          <p className="text-[14px] font-semibold text-enamel-ink-soft">Earning for next {periodWord}</p>
          <p className="mt-1 font-display text-[26px] leading-tight tracking-[-0.02em]">{outlookText}</p>
          <ScoreMeter rule={rule} pct={pct} />
          <p className="mt-3 text-[14px] text-enamel-ink-soft tabular-nums">
            Kept {done} of {planned} planned this {periodWord} so far ({pct}%).
          </p>
        </div>

      </div>
    </section>
  )
}

function localTime(ms: number) {
  const d = new Date(ms)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** A track with the tier levels marked; the gold fill grows (by scale) as tasks are kept. */
function ScoreMeter({ rule, pct }: { rule: RewardRule; pct: number }) {
  const tiers = sortedTiers(rule).filter((t) => t.min > 0)
  return (
    <div className="relative mt-10 mb-1" role="img" aria-label={`${pct}% kept so far`}>
      {tiers.map((t) => (
        <div key={t.min} className="absolute -top-7 -translate-x-1/2 text-center" style={{ left: `${t.min}%` }}>
          <span className={`text-[12.5px] whitespace-nowrap ${pct >= t.min ? 'text-gold-bright' : 'text-enamel-ink-soft'}`}>
            {t.allowance} at {t.min}%
          </span>
        </div>
      ))}
      <div className="relative h-3 overflow-hidden rounded-full bg-enamel-ink/12">
        <div
          className="absolute inset-0 origin-left rounded-full bg-gradient-to-r from-gold to-gold-bright"
          style={{ transform: `scaleX(${Math.min(100, pct) / 100})`, transition: 'transform 700ms var(--ease-calm)' }}
        />
      </div>
      {tiers.map((t) => (
        <span
          key={t.min}
          aria-hidden="true"
          className="absolute -top-1.5 h-6 w-[2px] -translate-x-1/2 rounded-full bg-enamel-ink/60"
          style={{ left: `${t.min}%` }}
        />
      ))}
    </div>
  )
}

function EmptyRewards({ onExample, onBlank }: { onExample: () => void; onBlank: () => void }) {
  return (
    <div className="mt-12 grid items-center gap-10 lg:grid-cols-[1fr_1fr]">
      <div>
        <Flourish className="mb-6" />
        <h2 className="font-display text-[clamp(32px,4vw,44px)] leading-[1.05] tracking-[-0.025em]">Make a deal with yourself.</h2>
        <p className="mt-4 max-w-[48ch] text-[16px] leading-relaxed text-ink-soft">
          Pick something you enjoy and decide what a good week earns. Each week the app scores how much of your plan you kept,
          and next week’s allowance follows from it.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button variant="primary" onClick={onExample}>
            Start from the example
          </Button>
          <Button variant="outline" onClick={onBlank}>
            Start from scratch
          </Button>
        </div>
      </div>
      <figure className="rounded-[28px] bg-enamel p-7 text-enamel-ink shadow-[var(--shadow-float)] sm:p-9">
        <figcaption className="text-[14px] font-semibold text-enamel-ink-soft">Example</figcaption>
        <p className="mt-2 font-display text-[34px] leading-none tracking-[-0.02em]">Order food</p>
        <ul className="mt-6 grid gap-3 text-[15.5px]">
          <li className="flex items-baseline justify-between gap-4 border-b border-enamel-ink/15 pb-3">
            <span>Keep 80% or more of the week</span>
            <span className="font-display text-[22px] text-gold-bright">3 orders</span>
          </li>
          <li className="flex items-baseline justify-between gap-4 border-b border-enamel-ink/15 pb-3">
            <span>Keep 60% to 79%</span>
            <span className="font-display text-[22px]">2 orders</span>
          </li>
          <li className="flex items-baseline justify-between gap-4">
            <span>Below that</span>
            <span className="font-display text-[22px]">1 order</span>
          </li>
        </ul>
      </figure>
    </div>
  )
}
