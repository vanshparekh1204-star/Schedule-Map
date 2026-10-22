import { Command } from 'cmdk'
import { useNavigate } from 'react-router'
import type { Data } from '../db/useData'
import { describeSchedule } from '../lib/format'
import { useUI } from '../state/ui'
import { setTheme } from './theme'
import { Modal } from './ui'

const PAGES = [
  ['/', 'Today', 'T'],
  ['/calendar', 'Calendar', 'C'],
  ['/routines', 'Routines and tasks', ''],
  ['/rewards', 'Rewards', 'R'],
  ['/insights', 'Insights', 'I'],
  ['/settings', 'Settings', ''],
] as const

export function CommandPalette({ data }: { data: Data }) {
  const open = useUI((s) => s.palette)
  const setOpen = useUI((s) => s.setPalette)
  const openQuickAdd = useUI((s) => s.openQuickAdd)
  const openComposer = useUI((s) => s.openComposer)
  const setShortcuts = useUI((s) => s.setShortcuts)
  const navigate = useNavigate()

  const run = (fn: () => void) => {
    setOpen(false)
    fn()
  }

  const itemClass =
    'flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-[15px] text-ink data-[selected=true]:bg-surface'

  return (
    <Modal open={open} onOpenChange={setOpen} label="Search and commands" top>
      <Command label="Search and commands" className="flex max-h-[60vh] flex-col">
        <Command.Input
          autoFocus
          placeholder="Search tasks, pages and actions"
          className="w-full rounded-t-[24px] border-b border-line bg-transparent px-5 py-4 text-[17px] placeholder:text-ink-faint focus-visible:outline-none"
        />
        <Command.List className="scroll-quiet overflow-y-auto p-2">
          <Command.Empty className="px-3 py-6 text-center text-[14.5px] text-ink-faint">Nothing matches that.</Command.Empty>
          <Command.Group heading="Actions" className="palette-group">
            <Command.Item className={itemClass} onSelect={() => run(() => openQuickAdd())}>
              Quick add a task <Kbd>N</Kbd>
            </Command.Item>
            <Command.Item className={itemClass} onSelect={() => run(() => openComposer({ mode: 'new' }))}>
              New task with all options
            </Command.Item>
            <Command.Item className={itemClass} onSelect={() => run(() => setTheme('light'))}>
              Use the light theme
            </Command.Item>
            <Command.Item className={itemClass} onSelect={() => run(() => setTheme('dark'))}>
              Use the dark theme
            </Command.Item>
            <Command.Item className={itemClass} onSelect={() => run(() => setShortcuts(true))}>
              Keyboard shortcuts <Kbd>?</Kbd>
            </Command.Item>
          </Command.Group>
          <Command.Group heading="Go to" className="palette-group">
            {PAGES.map(([path, label, key]) => (
              <Command.Item key={path} className={itemClass} onSelect={() => run(() => navigate(path))}>
                {label} {key && <Kbd>{key}</Kbd>}
              </Command.Item>
            ))}
          </Command.Group>
          {data.tasks.length > 0 && (
            <Command.Group heading="Tasks" className="palette-group">
              {data.tasks.map((t) => (
                <Command.Item
                  key={t.id}
                  value={`${t.title} ${t.id}`}
                  className={itemClass}
                  onSelect={() => run(() => openComposer({ mode: 'edit', task: t }))}
                >
                  <span className="truncate">{t.title}</span>
                  <span className="shrink-0 text-[13px] text-ink-faint">
                    {describeSchedule(t.schedule, data.today, data.settings.weekStart)}
                  </span>
                </Command.Item>
              ))}
            </Command.Group>
          )}
        </Command.List>
      </Command>
    </Modal>
  )
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-grid h-6 min-w-6 place-items-center rounded-md border border-line-strong bg-surface-2 px-1.5 font-sans text-[12px] font-semibold text-ink-soft">
      {children}
    </kbd>
  )
}
