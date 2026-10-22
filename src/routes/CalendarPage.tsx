import { useCallback, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { DayAgenda } from '../components/DayAgenda'
import { useArrowKeys } from '../components/Shortcuts'
import { SubDial } from '../components/SubDial'
import { toggleDone } from '../components/taskActions'
import { Button, ChevronGlyph, cx, Segmented } from '../components/ui'
import type { Data } from '../db/useData'
import { addDays, addMonths, eachDay, endOfMonth, startOfMonth, startOfWeek, weekday } from '../lib/dates'
import { fmtDayMonth, fmtFullDate, fmtLong, fmtMonth, fmtTime, fmtWeekday, orderedWeekdays, WEEKDAY_SHORT } from '../lib/format'
import { occurrencesOn, partOfOccurrence, PART_LABEL, PART_ORDER, type Occurrence } from '../lib/recurrence'
import { useUI } from '../state/ui'

type View = 'month' | 'week'

export function CalendarPage({ data }: { data: Data }) {
  const [params, setParams] = useSearchParams()
  const [view, setView] = useState<View>('month')
  const selected = /^\d{4}-\d{2}-\d{2}$/.test(params.get('d') ?? '') ? params.get('d')! : data.today
  const select = useCallback((d: string) => setParams({ d }, { replace: true }), [setParams])
  const openQuickAdd = useUI((s) => s.openQuickAdd)
  const weekStart = data.settings.weekStart

  useArrowKeys(
    useCallback(() => select(addDays(selected, view === 'week' ? -7 : -1)), [select, selected, view]),
    useCallback(() => select(addDays(selected, view === 'week' ? 7 : 1)), [select, selected, view]),
  )

  const step = (dir: 1 | -1) =>
    select(view === 'month' ? startOfMonth(addMonths(startOfMonth(selected), dir)) : addDays(selected, 7 * dir))

  const dayOccs = useMemo(
    () => occurrencesOn(data.tasks, selected, data.log, data.overrides),
    [data.tasks, selected, data.log, data.overrides],
  )

  const weekFrom = startOfWeek(selected, weekStart)
  const title =
    view === 'month'
      ? fmtMonth(selected)
      : `${fmtDayMonth(weekFrom)} to ${fmtDayMonth(addDays(weekFrom, 6))}`

  return (
    <div className="mx-auto max-w-[1360px] px-4 pt-4 pb-16 sm:px-8 lg:px-12 lg:pt-10">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-[15px] font-medium text-ink-soft">{selected.slice(0, 4)}</p>
          <h1 className="font-display text-[clamp(44px,7vw,88px)] leading-[0.95] tracking-[-0.035em]">{title}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3 pb-2">
          <Segmented
            label="Calendar view"
            value={view}
            onChange={setView}
            options={[
              { value: 'month', label: 'Month' },
              { value: 'week', label: 'Week' },
            ]}
          />
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" className="w-9 px-0" aria-label={`Previous ${view}`} onClick={() => step(-1)}>
              <ChevronGlyph dir="left" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => select(data.today)}>
              Today
            </Button>
            <Button variant="outline" size="sm" className="w-9 px-0" aria-label={`Next ${view}`} onClick={() => step(1)}>
              <ChevronGlyph dir="right" />
            </Button>
          </div>
        </div>
      </header>

      {view === 'month' ? (
        <div className="mt-8 grid gap-10 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] xl:gap-14">
          <MonthGrid data={data} selected={selected} onSelect={select} />
          <section aria-labelledby="day-panel" className="min-w-0">
            <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3 px-3 sm:px-4">
              <h2 id="day-panel" className="font-display text-[30px] leading-tight tracking-[-0.02em]">
                {fmtLong(selected)}
              </h2>
              <Link
                to={selected === data.today ? '/' : `/?d=${selected}`}
                className="text-[14.5px] text-ink-soft underline-offset-4 hover:text-ink hover:underline"
              >
                Open on the dial
              </Link>
            </div>
            {dayOccs.length ? (
              <DayAgenda occurrences={dayOccs} data={data} />
            ) : (
              <p className="px-3 text-[15px] text-ink-soft sm:px-4">Nothing planned on this day.</p>
            )}
            <div className="mt-6 px-3 sm:px-4">
              <Button variant="outline" onClick={() => openQuickAdd(selected)}>
                Add a task on {fmtDayMonth(selected)}
              </Button>
            </div>
          </section>
        </div>
      ) : (
        <WeekSheet data={data} from={weekFrom} selected={selected} onSelect={select} />
      )}
    </div>
  )
}

function MonthGrid({ data, selected, onSelect }: { data: Data; selected: string; onSelect: (d: string) => void }) {
  const weekStart = data.settings.weekStart
  const month = startOfMonth(selected)
  const gridStart = startOfWeek(month, weekStart)
  const gridEnd = addDays(startOfWeek(endOfMonth(month), weekStart), 6)
  const days = eachDay(gridStart, gridEnd)

  const stats = useMemo(() => {
    const m = new Map<string, { planned: number; done: number; high: boolean }>()
    for (const d of days) {
      const occ = occurrencesOn(data.tasks, d, data.log, data.overrides).filter((o) => o.status !== 'skipped')
      m.set(d, {
        planned: occ.length,
        done: occ.filter((o) => o.status === 'done').length,
        high: occ.some((o) => o.task.priority === 'high' && o.status === 'open'),
      })
    }
    return m
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridStart, gridEnd, data.tasks, data.log, data.overrides])

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 pb-2 text-center text-[13px] font-semibold text-ink-faint">
        {orderedWeekdays(weekStart).map((d) => (
          <div key={d}>{WEEKDAY_SHORT[d]}</div>
        ))}
      </div>
      <div aria-label={fmtMonth(month)} role="group" className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const s = stats.get(d)!
          const inMonth = d.slice(0, 7) === month.slice(0, 7)
          const isSel = d === selected
          const future = d > data.today
          const label = `${fmtFullDate(d)}: ${
            s.planned ? (future ? `${s.planned} planned` : `${s.done} of ${s.planned} kept`) : 'nothing planned'
          }`
          return (
            <button
              key={d}
              type="button"
              aria-pressed={isSel}
              aria-current={d === data.today ? 'date' : undefined}
              aria-label={label}
              onClick={() => onSelect(d)}
              className={cx(
                'press relative grid aspect-square min-h-12 place-items-center rounded-2xl sm:aspect-[1/0.92]',
                isSel ? 'bg-surface-2 shadow-[var(--shadow-raised)] ring-1 ring-line-strong' : 'hover:bg-surface',
                !inMonth && 'opacity-40',
              )}
            >
              <span className="w-[min(100%,52px)]">
                <SubDial day={Number(d.slice(8))} planned={s.planned} done={s.done} future={future} today={d === data.today} size={52} />
              </span>
              {s.high && (
                <span aria-hidden="true" className="absolute top-2 right-2 size-[6px] rotate-45 bg-oxblood" />
              )}
            </button>
          )
        })}
      </div>
      <p className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-ink-faint">
        <span>Gold ring: share kept</span>
        <span>Ticks: tasks planned ahead</span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block size-[6px] rotate-45 bg-oxblood" /> High priority still open
        </span>
      </p>
    </div>
  )
}

function WeekSheet({ data, from, selected, onSelect }: { data: Data; from: string; selected: string; onSelect: (d: string) => void }) {
  const days = eachDay(from, addDays(from, 6))
  const byDay = useMemo(
    () => days.map((d) => ({ date: d, occs: occurrencesOn(data.tasks, d, data.log, data.overrides) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [from, data.tasks, data.log, data.overrides],
  )
  const parts = PART_ORDER.filter((p) => byDay.some((d) => d.occs.some((o) => partOfOccurrence(o) === p)))

  if (!parts.length) {
    return <p className="mt-10 text-[16px] text-ink-soft">Nothing planned this week.</p>
  }

  return (
    <div className="mt-8">
      {/* Wide screens: a sheet with a column per day and a row per part of the day */}
      <div className="hidden md:block">
        <div className="grid grid-cols-[96px_repeat(7,minmax(0,1fr))] gap-x-1.5">
          <div />
          {byDay.map(({ date }) => (
            <button
              key={date}
              type="button"
              onClick={() => onSelect(date)}
              className={cx(
                'press rounded-t-2xl px-2 pt-3 pb-2 text-left hover:bg-surface',
                date === selected && 'bg-surface',
              )}
            >
              <span className="block text-[13px] text-ink-faint">{WEEKDAY_SHORT[weekday(date)]}</span>
              <span className={cx('font-display text-[26px] leading-none', date === data.today && 'text-gold-text')}>
                {Number(date.slice(8))}
              </span>
            </button>
          ))}
          {parts.map((part) => (
            <WeekRow key={part} label={PART_LABEL[part]} cells={byDay.map((d) => d.occs.filter((o) => partOfOccurrence(o) === part))} selectedIndex={days.indexOf(selected)} />
          ))}
        </div>
      </div>

      {/* Phones: one block per day */}
      <div className="grid gap-6 md:hidden">
        {byDay.map(({ date, occs }) => (
          <section key={date} aria-label={fmtLong(date)}>
            <h2 className={cx('mb-2 font-display text-[22px]', date === data.today && 'text-gold-text')}>
              {fmtWeekday(date)} {Number(date.slice(8))}
            </h2>
            {occs.length ? (
              <ul className="grid gap-1.5">
                {occs.map((o) => (
                  <li key={o.key}>
                    <WeekPill o={o} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[14px] text-ink-faint">Nothing planned.</p>
            )}
          </section>
        ))}
      </div>
    </div>
  )
}

function WeekRow({ label, cells, selectedIndex }: { label: string; cells: Occurrence[][]; selectedIndex: number }) {
  return (
    <>
      <div className="border-t border-line pt-3 pr-2 font-display text-[16px] text-ink-soft">{label}</div>
      {cells.map((occs, i) => (
        <ul key={i} className={cx('grid content-start gap-1.5 border-t border-line px-1 py-2.5', i === selectedIndex && 'bg-surface')}>
          {occs.map((o) => (
            <li key={o.key}>
              <WeekPill o={o} />
            </li>
          ))}
        </ul>
      ))}
    </>
  )
}

function WeekPill({ o }: { o: Occurrence }) {
  const done = o.status === 'done'
  const skipped = o.status === 'skipped'
  return (
    <button
      type="button"
      aria-pressed={done}
      onClick={() => toggleDone(o)}
      title={done ? 'Kept. Click to undo.' : 'Click to mark kept.'}
      className={cx(
        'press flex w-full items-start gap-2 rounded-xl px-2.5 py-2 text-left text-[13.5px] leading-snug',
        done ? 'bg-gold/20 text-ink' : 'bg-surface-2 ring-1 ring-line hover:ring-line-strong',
        skipped && 'opacity-55',
      )}
    >
      <span
        aria-hidden="true"
        className={cx(
          'mt-[5px] size-[7px] shrink-0 rounded-full',
          done ? 'bg-gold' : o.task.priority === 'high' ? 'bg-oxblood' : 'ring-1 ring-ink-faint',
        )}
      />
      <span className="min-w-0">
        <span className={cx('block font-medium break-words', done && 'line-through decoration-gold')}>{o.task.title}</span>
        {o.time && <span className="block text-[12.5px] text-ink-faint">{fmtTime(o.time)}</span>}
        {skipped && <span className="block text-[12.5px] text-ink-faint">Skipped</span>}
      </span>
    </button>
  )
}
