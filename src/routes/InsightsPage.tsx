import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Button } from '../components/ui'
import type { Data } from '../db/useData'
import { addDays, eachDay, startOfMonth, startOfWeek } from '../lib/dates'
import { fmtDayMonth, fmtMonth, fmtShort, orderedWeekdays, WEEKDAY_LONG, WEEKDAY_SHORT } from '../lib/format'
import { byArea, byWeekday, dailyTotals, lastWeeks, pct, sumRange, topStreaks, type DayTotal } from '../lib/stats'
import { useUI } from '../state/ui'

export function InsightsPage({ data }: { data: Data }) {
  const { today, settings } = data
  const weekStart = settings.weekStart
  const openQuickAdd = useUI((s) => s.openQuickAdd)

  const yearFrom = startOfWeek(addDays(today, -364), weekStart)
  const totals = useMemo(() => dailyTotals(data.tasks, data.log, yearFrom, today), [data.tasks, data.log, yearFrom, today])

  const thisWeekFrom = startOfWeek(today, weekStart)
  const week = sumRange(totals, thisWeekFrom, today)
  const last30 = sumRange(totals, addDays(today, -29), today)
  const fullDays = eachDay(startOfMonth(today), today).filter((d) => {
    const t = totals.get(d)
    return t && t.planned > 0 && t.done === t.planned
  }).length

  const weeks = lastWeeks(thisWeekFrom, 12)
  const weekly = weeks.map((w) => ({ start: w, ...sumRange(totals, w, w === thisWeekFrom ? today : addDays(w, 6)) }))
  const wd = byWeekday(totals, addDays(today, -83), addDays(today, -1))
  const areas = useMemo(() => byArea(data.tasks, data.log, addDays(today, -29), today), [data.tasks, data.log, today])
  const streakList = useMemo(() => topStreaks(data.tasks, data.log, today, 6), [data.tasks, data.log, today])

  if (data.tasks.length === 0) {
    return (
      <div className="mx-auto max-w-[1180px] px-4 pt-4 pb-16 sm:px-8 lg:px-12 lg:pt-10">
        <h1 className="font-display text-[clamp(48px,7vw,88px)] leading-[0.95] tracking-[-0.035em]">Insights</h1>
        <p className="mt-4 max-w-[46ch] text-[16px] text-ink-soft">
          Patterns show up here once you’ve planned and kept a few days: your best weekdays, your longest streaks, and how the
          year fills in.
        </p>
        <Button variant="primary" className="mt-8" onClick={() => openQuickAdd()}>
          Add your first task
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1180px] px-4 pt-4 pb-16 sm:px-8 lg:px-12 lg:pt-10">
      <h1 className="font-display text-[clamp(48px,7vw,88px)] leading-[0.95] tracking-[-0.035em]">Insights</h1>

      <dl className="mt-10 grid grid-cols-2 gap-x-8 gap-y-8 border-y border-line py-8 md:grid-cols-3">
        <Stat label="Kept this week" value={pct(week)} unit="%" note={`${week.done} of ${week.planned} so far`} />
        <Stat label="Last 30 days" value={pct(last30)} unit="%" note={`${last30.done} of ${last30.planned} kept`} />
        <Stat label={`Full days in ${fmtMonth(today)}`} value={fullDays} note="every planned task kept" />
      </dl>

      <Section title="The year so far" note="One dot per day. The deeper the gold, the more of that day you kept.">
        <YearDots totals={totals} from={yearFrom} today={today} weekStart={weekStart} />
      </Section>

      <div className="grid gap-x-14 lg:grid-cols-2">
        <Section title="By weekday" note="Share kept over the last 12 weeks.">
          <Bars
            items={orderedWeekdays(weekStart).map((d) => ({
              key: String(d),
              label: WEEKDAY_SHORT[d],
              fullLabel: WEEKDAY_LONG[d],
              total: wd[d],
            }))}
            labelExtremes
          />
        </Section>
        <Section title="Week by week" note="Share kept each week, this week so far on the right.">
          <Bars
            items={weekly.map((w, i) => ({
              key: w.start,
              // Month where it changes, otherwise just the day the week starts
              label:
                i === 0 || w.start.slice(5, 7) !== weekly[i - 1].start.slice(5, 7)
                  ? fmtDayMonth(w.start)
                  : String(Number(w.start.slice(8))),
              fullLabel: `Week of ${fmtDayMonth(w.start)}`,
              total: w,
            }))}
            labelLast
          />
        </Section>
      </div>

      <div className="grid gap-x-14 lg:grid-cols-2">
        <Section title="By area" note="Share kept over the last 30 days.">
          <AreaBars data={data} areas={areas} />
        </Section>
        <Section title="Longest running" note="Current streaks of scheduled days kept in a row.">
          {streakList.length ? (
            <ol className="divide-y divide-line border-y border-line">
              {streakList.map((s) => (
                <li key={s.task.id} className="flex items-baseline justify-between gap-4 py-3">
                  <span className="min-w-0 truncate font-medium">{s.task.title}</span>
                  <span className="shrink-0 text-right">
                    <span className="font-display text-[26px] leading-none tabular-nums">{s.current}</span>
                    <span className="ml-2 text-[13px] text-ink-faint">best {s.best}</span>
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-[15px] text-ink-soft">
              Streaks start once a routine is kept on its days. <Link to="/routines" className="underline underline-offset-4 hover:text-ink">See routines</Link>
            </p>
          )}
        </Section>
      </div>
    </div>
  )
}

function Stat({ label, value, unit, note }: { label: string; value: number | null; unit?: string; note: string }) {
  return (
    <div>
      <dt className="text-[14px] font-semibold text-ink-soft">{label}</dt>
      <dd className="mt-1">
        <span className="font-display text-[clamp(44px,6vw,64px)] leading-none tracking-[-0.03em] tabular-nums">
          {value ?? 'None'}
          {value !== null && unit && <span className="text-[0.5em] text-ink-soft">{unit}</span>}
        </span>
        <span className="mt-1 block text-[13.5px] text-ink-faint">{note}</span>
      </dd>
    </div>
  )
}

function Section({ title, note, children }: { title: string; note: string; children: ReactNode }) {
  return (
    <section className="mt-14 min-w-0">
      <h2 className="font-display text-[28px] leading-tight tracking-[-0.02em]">{title}</h2>
      <p className="mt-1 mb-6 text-[14px] text-ink-faint">{note}</p>
      {children}
    </section>
  )
}

/* ---------------------------------------------------------------- tooltip */

interface Tip {
  x: number
  y: number
  text: string
}

function useTip() {
  const ref = useRef<HTMLDivElement>(null)
  const [tip, setTip] = useState<Tip | null>(null)
  const show = (el: Element, text: string) => {
    const box = ref.current?.getBoundingClientRect()
    const r = el.getBoundingClientRect()
    if (!box) return
    setTip({ x: r.left + r.width / 2 - box.left + (ref.current?.scrollLeft ?? 0), y: r.top - box.top, text })
  }
  const node = tip && (
    <div
      role="status"
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg bg-enamel px-2.5 py-1.5 text-[13px] whitespace-nowrap text-enamel-ink shadow-[var(--shadow-float)]"
      style={{ left: tip.x, top: tip.y - 8 }}
    >
      {tip.text}
    </div>
  )
  return { ref, show, hide: () => setTip(null), node }
}

/* ---------------------------------------------------------------- year */

function bucket(t: DayTotal | undefined): string {
  if (!t || t.planned === 0) return 'none'
  const s = t.done / t.planned
  if (s === 0) return 'zero'
  if (s < 0.34) return '1'
  if (s < 0.67) return '2'
  if (s < 1) return '3'
  return '4'
}

const BUCKET_FILL: Record<string, string> = {
  none: 'transparent',
  zero: 'color-mix(in oklab, var(--ink) 13%, transparent)',
  '1': 'var(--seq-1)',
  '2': 'var(--seq-2)',
  '3': 'var(--seq-3)',
  '4': 'var(--seq-4)',
}

function YearDots({ totals, from, today, weekStart }: { totals: Map<string, DayTotal>; from: string; today: string; weekStart: 0 | 1 }) {
  const { ref, show, hide, node } = useTip()
  const scroller = useRef<HTMLDivElement>(null)
  const days = eachDay(from, addDays(startOfWeek(today, weekStart), 6))
  const cols = Math.ceil(days.length / 7)
  const cell = 13
  const gap = 4
  const w = cols * (cell + gap)
  const h = 7 * (cell + gap) + 20

  useEffect(() => {
    scroller.current?.scrollTo({ left: scroller.current.scrollWidth })
  }, [])

  const monthLabels: { x: number; text: string }[] = []
  for (let c = 0; c < cols; c++) {
    const d = days[c * 7]
    if (c === 0 || d.slice(5, 7) !== days[(c - 1) * 7].slice(5, 7)) {
      if (c < cols - 1) monthLabels.push({ x: c * (cell + gap), text: fmtMonth(d).slice(0, 3) })
    }
  }

  return (
    <div>
      <div ref={scroller} className="scroll-quiet overflow-x-auto pb-2">
        <div ref={ref} className="relative pt-1" style={{ width: w }} onPointerLeave={hide}>
          <svg width={w} height={h} role="img" aria-label="Kept share per day over the last year. A table of the numbers follows.">
            {monthLabels.map((m) => (
              <text key={m.x} x={m.x} y="11" fontSize="11.5" fill="var(--ink-faint)">
                {m.text}
              </text>
            ))}
            {days.map((d, i) => {
              if (d > today) return null
              const t = totals.get(d)
              const b = bucket(t)
              const cx = Math.floor(i / 7) * (cell + gap) + cell / 2
              const cy = (i % 7) * (cell + gap) + cell / 2 + 20
              const text = t?.planned ? `${fmtShort(d)}: ${t.done} of ${t.planned} kept` : `${fmtShort(d)}: nothing planned`
              return (
                <g key={d} onPointerEnter={(e) => show(e.currentTarget, text)}>
                  <circle cx={cx} cy={cy} r={cell / 2 + 2} fill="transparent" />
                  <circle
                    cx={cx}
                    cy={cy}
                    r={cell / 2}
                    fill={BUCKET_FILL[b]}
                    stroke={b === 'none' ? 'var(--line-strong)' : d === today ? 'var(--steel)' : 'none'}
                    strokeWidth={d === today ? 2 : 1}
                  />
                </g>
              )
            })}
          </svg>
          {node}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-ink-faint">
        <span className="flex items-center gap-1.5">
          Less
          {['zero', '1', '2', '3', '4'].map((b) => (
            <svg key={b} width="13" height="13" aria-hidden="true">
              <circle cx="6.5" cy="6.5" r="6.5" fill={BUCKET_FILL[b]} />
            </svg>
          ))}
          More
        </span>
        <span className="flex items-center gap-1.5">
          <svg width="13" height="13" aria-hidden="true">
            <circle cx="6.5" cy="6.5" r="6" fill="none" stroke="var(--line-strong)" />
          </svg>
          Nothing planned
        </span>
      </div>
      <NumbersTable
        caption="Kept per day, most recent first"
        head={['Day', 'Kept', 'Planned']}
        rows={days
          .filter((d) => d <= today && totals.get(d)?.planned)
          .reverse()
          .slice(0, 60)
          .map((d) => [fmtShort(d), totals.get(d)!.done, totals.get(d)!.planned])}
      />
    </div>
  )
}

/* ---------------------------------------------------------------- bars */

interface BarItem {
  key: string
  label: string
  fullLabel: string
  total: DayTotal
}

function Bars({ items, labelExtremes, labelLast }: { items: BarItem[]; labelExtremes?: boolean; labelLast?: boolean }) {
  const { ref, show, hide, node } = useTip()
  const values = items.map((i) => pct(i.total))
  const present = values.filter((v): v is number => v !== null)
  const max = present.length ? Math.max(...present) : null
  const min = present.length ? Math.min(...present) : null
  const H = 160

  const labelled = (v: number | null, i: number) =>
    v !== null && ((labelExtremes && (v === max || v === min)) || (labelLast && i === items.length - 1))

  return (
    <div>
      <div ref={ref} className="relative" onPointerLeave={hide}>
        {/* Recessive guides at 50% and 100% */}
        <div className="pointer-events-none absolute inset-x-0 top-6 border-t border-dashed border-line" aria-hidden="true" />
        <div className="pointer-events-none absolute inset-x-0 border-t border-dashed border-line" style={{ top: 24 + H / 2 }} aria-hidden="true" />
        <span className="absolute top-1 right-0 text-[11.5px] text-ink-faint" aria-hidden="true">100%</span>
        <ul className="flex items-end gap-[2px] pt-6" style={{ height: H + 24 }} role="list">
          {items.map((it, i) => {
            const v = values[i]
            const text = v === null ? `${it.fullLabel}: nothing planned` : `${it.fullLabel}: ${v}% kept, ${it.total.done} of ${it.total.planned}`
            return (
              <li key={it.key} className="relative flex h-full min-w-0 flex-1 flex-col justify-end">
                {labelled(v, i) && (
                  <span
                    className="absolute inset-x-0 text-center text-[12.5px] font-semibold text-ink-soft tabular-nums"
                    style={{ bottom: (v! / 100) * H + 3 }}
                  >
                    {v}%
                  </span>
                )}
                <button
                  type="button"
                  aria-label={text}
                  onPointerEnter={(e) => show(e.currentTarget, text)}
                  onFocus={(e) => show(e.currentTarget, text)}
                  onBlur={hide}
                  className="group flex items-end justify-center rounded-md px-[3px] focus-visible:outline-offset-0"
                  style={{ height: H }}
                >
                  <span
                    className="block w-full max-w-[34px] rounded-t-[4px] bg-[var(--seq-3)] group-hover:bg-[var(--seq-4)]"
                    style={{ height: `${v === null ? 0 : Math.max(2, v)}%` }}
                  />
                </button>
              </li>
            )
          })}
        </ul>
        <div className="border-t border-line-strong" aria-hidden="true" />
        <ul className="flex gap-[2px] pt-2" aria-hidden="true">
          {items.map((it) => (
            <li key={it.key} className="min-w-0 flex-1 truncate text-center text-[12px] text-ink-faint">
              {it.label}
            </li>
          ))}
        </ul>
        {node}
      </div>
      <NumbersTable
        caption="The numbers"
        head={['', 'Kept', 'Planned', 'Share']}
        rows={items.map((it, i) => [it.fullLabel, it.total.done, it.total.planned, values[i] === null ? 'None planned' : `${values[i]}%`])}
      />
    </div>
  )
}

function AreaBars({ data, areas }: { data: Data; areas: Map<string, DayTotal> }) {
  const rows = data.settings.areas
    .map((a) => ({ area: a, total: areas.get(a.id) }))
    .filter((r): r is { area: (typeof r)['area']; total: DayTotal } => !!r.total && r.total.planned > 0)
    .sort((a, b) => (pct(b.total) ?? 0) - (pct(a.total) ?? 0))

  if (!rows.length) return <p className="text-[15px] text-ink-soft">Nothing planned in the last 30 days.</p>

  return (
    <ul className="grid gap-4">
      {rows.map(({ area, total }) => {
        const v = pct(total) ?? 0
        return (
          <li key={area.id}>
            <div className="mb-1.5 flex items-baseline justify-between gap-4 text-[14.5px]">
              <span className="font-medium">{area.name}</span>
              <span className="text-ink-soft tabular-nums">
                {v}% <span className="text-[13px] text-ink-faint">({total.done} of {total.planned})</span>
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-line" title={`${area.name}: ${v}% kept`}>
              <div className="h-full origin-left rounded-full bg-[var(--seq-3)]" style={{ transform: `scaleX(${v / 100})` }} />
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function NumbersTable({ caption, head, rows }: { caption: string; head: string[]; rows: (string | number)[][] }) {
  return (
    <details className="mt-4 text-[14px]">
      <summary className="inline-block cursor-pointer rounded-full px-1 text-ink-faint hover:text-ink">See the numbers</summary>
      <div className="scroll-quiet mt-2 max-h-72 overflow-y-auto">
        <table className="w-full text-left tabular-nums">
          <caption className="sr-only">{caption}</caption>
          <thead className="text-ink-faint">
            <tr>
              {head.map((h, i) => (
                <th key={i} className="px-2 py-1.5 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-line">
                {r.map((c, j) => (
                  <td key={j} className="px-2 py-1.5">
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}
