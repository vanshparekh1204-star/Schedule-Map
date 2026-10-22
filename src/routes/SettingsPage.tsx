import { useEffect, useRef, useState, type ReactNode } from 'react'
import { setTheme, useTheme, type Theme } from '../components/theme'
import { Button, CloseGlyph, inputClass, Modal, Segmented } from '../components/ui'
import { exportBackup, importBackup, resetAll, BackupError } from '../db/backup'
import { saveSettings, uid } from '../db/db'
import type { Data } from '../db/useData'
import { useUI } from '../state/ui'

export function SettingsPage({ data }: { data: Data }) {
  const theme = useTheme()
  const toast = useUI((s) => s.toast)
  const { settings } = data
  const [persisted, setPersisted] = useState<boolean | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [newArea, setNewArea] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersisted).catch(() => setPersisted(null))
  }, [])

  const usage = (areaId: string) => data.tasks.filter((t) => t.area === areaId).length
  const lastBackup = settings.lastBackup
  const daysSince = lastBackup ? Math.floor((Date.now() - lastBackup) / 86_400_000) : null

  return (
    <div className="mx-auto max-w-[880px] px-4 pt-4 pb-16 sm:px-8 lg:px-12 lg:pt-10">
      <h1 className="font-display text-[clamp(48px,7vw,88px)] leading-[0.95] tracking-[-0.035em]">Settings</h1>

      <Group title="Look">
        <Row label="Theme" hint="System follows your computer’s light or dark setting.">
          <Segmented<Theme>
            label="Theme"
            value={theme}
            onChange={setTheme}
            options={[
              { value: 'system', label: 'System' },
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
          />
        </Row>
      </Group>

      <Group title="Your days">
        <Row label="Weeks start on" hint="Used by the calendar and for weekly rewards.">
          <Segmented
            label="Weeks start on"
            value={String(settings.weekStart) as '0' | '1'}
            onChange={(v) => saveSettings({ weekStart: Number(v) as 0 | 1 })}
            options={[
              { value: '1', label: 'Monday' },
              { value: '0', label: 'Sunday' },
            ]}
          />
        </Row>
        <Row label="The day ends at" hint="If you’re often up late, keep “today” going past midnight." htmlFor="s-rollover">
          <select
            id="s-rollover"
            value={settings.rolloverHour}
            onChange={(e) => saveSettings({ rolloverHour: Number(e.target.value) })}
            className={`${inputClass} w-44`}
          >
            <option value={0}>Midnight</option>
            {[1, 2, 3, 4].map((h) => (
              <option key={h} value={h}>
                {h} am
              </option>
            ))}
          </select>
        </Row>
      </Group>

      <Group title="Areas" note="Areas sort tasks into parts of life. Rewards and Insights can look at one area at a time.">
        <ul className="grid gap-2">
          {settings.areas.map((a) => {
            const n = usage(a.id)
            return (
              <li key={a.id + a.name} className="flex items-center gap-3">
                <label htmlFor={`area-${a.id}`} className="sr-only">
                  Area name
                </label>
                <input
                  id={`area-${a.id}`}
                  defaultValue={a.name}
                  onBlur={(e) => {
                    const name = e.target.value.trim()
                    if (name && name !== a.name) saveSettings({ areas: settings.areas.map((x) => (x.id === a.id ? { ...x, name } : x)) })
                    else e.target.value = a.name
                  }}
                  className={`${inputClass} max-w-xs`}
                />
                <span className="text-[13.5px] text-ink-faint">{n ? `${n} ${n === 1 ? 'task' : 'tasks'}` : 'Unused'}</span>
                {n === 0 && settings.areas.length > 1 && (
                  <button
                    type="button"
                    aria-label={`Remove ${a.name}`}
                    onClick={() => saveSettings({ areas: settings.areas.filter((x) => x.id !== a.id) })}
                    className="press grid size-8 place-items-center rounded-full text-ink-faint hover:bg-surface hover:text-ink"
                  >
                    <CloseGlyph />
                  </button>
                )}
              </li>
            )
          })}
        </ul>
        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            const name = newArea.trim()
            if (!name) return
            saveSettings({ areas: [...settings.areas, { id: uid(), name }] })
            setNewArea('')
          }}
        >
          <label htmlFor="s-new-area" className="sr-only">
            New area
          </label>
          <input
            id="s-new-area"
            value={newArea}
            onChange={(e) => setNewArea(e.target.value)}
            placeholder="New area, like Study"
            className={`${inputClass} max-w-xs`}
          />
          <Button type="submit" variant="outline" disabled={!newArea.trim()}>
            Add area
          </Button>
        </form>
      </Group>

      <Group
        title="Backup"
        note="Everything is stored in this browser on this computer. Clearing the browser’s site data would erase it, so export a backup now and then."
      >
        <p className="text-[15px]">
          {daysSince === null
            ? 'You haven’t made a backup yet.'
            : daysSince === 0
              ? 'Last backup: today.'
              : `Last backup: ${daysSince} ${daysSince === 1 ? 'day' : 'days'} ago.`}
          {persisted === true && <span className="text-ink-faint"> The browser has agreed to keep this data.</span>}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button
            variant="primary"
            onClick={async () => {
              await exportBackup()
              toast('Backup saved to your downloads.')
            }}
          >
            Export a backup
          </Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            Restore from a backup
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (!file) return
              try {
                await importBackup(file)
                setImportError(null)
                toast('Restored from the backup.')
              } catch (err) {
                setImportError(err instanceof BackupError ? err.message : 'That backup couldn’t be read, so nothing was changed.')
              }
            }}
          />
        </div>
        {importError && (
          <p role="alert" className="mt-3 text-[14px] text-oxblood">
            {importError}
          </p>
        )}
        <p className="mt-3 text-[13.5px] text-ink-faint">Restoring replaces everything here with the backup’s contents.</p>
      </Group>

      <Group title="Open it in one click">
        <ol className="grid list-decimal gap-2 pl-5 text-[15px] leading-relaxed text-ink-soft marker:text-ink-faint">
          <li>
            In Edge or Chrome, open the browser menu and choose <strong className="font-semibold text-ink">Apps</strong>, then{' '}
            <strong className="font-semibold text-ink">Install this site as an app</strong> (Chrome calls it{' '}
            <strong className="font-semibold text-ink">Install Day Dial</strong>).
          </li>
          <li>Right-click its icon in the taskbar and pin it.</li>
          <li>From then on, click the icon. It opens in its own window and works without the local server running.</li>
        </ol>
      </Group>

      <Group title="Start over">
        <p className="text-[15px] text-ink-soft">Erase every task, routine, reward and all history from this browser.</p>
        <Button variant="danger" className="mt-3 -ml-5" onClick={() => setConfirmReset(true)}>
          Erase everything
        </Button>
      </Group>

      <Modal open={confirmReset} onOpenChange={setConfirmReset} title="Erase everything?">
        <p className="px-6 pt-2 text-[15px] leading-relaxed text-ink-soft">
          This deletes every task, routine, reward and all your history on this computer. It can’t be undone. Export a backup
          first if you might want any of it back.
        </p>
        <div className="flex flex-wrap gap-3 px-6 pt-6 pb-6">
          <Button
            className="bg-oxblood text-white hover:bg-oxblood hover:opacity-90"
            onClick={async () => {
              await resetAll()
              setConfirmReset(false)
              toast('Erased. Starting fresh.')
            }}
          >
            Erase everything
          </Button>
          <Button variant="quiet" onClick={() => setConfirmReset(false)}>
            Keep my data
          </Button>
        </div>
      </Modal>
    </div>
  )
}

function Group({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="mt-12 border-t border-line pt-6">
      <h2 className="font-display text-[26px] leading-tight tracking-[-0.02em]">{title}</h2>
      {note && <p className="mt-1 max-w-[60ch] text-[14.5px] text-ink-faint">{note}</p>}
      <div className="mt-5 grid gap-6">{children}</div>
    </section>
  )
}

function Row({ label, hint, children, htmlFor }: { label: string; hint?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3">
      <div className="max-w-[40ch]">
        <label htmlFor={htmlFor} className="block text-[15.5px] font-semibold">
          {label}
        </label>
        {hint && <p className="text-[13.5px] text-ink-faint">{hint}</p>}
      </div>
      {children}
    </div>
  )
}
