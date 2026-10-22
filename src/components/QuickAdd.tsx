import { useEffect, useMemo, useState } from 'react'
import { saveTask } from '../db/actions'
import { uid } from '../db/db'
import type { Data } from '../db/useData'
import { parseQuickAdd } from '../lib/quickAdd'
import { useUI } from '../state/ui'
import { Button, Modal } from './ui'

const EXAMPLES = [
  'skincare every night for 1 month #self-care',
  'gym mon, wed and fri 7am for 1 hour',
  'call the bank tomorrow 11am !high',
  'water the plants every 3 days',
]

export function QuickAdd({ data }: { data: Data }) {
  const state = useUI((s) => s.quickAdd)
  const close = useUI((s) => s.closeQuickAdd)
  const openComposer = useUI((s) => s.openComposer)
  const toast = useUI((s) => s.toast)
  const [text, setText] = useState('')

  useEffect(() => {
    if (state) setText('')
  }, [state])

  const base = state?.date ?? data.today
  const parsed = useMemo(() => (text.trim() ? parseQuickAdd(text, base, data.settings.areas) : null), [text, base, data.settings.areas])

  async function add() {
    if (!parsed?.title) return
    await saveTask({
      id: uid(),
      createdAt: Date.now(),
      pauses: [],
      title: parsed.title,
      notes: '',
      priority: parsed.priority,
      area: parsed.area ?? data.settings.areas[0]?.id ?? '',
      time: parsed.time,
      durationMin: parsed.durationMin,
      part: parsed.part,
      schedule: parsed.schedule,
    })
    toast(`Added ${parsed.title}.`)
    close()
  }

  function more() {
    openComposer({
      mode: 'new',
      date: base,
      draft: parsed
        ? {
            title: parsed.title,
            priority: parsed.priority,
            area: parsed.area,
            time: parsed.time,
            durationMin: parsed.durationMin,
            part: parsed.part,
            schedule: parsed.schedule,
          }
        : undefined,
    })
  }

  return (
    <Modal open={Boolean(state)} onOpenChange={(o) => !o && close()} label="Quick add" top>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          add()
        }}
      >
        <div className="px-5 pt-5">
          <label htmlFor="qa-input" className="text-[13.5px] font-semibold text-ink-soft">
            Quick add
          </label>
          <input
            id="qa-input"
            autoFocus
            autoComplete="off"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a task and when it happens"
            className="mt-1 w-full bg-transparent font-display text-[26px] leading-tight tracking-[-0.02em] placeholder:text-ink-faint/70 focus-visible:outline-none"
            aria-describedby="qa-understood"
          />
        </div>

        <div id="qa-understood" aria-live="polite" className="min-h-[76px] px-5 pt-3 pb-4">
          {parsed ? (
            <>
              <p className="text-[14.5px]">
                <span className="text-ink-faint">Adds </span>
                <span className="font-semibold">{parsed.title || 'a task with no name yet'}</span>
              </p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {parsed.chips.map((c) => (
                  <li key={c} className="rounded-full bg-enamel px-3 py-1 text-[13px] font-medium text-enamel-ink">
                    {c}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="text-[13.5px] text-ink-faint">
              <p>Try one of these:</p>
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {EXAMPLES.map((ex) => (
                  <li key={ex}>
                    <button
                      type="button"
                      onClick={() => setText(ex)}
                      className="press rounded-full border border-line-strong px-3 py-1 text-ink-soft hover:border-ink-faint hover:text-ink"
                    >
                      {ex}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-b-[24px] border-t border-line bg-surface px-5 py-3">
          <Button type="submit" variant="primary" disabled={!parsed?.title}>
            Add task
          </Button>
          <Button variant="quiet" onClick={more}>
            More options
          </Button>
          <span className="ml-auto hidden text-[12.5px] text-ink-faint sm:inline">
            <kbd className="font-sans font-semibold">!high</kbd> for high priority, <kbd className="font-sans font-semibold">#area</kbd> to file it
          </span>
        </div>
      </form>
    </Modal>
  )
}
