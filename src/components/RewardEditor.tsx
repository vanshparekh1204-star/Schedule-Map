import { useEffect, useState } from 'react'
import { deleteReward, saveReward } from '../db/actions'
import { uid } from '../db/db'
import type { Data } from '../db/useData'
import { describeTiers } from '../lib/rewards'
import type { RewardRule, RewardScope, RewardTier } from '../lib/types'
import { useUI } from '../state/ui'
import { Button, CloseGlyph, Field, inputClass, Segmented, Sheet } from './ui'

export const EXAMPLE_REWARD: Omit<RewardRule, 'id' | 'since'> = {
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
}

export type RewardTarget = { rule?: RewardRule; draft?: Omit<RewardRule, 'id' | 'since'> } | null

export function RewardEditor({ target, onClose, data }: { target: RewardTarget; onClose: () => void; data: Data }) {
  const toast = useUI((s) => s.toast)
  const [rule, setRule] = useState<RewardRule | null>(null)
  const [tried, setTried] = useState(false)

  useEffect(() => {
    if (!target) return
    setTried(false)
    setRule(
      target.rule ?? {
        id: uid(),
        since: data.today,
        ...(target.draft ?? { ...EXAMPLE_REWARD, name: '', unit: '', tiers: [{ min: 80, allowance: 1 }] }),
      },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target])

  if (!rule) return null
  const set = <K extends keyof RewardRule>(k: K, v: RewardRule[K]) => setRule((r) => (r ? { ...r, [k]: v } : r))
  const setTier = (i: number, patch: Partial<RewardTier>) =>
    set('tiers', rule.tiers.map((t, j) => (j === i ? { ...t, ...patch } : t)))

  const recurring = data.tasks.filter((t) => t.schedule.kind !== 'once')
  const scopeType = rule.scope.type
  const nameError = !rule.name.trim() ? 'Name the reward, like “Order food” or “Movie night”.' : null
  const unitError = !rule.unit.trim() ? 'Say what one of it is called, like “order”.' : null
  const editing = Boolean(target?.rule)

  async function save() {
    setTried(true)
    if (!rule || nameError || unitError) return
    const clean: RewardRule = {
      ...rule,
      name: rule.name.trim(),
      unit: rule.unit.trim().toLowerCase(),
      tiers: rule.tiers
        .map((t) => ({ min: clamp(t.min, 0, 100), allowance: clamp(t.allowance, 0, 99) }))
        .sort((a, b) => b.min - a.min),
      base: clamp(rule.base, 0, 99),
    }
    await saveReward(clean)
    toast(editing ? `Saved ${clean.name}.` : `Created ${clean.name}.`)
    onClose()
  }

  function setScope(type: RewardScope['type']) {
    if (type === 'area') set('scope', { type, area: data.settings.areas[0]?.id ?? '' })
    else if (type === 'task') set('scope', { type, taskId: recurring[0]?.id ?? '' })
    else set('scope', { type })
  }

  return (
    <Sheet
      open={Boolean(target)}
      onOpenChange={(o) => !o && onClose()}
      title={editing ? 'Edit reward' : 'New reward'}
      description="Decide what a good stretch earns you. The score is the share of planned tasks you kept."
      wide
      footer={
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" size="lg" onClick={save}>
            {editing ? 'Save changes' : 'Create reward'}
          </Button>
          <Button variant="quiet" onClick={onClose}>
            Cancel
          </Button>
          {editing && (
            <Button
              variant="danger"
              className="ml-auto"
              onClick={async () => {
                await deleteReward(rule.id)
                toast(`Deleted ${rule.name}.`)
                onClose()
              }}
            >
              Delete
            </Button>
          )}
        </div>
      }
    >
      <form
        className="grid gap-7"
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
      >
        <div className="grid gap-5 sm:grid-cols-[1.4fr_1fr]">
          <Field label="Reward" htmlFor="rw-name">
            <input
              id="rw-name"
              autoFocus
              value={rule.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Order food"
              className={inputClass}
              aria-invalid={tried && !!nameError}
            />
            {tried && nameError && <p className="text-[13.5px] text-oxblood">{nameError}</p>}
          </Field>
          <Field label="One of it is called" htmlFor="rw-unit">
            <input
              id="rw-unit"
              value={rule.unit}
              onChange={(e) => set('unit', e.target.value)}
              placeholder="order"
              className={inputClass}
              aria-invalid={tried && !!unitError}
            />
            {tried && unitError && <p className="text-[13.5px] text-oxblood">{unitError}</p>}
          </Field>
        </div>

        <Field label="Scored over">
          <Segmented
            label="Scored over"
            value={rule.period}
            onChange={(v) => set('period', v)}
            options={[
              { value: 'week', label: 'A week' },
              { value: 'month', label: 'A month' },
            ]}
          />
          <p className="text-[13.5px] text-ink-faint">
            What you keep this {rule.period} decides what you get next {rule.period}.
          </p>
        </Field>

        <Field label="Which tasks count">
          <div className="grid gap-3">
            <Segmented
              label="Which tasks count"
              value={scopeType}
              onChange={setScope}
              options={[
                { value: 'all', label: 'All tasks' },
                { value: 'high', label: 'High priority' },
                { value: 'area', label: 'One area' },
                ...(recurring.length ? [{ value: 'task' as const, label: 'One routine' }] : []),
              ]}
            />
            {rule.scope.type === 'area' && (
              <select
                aria-label="Area"
                value={rule.scope.area}
                onChange={(e) => set('scope', { type: 'area', area: e.target.value })}
                className={`${inputClass} max-w-xs`}
              >
                {data.settings.areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            )}
            {rule.scope.type === 'task' && (
              <select
                aria-label="Routine"
                value={rule.scope.taskId}
                onChange={(e) => set('scope', { type: 'task', taskId: e.target.value })}
                className={`${inputClass} max-w-xs`}
              >
                {recurring.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            )}
          </div>
        </Field>

        <fieldset className="grid gap-3">
          <legend className="mb-2 text-[14px] font-semibold">What each score earns</legend>
          {rule.tiers.map((t, i) => (
            <div key={i} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-surface px-4 py-3 text-[15px] ring-1 ring-line">
              <span>Keep at least</span>
              <input
                type="number"
                min={0}
                max={100}
                aria-label={`Tier ${i + 1} minimum percent`}
                value={t.min}
                onChange={(e) => setTier(i, { min: Number(e.target.value) })}
                className={`${inputClass} w-20 text-center`}
              />
              <span>%, earn</span>
              <input
                type="number"
                min={0}
                max={99}
                aria-label={`Tier ${i + 1} allowance`}
                value={t.allowance}
                onChange={(e) => setTier(i, { allowance: Number(e.target.value) })}
                className={`${inputClass} w-20 text-center`}
              />
              <span>next {rule.period}</span>
              {rule.tiers.length > 1 && (
                <button
                  type="button"
                  aria-label={`Remove tier ${i + 1}`}
                  onClick={() => set('tiers', rule.tiers.filter((_, j) => j !== i))}
                  className="press ml-auto grid size-8 place-items-center rounded-full text-ink-faint hover:bg-surface-2 hover:text-ink"
                >
                  <CloseGlyph />
                </button>
              )}
            </div>
          ))}
          <div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => set('tiers', [...rule.tiers, { min: Math.max(0, Math.min(...rule.tiers.map((t) => t.min)) - 20), allowance: 0 }])}
            >
              Add a level
            </Button>
          </div>
        </fieldset>

        <Field label={`For the first ${rule.period}`} htmlFor="rw-base" hint="before there’s a score">
          <div className="flex items-center gap-3 text-[15px]">
            <input
              id="rw-base"
              type="number"
              min={0}
              max={99}
              value={rule.base}
              onChange={(e) => set('base', Number(e.target.value))}
              className={`${inputClass} w-20 text-center`}
            />
            <span>to start with</span>
          </div>
        </Field>

        <div className="grid gap-3">
          <Toggle
            checked={rule.skipsCountAsMissed}
            onChange={(v) => set('skipsCountAsMissed', v)}
            label="Skipped tasks count as missed"
            hint="Off: skipping a day removes it from the score, so rest days don’t hurt."
          />
          <Toggle
            checked={rule.rollover}
            onChange={(v) => set('rollover', v)}
            label="Unused ones carry over"
            hint={`Off: anything you don’t use expires at the end of the ${rule.period}.`}
          />
          <Toggle checked={rule.active} onChange={(v) => set('active', v)} label="Show on Today" hint="Turn off to hide it without deleting its history." />
        </div>

        <section aria-label="Summary" className="rounded-2xl bg-enamel px-5 py-4 text-enamel-ink">
          <p className="font-display text-[19px]">{rule.name.trim() || 'This reward'}</p>
          <p className="mt-1 text-[14px] text-enamel-ink-soft">{rule.unit.trim() ? describeTiers(rule) : 'Add what one of it is called to see the summary.'}</p>
        </section>
        <button type="submit" className="hidden" />
      </form>
    </Sheet>
  )
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, Math.round(Number.isFinite(n) ? n : lo)))
}

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-2xl px-1 py-1">
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="h-6 w-10 rounded-full bg-line-strong peer-checked:bg-enamel peer-focus-visible:ring-2 peer-focus-visible:ring-steel peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-bg" />
        <span
          className="absolute top-1 left-1 size-4 rounded-full bg-surface-2 shadow-sm peer-checked:translate-x-4"
          style={{ transition: 'transform 260ms var(--ease-spring)' }}
        />
      </span>
      <span>
        <span className="block text-[15px] font-medium">{label}</span>
        <span className="block text-[13.5px] text-ink-faint">{hint}</span>
      </span>
    </label>
  )
}
