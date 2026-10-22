import { PART_LABEL, PART_ORDER, partOfOccurrence, type Occurrence } from '../lib/recurrence'
import type { PartOfDay } from '../lib/types'
import type { Data } from '../db/useData'
import { TaskRow } from './TaskRow'

const PART_SPAN: Record<PartOfDay, string> = {
  morning: '5 am to noon',
  afternoon: 'noon to 5 pm',
  evening: '5 to 9 pm',
  night: '9 pm onwards',
  anytime: 'whenever it fits',
}

export function DayAgenda({ occurrences, data }: { occurrences: Occurrence[]; data: Data }) {
  const groups = PART_ORDER.map((part) => ({
    part,
    items: occurrences.filter((o) => partOfOccurrence(o) === part),
  })).filter((g) => g.items.length)

  return (
    <div className="grid gap-8">
      {groups.map(({ part, items }) => {
        const counted = items.filter((o) => o.status !== 'skipped')
        const done = counted.filter((o) => o.status === 'done').length
        return (
          <section key={part} aria-labelledby={`part-${part}`}>
            <div className="mb-2 flex items-baseline justify-between gap-4 px-3 sm:px-4">
              <h3 id={`part-${part}`} className="font-display text-[22px] tracking-[-0.01em]">
                {PART_LABEL[part]}
                <span className="ml-3 font-sans text-[13px] tracking-normal text-ink-faint">{PART_SPAN[part]}</span>
              </h3>
              {counted.length > 0 && (
                <span className="text-[13.5px] text-ink-faint tabular-nums">
                  {done} of {counted.length}
                </span>
              )}
            </div>
            <ul className="grid gap-0.5">
              {items.map((o) => (
                <TaskRow
                  key={o.key}
                  occ={o}
                  today={data.today}
                  areas={data.settings.areas}
                  weekStart={data.settings.weekStart}
                  moved={data.overrides.has(o.key)}
                />
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
