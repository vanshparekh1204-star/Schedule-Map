import { useCallback, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router'
import { DayAgenda } from '../components/DayAgenda'
import { DayDial } from '../components/DayDial'
import { RewardLine } from '../components/RewardLine'
import { useArrowKeys } from '../components/Shortcuts'
import { moveOnceTo, toggleDone } from '../components/taskActions'
import { Button, ChevronGlyph, Flourish } from '../components/ui'
import { useNowMinute, type Data } from '../db/useData'
import { addDays, diffDays } from '../lib/dates'
import { fmtFullDate, fmtRelative, fmtShort, fmtWeekday } from '../lib/format'
import { occKey, occurrencesOn } from '../lib/recurrence'
import type { PartOfDay, Task } from '../lib/types'
import { useUI } from '../state/ui'

export function TodayPage({ data }: { data: Data }) {
  const [params, setParams] = useSearchParams()
  const date = /^\d{4}-\d{2}-\d{2}$/.test(params.get('d') ?? '') ? params.get('d')! : data.today
  const isToday = date === data.today
  const go = useCallback(
    (d: string) => setParams(d === data.today ? {} : { d }, { replace: true }),
    [setParams, data.today],
  )
  useArrowKeys(
    useCallback(() => go(addDays(date, -1)), [go, date]),
    useCallback(() => go(addDays(date, 1)), [go, date]),
  )

  const nowMin = useNowMinute()
  const hovered = useUI((s) => s.hovered)
  const setHovered = useUI((s) => s.setHovered)
  const openQuickAdd = useUI((s) => s.openQuickAdd)

  const occurrences = useMemo(
    () => occurrencesOn(data.tasks, date, data.log, data.overrides),
    [data.tasks, date, data.log, data.overrides],
  )

  // One-off tasks from the last two weeks that never got done.
  const leftovers = useMemo(() => {
    if (!isToday) return []
    const from = addDays(data.today, -14)
    return data.tasks.filter((t) => {
      const s = t.schedule
      return s.kind === 'once' && s.start < data.today && s.start >= from && !data.log.has(occKey(t.id, s.start))
    })
  }, [isToday, data.tasks, data.today, data.log])

  const activeRewards = data.rewards.filter((r) => r.active)
  const rel = diffDays(data.today, date)
  const relLabel =
    rel === 0 ? 'Today' : rel === 1 ? 'Tomorrow' : rel === -1 ? 'Yesterday' : rel > 0 ? `In ${rel} days` : `${-rel} days ago`

  return (
    <div className="mx-auto max-w-[1360px] px-4 pt-4 pb-10 sm:px-8 lg:px-12 lg:pt-10">
      <header className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
        <div>
          <p className="text-[15px] font-medium text-ink-soft">
            {relLabel}
            <span className="text-ink-faint">, {fmtFullDate(date)}</span>
          </p>
          <h1 className="font-display text-[clamp(52px,9vw,112px)] leading-[0.92] tracking-[-0.035em]">{fmtWeekday(date)}</h1>
        </div>
        <nav aria-label="Change day" className="flex items-center gap-1.5 pb-2">
          <Button variant="outline" size="sm" className="w-9 px-0" aria-label="Previous day" onClick={() => go(addDays(date, -1))}>
            <ChevronGlyph dir="left" />
          </Button>
          <Button variant={isToday ? 'outline' : 'primary'} size="sm" disabled={isToday} onClick={() => go(data.today)}>
            Back to today
          </Button>
          <Button variant="outline" size="sm" className="w-9 px-0" aria-label="Next day" onClick={() => go(addDays(date, 1))}>
            <ChevronGlyph dir="right" />
          </Button>
        </nav>
      </header>

      <div className="mt-6 grid gap-10 lg:mt-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-14 xl:grid-cols-[minmax(0,560px)_minmax(0,1fr)]">
        <div className="lg:sticky lg:top-8 lg:self-start">
          <div className="mx-auto max-w-[min(560px,100%)] sm:max-w-[480px] lg:max-w-none">
            <DayDial
              occurrences={occurrences}
              nowMin={isToday ? nowMin : null}
              heading={isToday ? 'Today' : fmtShort(date)}
              hovered={hovered}
              onHover={setHovered}
              onToggle={toggleDone}
            />
          </div>
          {activeRewards.length > 0 && (
            <div className="mt-8 grid gap-2">
              {activeRewards.map((r) => (
                <RewardLine key={r.id} rule={r} data={data} />
              ))}
            </div>
          )}
        </div>

        <div className="min-w-0">
          {leftovers.length > 0 && <Leftovers tasks={leftovers} data={data} />}

          {occurrences.length > 0 ? (
            <DayAgenda occurrences={occurrences} data={data} />
          ) : data.tasks.length === 0 ? (
            <FirstRun date={date} />
          ) : (
            <div className="rounded-[28px] border border-dashed border-line-strong px-6 py-12 text-center sm:px-10">
              <p className="font-display text-[30px] leading-tight tracking-[-0.02em]">Nothing planned. A rare, quiet day.</p>
              <p className="mx-auto mt-2 max-w-sm text-[15px] text-ink-soft">
                Keep it that way, or add something for {isToday ? 'today' : fmtShort(date)}.
              </p>
              <Button variant="primary" className="mt-6" onClick={() => openQuickAdd(date)}>
                Add a task for {isToday ? 'today' : fmtShort(date)}
              </Button>
            </div>
          )}

          {occurrences.length > 0 && (
            <div className="mt-10 flex flex-wrap items-center gap-4 px-3 sm:px-4">
              <Button variant="outline" onClick={() => openQuickAdd(date)}>
                Add a task {isToday ? '' : `for ${fmtShort(date)}`}
              </Button>
              <Link to="/calendar" className="text-[14.5px] text-ink-soft underline-offset-4 hover:text-ink hover:underline">
                See the whole month
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Leftovers({ tasks, data }: { tasks: Task[]; data: Data }) {
  return (
    <section aria-labelledby="leftovers" className="mb-10 rounded-[24px] bg-surface px-5 py-5 ring-1 ring-line sm:px-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="leftovers" className="font-display text-[22px] tracking-[-0.01em]">
          Left over from earlier
        </h2>
        {tasks.length > 1 && (
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              for (const t of tasks) await moveOnceTo(t, data.today, data.today)
            }}
          >
            Move all {tasks.length} to today
          </Button>
        )}
      </div>
      <ul className="mt-3 grid gap-1">
        {tasks.map((t) => (
          <li key={t.id} className="flex items-center justify-between gap-3 py-1.5">
            <span className="min-w-0">
              <span className="font-medium">{t.title}</span>
              <span className="ml-2 text-[13.5px] text-ink-faint">was {fmtRelative(t.schedule.start, data.today).toLowerCase()}</span>
            </span>
            <Button size="sm" variant="quiet" onClick={() => moveOnceTo(t, data.today, data.today)}>
              Move to today
            </Button>
          </li>
        ))}
      </ul>
    </section>
  )
}

const STARTERS: { title: string; part: PartOfDay; area: string }[] = [
  { title: 'Morning prayer', part: 'morning', area: 'faith' },
  { title: 'Brush teeth', part: 'morning', area: 'self-care' },
  { title: 'Skincare', part: 'night', area: 'self-care' },
  { title: 'Drink 8 glasses of water', part: 'anytime', area: 'health' },
  { title: 'Read 20 pages', part: 'evening', area: 'self-care' },
  { title: 'Evening walk', part: 'evening', area: 'health' },
]

function FirstRun({ date }: { date: string }) {
  const openComposer = useUI((s) => s.openComposer)
  const openQuickAdd = useUI((s) => s.openQuickAdd)
  return (
    <section aria-labelledby="first-run" className="rounded-[28px] bg-surface px-6 py-8 ring-1 ring-line sm:px-10 sm:py-10">
      <Flourish className="mb-5" />
      <h2 id="first-run" className="font-display text-[34px] leading-[1.05] tracking-[-0.025em] sm:text-[40px]">
        Start with what you do every day.
      </h2>
      <p className="mt-3 max-w-[52ch] text-[15.5px] leading-relaxed text-ink-soft">
        Set a routine up once and it appears on its days by itself. Every day, only some weekdays, for a month, until a
        date. Pick one to start, then change anything you like.
      </p>
      <ul className="mt-6 flex flex-wrap gap-2">
        {STARTERS.map((s) => (
          <li key={s.title}>
            <button
              type="button"
              onClick={() =>
                openComposer({
                  mode: 'new',
                  date,
                  draft: {
                    title: s.title,
                    part: s.part,
                    area: s.area,
                    schedule: { kind: 'daily', start: date, days: [], every: 2, end: { type: 'forever' }, skip: [] },
                  },
                })
              }
              className="press rounded-full border border-line-strong bg-surface-2 px-4 py-2 text-[14.5px] hover:border-ink-faint"
            >
              {s.title}
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Button variant="primary" onClick={() => openQuickAdd(date)}>
          Type your own
        </Button>
        <span className="text-[14px] text-ink-faint">
          Or press <kbd className="font-sans font-semibold text-ink-soft">N</kbd> any time.
        </span>
      </div>
    </section>
  )
}
