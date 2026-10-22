import { db, saveSettings } from './db'
import { fromLocalDate } from '../lib/dates'

const FORMAT = 'daily-schedule-mapper'
const VERSION = 1

export async function exportBackup() {
  const data = {
    format: FORMAT,
    version: VERSION,
    exportedAt: new Date().toISOString(),
    tasks: await db.tasks.toArray(),
    completions: await db.completions.toArray(),
    overrides: await db.overrides.toArray(),
    rewards: await db.rewards.toArray(),
    redemptions: await db.redemptions.toArray(),
    kv: await db.kv.toArray(),
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `day-dial-backup-${fromLocalDate(new Date())}.json`
  a.click()
  URL.revokeObjectURL(url)
  await saveSettings({ lastBackup: Date.now() })
}

export class BackupError extends Error {}

/** Replaces everything with the contents of a backup file. */
export async function importBackup(file: File) {
  let data: Record<string, unknown>
  try {
    data = JSON.parse(await file.text())
  } catch {
    throw new BackupError('That file isn’t valid JSON. Choose a backup exported from this app.')
  }
  if (data.format !== FORMAT) throw new BackupError('That file isn’t a Day Dial backup. Choose a file exported from Settings.')
  const tables = ['tasks', 'completions', 'overrides', 'rewards', 'redemptions', 'kv'] as const
  for (const t of tables) {
    if (!Array.isArray(data[t])) throw new BackupError(`The backup is missing its ${t} list, so nothing was changed.`)
  }
  await db.transaction('rw', [db.tasks, db.completions, db.overrides, db.rewards, db.redemptions, db.kv], async () => {
    for (const t of tables) {
      await db[t].clear()
      await (db[t] as typeof db.kv).bulkPut(data[t] as never[])
    }
  })
}

export async function resetAll() {
  await db.transaction('rw', [db.tasks, db.completions, db.overrides, db.rewards, db.redemptions, db.kv], async () => {
    await Promise.all([db.tasks, db.completions, db.overrides, db.rewards, db.redemptions, db.kv].map((t) => t.clear()))
  })
}
