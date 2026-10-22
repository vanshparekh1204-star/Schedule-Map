import { useEffect, useMemo, useState } from 'react'
import { saveTask } from '../db/actions'
import { uid } from '../db/db'
import type { Data } from '../db/useData'
import { addDays, maxDate } from '../lib/dates'
import { describeSchedule, fmtDuration, fmtShort, orderedWeekdays, WEEKDAY_SHORT } from '../lib/format'
import { DURATION_PRESETS, lastDate, nextOccurrences, partForTime, PART_LABEL } from '../lib/recurrence'
import type { DateStr, PartOfDay, Priority, RepeatKind, Schedule, Task } from '../lib/types'
import { useUI, type ComposerTarget } from '../state/ui'
import { removeTask } from './taskActions'
import { Button, Chip, CloseGlyph, Field, inputClass, Segmented, Sheet } from './ui'

type EndChoice = 'forever' | (typeof DURATION_PRESETS)[number]['id'] | 'until' | 'count'

interface Form {
  title: string
  notes: string
  priority: Priority
  area: string
  timing: 'time' | 'part'
  time: string
  durationMin: number
  part: PartOfDay
  kind: RepeatKind
  start: DateStr
  days: number[]
  every: number
  endChoice: EndChoice
  until: DateStr
  count: number
  skip: DateStr[]
  skipDraft: DateStr
}

function formFrom(target: ComposerTarget, data: Data): Form {
  const base: Form = {
    title: '',
    notes: '',
    priority: 'general',
    area: data.settings.areas[0]?.id ?? '',
    timing: 'part',
    time: '09:00',
    durationMin: 0,
    part: 'anytime',
    kind: 'once',
    start: (target.mode === 'new' && target.date) || data.today,
    days: [1, 2, 3, 4, 5],
    every: 2,
    endChoice: 'forever',
    until: addDays(data.today, 29),
    count: 10,
    skip: [],
    skipDraft: '',
  }
  const t = target.mode === 'edit' ? target.task : target.draft
  if (!t) return base
  const s = t.schedule
  return {
    ...base,
    title: t.title ?? '',
    notes: t.notes ?? '',
    priority: t.priority ?? base.priority,
    area: t.area ?? base.area,
    timing: t.time ? 'time' : 'part',
    time: t.time ?? base.time,
    durationMin: t.durationMin ?? 0,
    part: t.part ?? base.part,
    ...(s && {
      kind: s.kind,
      start: s.start,
      days: s.days.length ? s.days : base.days,
      every: s.every,
      endChoice: s.end.type === 'forever' ? 'forever' : s.end.type,
      until: s.end.type === 'until' ? s.end.date : base.until,
      count: s.end.type === 'count' ? s.end.count : base.count,
      skip: s.skip,
    }),
  }
}

function scheduleFrom(f: Form): Schedule {
  let end: Schedule['end'] = { type: 'forever' }
  const preset = DURATION_PRESETS.find((p) => p.id === f.endChoice)
  if (f.kind !== 'once') {
    if (preset) end = { type: 'until', date: preset.end(f.start) }
    else if (f.endChoice === 'until') end = { type: 'until', date: f.until }
    else if (f.endChoice === 'count') end = { type: 'count', count: Math.max(1, f.count) }
  }
  return {
    kind: f.kind,
    start: f.start,
    days: f.kind === 'weekdays' ? [...f.days].sort() : [],
    every: Math.max(2, f.every),
    end,
    skip: f.kind === 'once' ? [] : f.skip.filter((d) => d >= f.start).sort(),
  }
}

const DURATIONS = [0, 5, 10, 15, 20, 30, 45, 60, 90, 120]
const PARTS: PartOfDay[] = ['morning', 'afternoon', 'evening', 'night', 'anytime']

export function Composer({ data }: { data: Data }) {
  const target = useUI((s) => s.composer)
  const close = useUI((s) => s.closeComposer)
  const toast = useUI((s) => s.toast)
  const [form, setForm] = useState<Form | null>(null)
  const [applyFrom, setApplyFrom] = useState<'all' | 'today'>('all')
  const [tried, setTried] = useState(false)

  useEffect(() => {
    if (target) {
      setForm(formFrom(target, data))
      setApplyFrom('all')
      setTried(false)
    }
    // Only reset when a new target opens, not on every data change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target])

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => (f ? { ...f, [k]: v } : f))
  const schedule = useMemo(() => (form ? scheduleFrom(form) : null), [form])
  const editing = target?.mode === 'edit' ? target.task : null

  const errors = useMemo(() => {
    if (!form || !schedule) return {}
    const e: Record<string, string> = {}
    if (!form.title.trim()) e.title = 'Give the task a name.'
    if (form.kind === 'weekdays' && form.days.length === 0) e.days = 'Pick at least one day.'
    if (form.kind !== 'once' && form.endChoice === 'until' && form.until < form.start) e.until = 'The end date is before the start date.'
    return e
  }, [form, schedule])

  const preview = useMemo(() => {
    if (!form || !schedule) return null
    const probe = { schedule, pauses: [] } as unknown as Task
    const from = maxDate(form.start, data.today)
    return { next: nextOccurrences(probe, from, 6), last: lastDate(schedule) }
  }, [form, schedule, data.today])

  if (!form || !schedule) return null

  const scheduleChanged =
    editing && editing.schedule.kind !== 'once' && JSON.stringify(editing.schedule) !== JSON.stringify(schedule)
  const canSplit = Boolean(scheduleChanged && editing!.schedule.start < data.today)

  async function submit() {
    setTried(true)
    if (Object.keys(errors).length || !form || !schedule) return
    const fields = {
      title: form.title.trim(),
      notes: form.notes.trim(),
      priority: form.priority,
      area: form.area,
      time: form.timing === 'time' ? form.time : undefined,
      durationMin: form.durationMin || undefined,
      part: form.timing === 'time' ? partForTime(form.time) : form.part,
      schedule,
    }
    if (editing && canSplit && applyFrom === 'today') {
      // Keep the old version for past days, start the new one today.
      await saveTask({ ...editing, schedule: { ...editing.schedule, end: { type: 'until', date: addDays(data.today, -1) } } })
      await saveTask({
        ...editing,
        ...fields,
        id: uid(),
        createdAt: Date.now(),
        pauses: [],
        schedule: { ...schedule, start: maxDate(schedule.start, data.today) },
      })
    } else if (editing) {
      await saveTask({ ...editing, ...fields })
    } else {
      await saveTask({ id: uid(), createdAt: Date.now(), pauses: [], ...fields })
    }
    toast(editing ? `Saved changes to ${fields.title}.` : `Added ${fields.title}.`)
    close()
  }

  const weekdays = orderedWeekdays(data.settings.weekStart)

  return (
    <Sheet
      open={Boolean(target)}
      onOpenChange={(o) => !o && close()}
      title={editing ? 'Edit task' : 'New task'}
      description={editing ? undefined : 'Set it up once. Repeating tasks appear on their days by themselves.'}
      footer={
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" size="lg" onClick={submit}>
            {editing ? 'Save changes' : 'Add task'}
          </Button>
          <Button variant="quiet" onClick={close}>
            Cancel
          </Button>
          {editing && (
            <Button
              variant="danger"
              className="ml-auto"
              onClick={() => {
                removeTask(editing)
                close()
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
          submit()
        }}
      >
        <div>
          <label htmlFor="c-title" className="sr-only">
            Task name
          </label>
          <input
            id="c-title"
            autoFocus
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="What needs doing?"
            className="w-full border-b border-line-strong bg-transparent pb-2 font-display text-[30px] leading-tight tracking-[-0.02em] placeholder:text-ink-faint/70 focus-visible:border-steel focus-visible:outline-none"
            aria-invalid={tried && !!errors.title}
            aria-describedby={tried && errors.title ? 'c-title-err' : undefined}
          />
          {tried && errors.title && (
            <p id="c-title-err" className="mt-2 text-[13.5px] text-oxblood">
              {errors.title}
            </p>
          )}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Priority">
            <Segmented
              label="Priority"
              value={form.priority}
              onChange={(v) => set('priority', v)}
              options={[
                { value: 'general', label: 'General' },
                {
                  value: 'high',
                  label: (
                    <span className="inline-flex items-center gap-2">
                      <span className="inline-block size-2 rotate-45 bg-oxblood" aria-hidden="true" />
                      High
                    </span>
                  ),
                },
              ]}
            />
          </Field>
          <Field label="Area" htmlFor="c-area">
            <select id="c-area" value={form.area} onChange={(e) => set('area', e.target.value)} className={inputClass}>
              {data.settings.areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="When in the day">
          <Segmented
            label="When in the day"
            value={form.timing}
            onChange={(v) => set('timing', v)}
            options={[
              { value: 'part', label: 'Part of the day' },
              { value: 'time', label: 'At a set time' },
            ]}
          />
          {form.timing === 'part' ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {PARTS.map((p) => (
                <Chip key={p} pressed={form.part === p} onClick={() => set('part', p)}>
                  {PART_LABEL[p]}
                </Chip>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label htmlFor="c-time" className="sr-only">
                  Time
                </label>
                <input id="c-time" type="time" value={form.time} onChange={(e) => set('time', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label htmlFor="c-dur" className="sr-only">
                  How long it takes
                </label>
                <select
                  id="c-dur"
                  value={form.durationMin}
                  onChange={(e) => set('durationMin', Number(e.target.value))}
                  className={inputClass}
                >
                  {DURATIONS.map((d) => (
                    <option key={d} value={d}>
                      {d ? fmtDuration(d) : 'No set length'}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </Field>

        <Field label="Repeat">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['once', 'Just once'],
                ['daily', 'Every day'],
                ['weekdays', 'Certain days'],
                ['interval', 'Every few days'],
              ] as [RepeatKind, string][]
            ).map(([k, label]) => (
              <Chip key={k} pressed={form.kind === k} onClick={() => set('kind', k)}>
                {label}
              </Chip>
            ))}
          </div>

          {form.kind === 'weekdays' && (
            <div className="grid gap-2 pt-2">
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Days of the week">
                {weekdays.map((d) => (
                  <Chip
                    key={d}
                    className="w-[52px] px-0"
                    pressed={form.days.includes(d)}
                    onClick={() => set('days', form.days.includes(d) ? form.days.filter((x) => x !== d) : [...form.days, d])}
                  >
                    {WEEKDAY_SHORT[d]}
                  </Chip>
                ))}
              </div>
              <div className="flex gap-3 text-[13.5px]">
                <button type="button" className="text-ink-soft underline-offset-4 hover:text-ink hover:underline" onClick={() => set('days', [1, 2, 3, 4, 5])}>
                  Weekdays
                </button>
                <button type="button" className="text-ink-soft underline-offset-4 hover:text-ink hover:underline" onClick={() => set('days', [0, 6])}>
                  Weekends
                </button>
              </div>
              {tried && errors.days && <p className="text-[13.5px] text-oxblood">{errors.days}</p>}
            </div>
          )}

          {form.kind === 'interval' && (
            <div className="flex items-center gap-3 pt-2 text-[15px]">
              <label htmlFor="c-every">Every</label>
              <input
                id="c-every"
                type="number"
                min={2}
                max={60}
                value={form.every}
                onChange={(e) => set('every', Number(e.target.value))}
                className={`${inputClass} w-20 text-center`}
              />
              <span>days</span>
            </div>
          )}
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={form.kind === 'once' ? 'Day' : 'Starts'} htmlFor="c-start">
            <input id="c-start" type="date" value={form.start} onChange={(e) => e.target.value && set('start', e.target.value)} className={inputClass} />
          </Field>
        </div>

        {form.kind !== 'once' && (
          <Field label="How long it runs">
            <div className="flex flex-wrap gap-2">
              <Chip pressed={form.endChoice === 'forever'} onClick={() => set('endChoice', 'forever')}>
                No end
              </Chip>
              {DURATION_PRESETS.map((p) => (
                <Chip key={p.id} pressed={form.endChoice === p.id} onClick={() => set('endChoice', p.id)}>
                  {p.label}
                </Chip>
              ))}
              <Chip pressed={form.endChoice === 'until'} onClick={() => set('endChoice', 'until')}>
                Until a date
              </Chip>
              <Chip pressed={form.endChoice === 'count'} onClick={() => set('endChoice', 'count')}>
                A number of times
              </Chip>
            </div>
            {form.endChoice === 'until' && (
              <div className="max-w-[240px] pt-2">
                <label htmlFor="c-until" className="sr-only">
                  Last day
                </label>
                <input id="c-until" type="date" value={form.until} min={form.start} onChange={(e) => e.target.value && set('until', e.target.value)} className={inputClass} />
                {tried && errors.until && <p className="mt-2 text-[13.5px] text-oxblood">{errors.until}</p>}
              </div>
            )}
            {form.endChoice === 'count' && (
              <div className="flex items-center gap-3 pt-2 text-[15px]">
                <label htmlFor="c-count" className="sr-only">
                  Number of times
                </label>
                <input
                  id="c-count"
                  type="number"
                  min={1}
                  max={999}
                  value={form.count}
                  onChange={(e) => set('count', Number(e.target.value))}
                  className={`${inputClass} w-24 text-center`}
                />
                <span>times</span>
              </div>
            )}
          </Field>
        )}

        {form.kind !== 'once' && (
          <Field label="Days to leave out" hint="holidays, travel, rest days">
            <div className="flex gap-2">
              <label htmlFor="c-skip" className="sr-only">
                Day to leave out
              </label>
              <input
                id="c-skip"
                type="date"
                value={form.skipDraft}
                min={form.start}
                onChange={(e) => set('skipDraft', e.target.value)}
                className={`${inputClass} max-w-[220px]`}
              />
              <Button
                variant="outline"
                disabled={!form.skipDraft || form.skip.includes(form.skipDraft)}
                onClick={() => setForm((f) => (f ? { ...f, skip: [...f.skip, f.skipDraft].sort(), skipDraft: '' } : f))}
              >
                Leave out
              </Button>
            </div>
            {form.skip.length > 0 && (
              <ul className="flex flex-wrap gap-2 pt-1">
                {form.skip.map((d) => (
                  <li key={d} className="inline-flex h-8 items-center gap-1 rounded-full bg-surface pr-1 pl-3 text-[13.5px] ring-1 ring-line">
                    {fmtShort(d)}
                    <button
                      type="button"
                      aria-label={`Put ${fmtShort(d)} back`}
                      onClick={() => set('skip', form.skip.filter((x) => x !== d))}
                      className="press grid size-6 place-items-center rounded-full text-ink-faint hover:bg-surface-2 hover:text-ink"
                    >
                      <CloseGlyph />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Field>
        )}

        <Field label="Notes" htmlFor="c-notes" hint="optional">
          <textarea
            id="c-notes"
            rows={2}
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            className={`${inputClass} h-auto py-2.5 leading-relaxed`}
            placeholder="Anything worth remembering"
          />
        </Field>

        {preview && (
          <section aria-label="Preview" className="rounded-2xl bg-enamel px-5 py-4 text-enamel-ink">
            <p className="font-display text-[19px]">{describeSchedule(schedule, data.today, data.settings.weekStart)}</p>
            {preview.next.length ? (
              <>
                <p className="mt-1 text-[14px] text-enamel-ink-soft">
                  {form.kind === 'once' ? fmtShort(preview.next[0]) : `Next: ${preview.next.map((d) => fmtShort(d)).join(', ')}`}
                </p>
                {form.kind !== 'once' && preview.last && (
                  <p className="text-[14px] text-enamel-ink-soft">Last day: {fmtShort(preview.last)}</p>
                )}
              </>
            ) : (
              <p className="mt-1 text-[14px] text-enamel-ink-soft">No days left on this schedule from today.</p>
            )}
          </section>
        )}

        {canSplit && (
          <Field label="Apply the new schedule to">
            <Segmented
              label="Apply the new schedule to"
              value={applyFrom}
              onChange={setApplyFrom}
              options={[
                { value: 'all', label: 'All days, past too' },
                { value: 'today', label: 'Today onwards' },
              ]}
            />
            <p className="text-[13.5px] text-ink-faint">
              {applyFrom === 'today'
                ? 'Past days keep the old schedule, so your history stays as it was.'
                : 'Past days are recounted with the new schedule.'}
            </p>
          </Field>
        )}
        <button type="submit" className="hidden" />
      </form>
    </Sheet>
  )
}
