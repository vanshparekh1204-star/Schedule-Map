import { useMemo, useState } from 'react'
import { CheckButton } from '../components/TaskRow'
import { endRoutine, pause, removeTask, resume, toggleDone } from '../components/taskActions'
import { Button, Chip, cx, DotsGlyph, inputClass, Menu, MenuItem, Segmented } from '../components/ui'
import type { Data } from '../db/useData'
import { describeSchedule, fmtRelative, fmtShort, fmtTime } from '../lib/format'
import { isPausedNow, lastDate, occKey, recentMarks, streaks, PART_LABEL, type DayMark } from '../lib/recurrence'
import type { Task } from '../lib/types'
import { useUI } from '../state/ui'

type Tab = 'routines' | 'once'
type Status = 'active' | 'paused' | 'ended'

function statusOf(t: Task, today: string): Status {
  const last = lastDate(t.schedule)
  if (last && last < today) return 'ended'
  if (isPausedNow(t)) return 'paused'
  return 'active'
}

export function RoutinesPage({ data }: { data: Data }) {
  const [tab, setTab] = useState<Tab>('routines')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<Status>('active')
  const [highOnly, setHighOnly] = useState(false)
  const [area, setArea] = useState<string | null>(null)
  const openQuickAdd = useUI((s) => s.openQuickAdd)

  const matches = (t: Task) =>
    (!query.trim() || t.title.toLowerCase().includes(query.trim().toLowerCase())) &&
    (!highOnly || t.priority === 'high') &&
    (!area || t.area === area)

  const routines = useMemo(() => data.tasks.filter((t) => t.schedule.kind !== 'once'), [data.tasks])
  const onceTasks = useMemo(() => data.tasks.filter((t) => t.schedule.kind === 'once'), [data.tasks])
  const counts = useMemo(() => {
    const c: Record<Status, number> = { active: 0, paused: 0, ended: 0 }
    routines.forEach((t) => c[statusOf(t, data.today)]++)
    return c
  }, [routines, data.today])

  const shownRoutines = routines.filter((t) => statusOf(t, data.today) === status && matches(t))
  const shownOnce = onceTasks.filter(matches)

  return (
    <div className="mx-auto max-w-[1180px] px-4 pt-4 pb-16 sm:px-8 lg:px-12 lg:pt-10">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <h1 className="font-display text-[clamp(48px,7vw,88px)] leading-[0.95] tracking-[-0.035em]">
          {tab === 'routines' ? 'Routines' : 'One-off tasks'}
        </h1>
        <Segmented
          label="Show"
          value={tab}
          onChange={setTab}
          className="mb-2"
          options={[
            { value: 'routines', label: `Routines ${routines.length}` },
            { value: 'once', label: `One-off ${onceTasks.length}` },
          ]}
        />
      </header>

      <div className="mt-8 flex flex-wrap items-center gap-2">
        <label htmlFor="r-search" className="sr-only">
          Search
        </label>
        <input
          id="r-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name"
          className={`${inputClass} mr-2 max-w-[260px] rounded-full`}
        />
        {tab === 'routines' &&
          (['active', 'paused', 'ended'] as Status[]).map((s) => (
            <Chip key={s} pressed={status === s} onClick={() => setStatus(s)}>
              {s[0].toUpperCase() + s.slice(1)} {counts[s]}
            </Chip>
          ))}
        <span className="mx-1 hidden h-6 w-px bg-line-strong sm:block" aria-hidden="true" />
        <Chip pressed={highOnly} onClick={() => setHighOnly(!highOnly)}>
          High priority
        </Chip>
        {data.settings.areas.map((a) => (
          <Chip key={a.id} pressed={area === a.id} onClick={() => setArea(area === a.id ? null : a.id)}>
            {a.name}
          </Chip>
        ))}
      </div>

      {tab === 'routines' ? (
        shownRoutines.length ? (
          <ul className="mt-8 divide-y divide-line border-y border-line">
            {shownRoutines.map((t) => (
              <RoutineRow key={t.id} task={t} data={data} />
            ))}
          </ul>
        ) : (
          <Empty
            text={
              routines.length === 0
                ? 'No routines yet. A routine is anything that repeats: daily, some weekdays, or every few days.'
                : `No ${status} routines match these filters.`
            }
            action={routines.length === 0 ? () => openQuickAdd() : undefined}
          />
        )
      ) : (
        <OnceList tasks={shownOnce} data={data} />
      )}
    </div>
  )
}

const MARK_CLASS: Record<DayMark, string> = {
  done: 'bg-gold',
  skipped: 'border border-dashed border-ink-faint',
  missed: 'bg-ink/15',
  open: 'ring-[1.5px] ring-steel ring-inset',
  none: 'bg-transparent',
}
const MARK_LABEL: Record<DayMark, string> = {
  done: 'kept',
  skipped: 'skipped',
  missed: 'missed',
  open: 'still open',
  none: 'not scheduled',
}

function RoutineRow({ task, data }: { task: Task; data: Data }) {
  const openComposer = useUI((s) => s.openComposer)
  const { current, best } = useMemo(() => streaks(task, data.log, data.today), [task, data.log, data.today])
  const marks = useMemo(() => recentMarks(task, data.log, data.today, 14), [task, data.log, data.today])
  const st = statusOf(task, data.today)
  const area = data.settings.areas.find((a) => a.id === task.area)?.name

  return (
    <li className="grid grid-cols-[1fr_auto] items-center gap-x-6 gap-y-3 py-5 md:grid-cols-[minmax(0,1fr)_auto_120px_auto]">
      <div className="min-w-0">
        <button
          type="button"
          onClick={() => openComposer({ mode: 'edit', task })}
          className="text-left font-display text-[22px] leading-tight tracking-[-0.01em] hover:underline hover:decoration-gold hover:underline-offset-4"
        >
          {task.priority === 'high' && <span aria-hidden="true" className="relative top-[-3px] mr-2 inline-block size-2 rotate-45 bg-oxblood" />}
          {task.title}
          {task.priority === 'high' && <span className="sr-only"> (high priority)</span>}
        </button>
        <p className="mt-1 flex flex-wrap gap-x-3 text-[14px] text-ink-faint">
          <span className="text-ink-soft">{describeSchedule(task.schedule, data.today, data.settings.weekStart)}</span>
          <span>{task.time ? fmtTime(task.time) : PART_LABEL[task.part]}</span>
          {area && <span>{area}</span>}
          {st === 'paused' && <span className="font-medium text-steel">Paused</span>}
        </p>
      </div>

      <ol className="col-span-2 flex gap-[5px] md:col-span-1" aria-label="Last 14 days">
        {marks.map((m) => (
          <li
            key={m.date}
            title={`${fmtShort(m.date)}: ${MARK_LABEL[m.mark]}`}
            className={cx('size-[13px] rounded-full', MARK_CLASS[m.mark], m.mark === 'none' && 'relative after:absolute after:inset-[5px] after:rounded-full after:bg-ink/15')}
          >
            <span className="sr-only">
              {fmtShort(m.date)}: {MARK_LABEL[m.mark]}
            </span>
          </li>
        ))}
      </ol>

      <div className="row-start-1 text-right md:row-auto">
        <p className="font-display text-[34px] leading-none tabular-nums">{current}</p>
        <p className="mt-1 text-[12.5px] text-ink-faint">
          day streak{best > current ? `, best ${best}` : ''}
        </p>
      </div>

      <div className="row-start-1 md:row-auto">
        <Menu
          trigger={
            <button
              type="button"
              aria-label={`Options for ${task.title}`}
              className="press grid size-9 place-items-center rounded-full text-ink-faint hover:bg-surface hover:text-ink"
            >
              <DotsGlyph />
            </button>
          }
        >
          <MenuItem onSelect={() => openComposer({ mode: 'edit', task })}>Edit</MenuItem>
          <MenuItem
            onSelect={() =>
              openComposer({
                mode: 'new',
                draft: { ...task, title: `${task.title} (copy)`, schedule: { ...task.schedule, start: data.today } },
              })
            }
          >
            Duplicate
          </MenuItem>
          {st === 'active' && <MenuItem onSelect={() => pause(task, data.today)}>Pause</MenuItem>}
          {st === 'paused' && <MenuItem onSelect={() => resume(task, data.today)}>Resume</MenuItem>}
          {st !== 'ended' && <MenuItem onSelect={() => endRoutine(task, data.today)}>End it, keep the history</MenuItem>}
          <div className="my-1 h-px bg-line" />
          <MenuItem danger onSelect={() => removeTask(task)}>
            Delete with its history
          </MenuItem>
        </Menu>
      </div>
    </li>
  )
}

function OnceList({ tasks, data }: { tasks: Task[]; data: Data }) {
  const openQuickAdd = useUI((s) => s.openQuickAdd)
  const statusOfOnce = (t: Task) => data.log.get(occKey(t.id, t.schedule.start))?.status ?? 'open'
  const byDate = (a: Task, b: Task) => (a.schedule.start < b.schedule.start ? -1 : 1)
  const overdue = tasks.filter((t) => t.schedule.start < data.today && statusOfOnce(t) === 'open').sort(byDate)
  const upcoming = tasks.filter((t) => t.schedule.start >= data.today && statusOfOnce(t) === 'open').sort(byDate)
  const finished = tasks
    .filter((t) => statusOfOnce(t) !== 'open')
    .sort(byDate)
    .reverse()
    .slice(0, 30)

  if (!tasks.length) return <Empty text="No one-off tasks. These are things for a single day." action={() => openQuickAdd()} />

  return (
    <div className="mt-8 grid gap-10">
      {[
        ['Not done yet, from earlier', overdue],
        ['Coming up', upcoming],
        ['Done or skipped', finished],
      ].map(([label, list]) =>
        (list as Task[]).length ? (
          <section key={label as string}>
            <h2 className="mb-2 font-display text-[22px]">{label as string}</h2>
            <ul className="divide-y divide-line border-y border-line">
              {(list as Task[]).map((t) => (
                <OnceRow key={t.id} task={t} data={data} status={statusOfOnce(t)} />
              ))}
            </ul>
          </section>
        ) : null,
      )}
    </div>
  )
}

function OnceRow({ task, data, status }: { task: Task; data: Data; status: 'open' | 'done' | 'skipped' }) {
  const openComposer = useUI((s) => s.openComposer)
  const id = `once-${task.id}`
  const occ = { key: occKey(task.id, task.schedule.start), task, date: task.schedule.start, time: task.time, status }
  return (
    <li className="flex items-center gap-4 py-3">
      <CheckButton done={status === 'done'} skipped={status === 'skipped'} labelledBy={id} onToggle={() => toggleDone(occ)} />
      <div className="min-w-0 flex-1">
        <button
          id={id}
          type="button"
          onClick={() => openComposer({ mode: 'edit', task })}
          className={cx('text-left font-medium hover:underline hover:underline-offset-4', status !== 'open' && 'text-ink-faint')}
        >
          {task.title}
        </button>
        <p className="text-[13.5px] text-ink-faint">
          {fmtRelative(task.schedule.start, data.today)}
          {task.time ? `, ${fmtTime(task.time)}` : ''}
          {status === 'skipped' ? ', skipped' : ''}
        </p>
      </div>
      <Button size="sm" variant="quiet" onClick={() => removeTask(task)}>
        Delete
      </Button>
    </li>
  )
}

function Empty({ text, action }: { text: string; action?: () => void }) {
  return (
    <div className="mt-10 rounded-[28px] border border-dashed border-line-strong px-6 py-12 text-center">
      <p className="mx-auto max-w-[44ch] text-[16px] text-ink-soft">{text}</p>
      {action && (
        <Button variant="primary" className="mt-6" onClick={action}>
          Add a task
        </Button>
      )}
    </div>
  )
}
