import * as Popover from '@radix-ui/react-popover'
import { memo, useState } from 'react'
import { addDays } from '../lib/dates'
import { describeSchedule, fmtDuration, fmtTime } from '../lib/format'
import { isPausedNow, type Occurrence } from '../lib/recurrence'
import type { Area, DateStr } from '../lib/types'
import { useUI } from '../state/ui'
import { moveOnceTo, moveTime, pause, removeTask, skipOccurrence, toggleDone } from './taskActions'
import { Button, cx, DotsGlyph, inputClass, Menu, MenuItem } from './ui'

interface Props {
  occ: Occurrence
  today: DateStr
  areas: Area[]
  weekStart: 0 | 1
  /** The time this occurrence was moved to, if it differs from the routine's. */
  moved: boolean
}

export const TaskRow = memo(function TaskRow({ occ, today, areas, weekStart, moved }: Props) {
  const hovered = useUI((s) => s.hovered === occ.key)
  const setHovered = useUI((s) => s.setHovered)
  const openComposer = useUI((s) => s.openComposer)
  const { task, status } = occ
  const done = status === 'done'
  const skipped = status === 'skipped'
  const recurring = task.schedule.kind !== 'once'
  const area = areas.find((a) => a.id === task.area)?.name
  const titleId = `t-${occ.key}`

  return (
    <li
      onPointerEnter={() => setHovered(occ.key)}
      onPointerLeave={() => setHovered(null)}
      className={cx(
        'group relative flex items-start gap-3.5 rounded-2xl px-3 py-3 sm:px-4',
        hovered ? 'bg-surface-2 shadow-[var(--shadow-raised)]' : 'hover:bg-surface-2',
      )}
    >
      <CheckButton done={done} skipped={skipped} labelledBy={titleId} onToggle={() => toggleDone(occ)} />

      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex items-baseline gap-2">
          {task.priority === 'high' && (
            <span className="relative top-[-1px] inline-block size-2 shrink-0 rotate-45 bg-oxblood" aria-hidden="true" />
          )}
          <span
            id={titleId}
            className={cx(
              'text-[16px] leading-snug font-medium break-words',
              done && 'text-ink-faint line-through decoration-gold decoration-[1.5px]',
              skipped && 'text-ink-faint',
            )}
          >
            {task.title}
            {task.priority === 'high' && <span className="sr-only"> (high priority)</span>}
          </span>
        </div>
        <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[13.5px] text-ink-faint">
          {skipped && <span className="font-medium text-ink-soft">Skipped</span>}
          {recurring && <span>{describeSchedule(task.schedule, today, weekStart)}</span>}
          {area && <span>{area}</span>}
          {task.durationMin ? <span>{fmtDuration(task.durationMin)}</span> : null}
          {moved && <span className="text-steel">Moved for this day</span>}
        </div>
        {task.notes && <p className="mt-1 line-clamp-2 text-[13.5px] text-ink-soft">{task.notes}</p>}
      </div>

      {occ.time && (
        <span className={cx('shrink-0 pt-0.5 text-[14px] font-medium tabular-nums', done ? 'text-ink-faint' : 'text-ink-soft')}>
          {fmtTime(occ.time)}
        </span>
      )}

      <Menu
        trigger={
          <button
            type="button"
            aria-label={`Options for ${task.title}`}
            className="press -my-1 grid size-9 shrink-0 place-items-center rounded-full text-ink-faint hover:bg-surface hover:text-ink data-[state=open]:bg-surface data-[state=open]:text-ink"
          >
            <DotsGlyph />
          </button>
        }
      >
        <MenuItem onSelect={() => skipOccurrence(occ)}>{skipped ? 'Undo skip' : 'Skip this day'}</MenuItem>
        <MoveTimeItem occ={occ} moved={moved} />
        {!recurring && occ.date < today && (
          <MenuItem onSelect={() => moveOnceTo(task, today, today)}>Move to today</MenuItem>
        )}
        {!recurring && occ.date >= today && (
          <MenuItem onSelect={() => moveOnceTo(task, addDays(occ.date, 1), today)}>
            {occ.date === today ? 'Move to tomorrow' : 'Move to the next day'}
          </MenuItem>
        )}
        <MenuItem onSelect={() => openComposer({ mode: 'edit', task })}>Edit</MenuItem>
        {recurring && !isPausedNow(task) && <MenuItem onSelect={() => pause(task, today)}>Pause routine</MenuItem>}
        <div className="my-1 h-px bg-line" />
        <MenuItem danger onSelect={() => removeTask(task)}>
          Delete {recurring ? 'routine' : 'task'}
        </MenuItem>
      </Menu>
    </li>
  )
})

function MoveTimeItem({ occ, moved }: { occ: Occurrence; moved: boolean }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(occ.time ?? '09:00')
  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="flex w-full items-center rounded-xl px-3 py-2 text-left text-[14.5px] text-ink hover:bg-surface focus-visible:bg-surface"
      >
        {occ.time ? 'Change time for this day' : 'Set a time for this day'}
      </button>
    )
  }
  return (
    <div className="grid gap-2 px-3 py-2">
      <label className="text-[13px] font-semibold text-ink" htmlFor={`mt-${occ.key}`}>
        Time for this day only
      </label>
      <input id={`mt-${occ.key}`} type="time" value={value} onChange={(e) => setValue(e.target.value)} className={inputClass} autoFocus />
      <div className="flex gap-2">
        <Popover.Close asChild>
          <Button size="sm" variant="primary" onClick={() => moveTime(occ, value)}>
            Move
          </Button>
        </Popover.Close>
        {moved && (
          <Popover.Close asChild>
            <Button size="sm" variant="quiet" onClick={() => moveTime(occ, null)}>
              Back to usual time
            </Button>
          </Popover.Close>
        )}
      </div>
    </div>
  )
}

/** Round check control, styled like a watch crown seen end-on. */
export function CheckButton({
  done,
  skipped,
  onToggle,
  labelledBy,
}: {
  done: boolean
  skipped?: boolean
  onToggle: () => void
  labelledBy: string
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={done}
      aria-labelledby={labelledBy}
      onClick={onToggle}
      className={cx(
        'press relative mt-0.5 grid size-[26px] shrink-0 place-items-center rounded-full',
        done && 'bg-gold',
        !done && skipped && 'border-[1.5px] border-dashed border-line-strong hover:border-ink-faint',
        !done && !skipped && 'ring-[1.5px] ring-line-strong ring-inset hover:ring-ink-faint',
      )}
    >
      <svg
        viewBox="0 0 16 16"
        className="size-3.5"
        style={{
          transform: done ? 'scale(1)' : 'scale(0.3)',
          opacity: done ? 1 : 0,
          transition: 'transform 380ms var(--ease-spring), opacity 200ms ease',
        }}
        aria-hidden="true"
      >
        <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="#1b1606" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {!done && <span className="absolute inset-[6px] rounded-full bg-ink opacity-0 group-hover:opacity-[0.06]" aria-hidden="true" />}
    </button>
  )
}
