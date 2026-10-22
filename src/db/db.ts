import Dexie, { type Table } from 'dexie'
import type { Completion, Override, Redemption, RewardRule, Settings, Task } from '../lib/types'

export const DEFAULT_SETTINGS: Settings = {
  weekStart: 1,
  rolloverHour: 0,
  areas: [
    { id: 'faith', name: 'Faith' },
    { id: 'self-care', name: 'Self-care' },
    { id: 'health', name: 'Health' },
    { id: 'work', name: 'Work' },
    { id: 'home', name: 'Home' },
  ],
}

class PlannerDB extends Dexie {
  tasks!: Table<Task, string>
  completions!: Table<Completion, string>
  overrides!: Table<Override, string>
  rewards!: Table<RewardRule, string>
  redemptions!: Table<Redemption, string>
  kv!: Table<{ key: string; value: unknown }, string>

  constructor() {
    super('daily-schedule-mapper')
    this.version(1).stores({
      tasks: 'id, createdAt',
      completions: 'id, taskId, date',
      overrides: 'id, taskId, date',
      rewards: 'id',
      redemptions: 'id, ruleId, periodStart',
      kv: 'key',
    })
  }
}

export const db = new PlannerDB()

export const uid = () => crypto.randomUUID()

export async function getSettings(): Promise<Settings> {
  const row = await db.kv.get('settings')
  return { ...DEFAULT_SETTINGS, ...(row?.value as Partial<Settings> | undefined) }
}

export async function saveSettings(patch: Partial<Settings>) {
  const current = await getSettings()
  await db.kv.put({ key: 'settings', value: { ...current, ...patch } })
}
