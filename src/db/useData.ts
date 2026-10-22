import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useState } from 'react'
import { todayStr } from '../lib/dates'
import { indexCompletions, indexOverrides, type CompletionIndex, type OverrideIndex } from '../lib/recurrence'
import type { Completion, Redemption, RewardRule, Settings, Task } from '../lib/types'
import { db, getSettings } from './db'

export interface Data {
  tasks: Task[]
  completions: Completion[]
  log: CompletionIndex
  overrides: OverrideIndex
  rewards: RewardRule[]
  redemptions: Redemption[]
  settings: Settings
  today: string
}

/**
 * Everything the app shows, kept live from IndexedDB. A year of daily use is a few
 * thousand rows, so it's simplest to hold it all and derive views in memory.
 */
export function useData(): Data | undefined {
  const tasks = useLiveQuery(() => db.tasks.orderBy('createdAt').toArray())
  const completions = useLiveQuery(() => db.completions.toArray())
  const overrides = useLiveQuery(() => db.overrides.toArray())
  const rewards = useLiveQuery(() => db.rewards.toArray())
  const redemptions = useLiveQuery(() => db.redemptions.toArray())
  const settings = useLiveQuery(() => getSettings())
  const today = useToday(settings?.rolloverHour ?? 0)

  return useMemo(() => {
    if (!tasks || !completions || !overrides || !rewards || !redemptions || !settings) return undefined
    return {
      tasks,
      completions,
      log: indexCompletions(completions),
      overrides: indexOverrides(overrides),
      rewards,
      redemptions,
      settings,
      today,
    }
  }, [tasks, completions, overrides, rewards, redemptions, settings, today])
}

/** Today's date, refreshed when the day turns over while the app is open. */
export function useToday(rolloverHour: number) {
  const [today, setToday] = useState(() => todayStr(rolloverHour))
  useEffect(() => {
    const tick = () => setToday(todayStr(rolloverHour))
    tick()
    const id = setInterval(tick, 30_000)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [rolloverHour])
  return today
}

/** Current minute of the day, for the dial's hand. */
export function useNowMinute() {
  const get = () => {
    const d = new Date()
    return d.getHours() * 60 + d.getMinutes()
  }
  const [min, setMin] = useState(get)
  useEffect(() => {
    const id = setInterval(() => setMin(get()), 20_000)
    return () => clearInterval(id)
  }, [])
  return min
}
