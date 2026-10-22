import type { ReactNode } from 'react'
import { NavLink } from 'react-router'
import { fmtLong } from '../lib/format'
import { useUI } from '../state/ui'
import { Kbd } from './CommandPalette'
import { ShaderBackground } from './ShaderBackground'
import { cx } from './ui'

const NAV = [
  { to: '/', label: 'Today', end: true },
  { to: '/calendar', label: 'Calendar' },
  { to: '/routines', label: 'Routines' },
  { to: '/rewards', label: 'Rewards' },
  { to: '/insights', label: 'Insights' },
  { to: '/settings', label: 'Settings' },
]

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <circle cx="16" cy="16" r="15" fill="var(--surface-2)" stroke="var(--line-strong)" />
      <circle cx="16" cy="16" r="11.5" fill="var(--enamel)" />
      <path d="M16 4.5a11.5 11.5 0 0 1 11.5 11.5" fill="none" stroke="var(--gold)" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M16 16L16 6.5" stroke="var(--porcelain)" strokeWidth="1.6" strokeLinecap="round" transform="rotate(130 16 16)" />
      <circle cx="16" cy="16" r="1.8" fill="var(--gold)" />
    </svg>
  )
}

export function AppShell({ today, children }: { today: string; children: ReactNode }) {
  const openQuickAdd = useUI((s) => s.openQuickAdd)
  const setPalette = useUI((s) => s.setPalette)
  const setShortcuts = useUI((s) => s.setShortcuts)

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[232px_1fr]">
      {/* Fixed, so it stays out of the grid and behind every page */}
      <ShaderBackground className="pointer-events-none fixed inset-0 -z-10" />
      <a
        href="#main"
        className="fixed top-3 left-3 z-[70] -translate-y-20 rounded-full bg-enamel px-4 py-2 text-enamel-ink focus-visible:translate-y-0"
      >
        Skip to content
      </a>

      {/* Desktop rail */}
      <aside className="sticky top-0 hidden h-dvh flex-col px-5 py-7 lg:flex">
        <div className="flex items-center gap-2.5 px-2">
          <BrandMark className="size-8" />
          <span className="font-display text-[22px] tracking-[-0.02em]">Day Dial</span>
        </div>

        <button
          type="button"
          onClick={() => openQuickAdd()}
          className="press mt-8 flex h-11 items-center justify-between rounded-full bg-enamel pr-2.5 pl-5 text-[15px] font-medium text-enamel-ink shadow-[var(--shadow-raised)] hover:bg-enamel-deep"
        >
          Add a task
          <kbd className="grid h-6 min-w-6 place-items-center rounded-md bg-enamel-ink/12 px-1.5 font-sans text-[12px] font-semibold">N</kbd>
        </button>

        <nav aria-label="Main" className="mt-8">
          <ul className="grid gap-0.5">
            {NAV.map((n) => (
              <li key={n.to}>
                <NavLink
                  to={n.to}
                  end={n.end}
                  className={({ isActive }) =>
                    cx(
                      'press flex items-center gap-3 rounded-full px-3 py-2 text-[15.5px]',
                      isActive ? 'font-semibold text-ink' : 'text-ink-soft hover:bg-surface hover:text-ink',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        aria-hidden="true"
                        className={cx('size-[7px] rotate-45', isActive ? 'bg-gold' : 'bg-transparent ring-1 ring-line-strong')}
                      />
                      {n.label}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-auto grid gap-3 px-3 text-[13.5px] text-ink-faint">
          <button type="button" onClick={() => setPalette(true)} className="flex items-center justify-between text-left hover:text-ink">
            Search <Kbd>Ctrl K</Kbd>
          </button>
          <button type="button" onClick={() => setShortcuts(true)} className="flex items-center justify-between text-left hover:text-ink">
            Shortcuts <Kbd>?</Kbd>
          </button>
          <p className="border-t border-line pt-3">{fmtLong(today)}</p>
        </div>
      </aside>

      {/* Phone header */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-bg/90 px-4 pt-[max(12px,env(safe-area-inset-top))] pb-3 backdrop-blur-md lg:hidden">
        <NavLink to="/" className="flex items-center gap-2">
          <BrandMark className="size-7" />
          <span className="font-display text-[20px] tracking-[-0.02em]">Day Dial</span>
        </NavLink>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setPalette(true)} className="press rounded-full px-3 py-1.5 text-[14px] text-ink-soft hover:bg-surface hover:text-ink">
            Search
          </button>
          <NavLink
            to="/insights"
            className={({ isActive }) => cx('press rounded-full px-3 py-1.5 text-[14px] hover:bg-surface', isActive ? 'font-semibold text-ink' : 'text-ink-soft')}
          >
            Insights
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) => cx('press rounded-full px-3 py-1.5 text-[14px] hover:bg-surface', isActive ? 'font-semibold text-ink' : 'text-ink-soft')}
          >
            Settings
          </NavLink>
        </div>
      </header>

      <main id="main" className="min-w-0 pb-28 lg:pb-0">
        {children}
      </main>

      {/* Phone tab bar */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
      >
        <ul className="mx-auto grid max-w-md grid-cols-5 items-center">
          {NAV.slice(0, 2).map((n) => (
            <TabLink key={n.to} {...n} />
          ))}
          <li className="grid place-items-center">
            <button
              type="button"
              onClick={() => openQuickAdd()}
              aria-label="Add a task"
              className="press -mt-5 grid size-14 place-items-center rounded-full bg-enamel text-enamel-ink shadow-[var(--shadow-float)] ring-4 ring-bg hover:bg-enamel-deep"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
                <path d="M10 3.5v13M3.5 10h13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </li>
          {NAV.slice(2, 4).map((n) => (
            <TabLink key={n.to} {...n} />
          ))}
        </ul>
      </nav>
    </div>
  )
}

function TabLink({ to, label, end }: { to: string; label: string; end?: boolean }) {
  return (
    <li>
      <NavLink
        to={to}
        end={end}
        className={({ isActive }) =>
          cx('press flex flex-col items-center gap-1 py-2.5 text-[12.5px]', isActive ? 'font-semibold text-ink' : 'text-ink-faint hover:text-ink')
        }
      >
        {({ isActive }) => (
          <>
            <span aria-hidden="true" className={cx('size-[6px] rotate-45', isActive ? 'bg-gold' : 'bg-transparent')} />
            {label}
          </>
        )}
      </NavLink>
    </li>
  )
}
