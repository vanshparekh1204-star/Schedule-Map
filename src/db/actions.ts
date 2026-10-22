import { addDays } from '../lib/dates'
import { occKey } from '../lib/recurrence'
import type { CompletionStatus, DateStr, Redemption, RewardRule, Task } from '../lib/types'
import { db, uid } from './db'

export async function saveTask(task: Task) {
  await db.tasks.put(task)
}

/** Removes a task and everything recorded against it. */
export async function deleteTask(id: string) {
  await db.transaction('rw', db.tasks, db.completions, db.overrides, async () => {
    await db.tasks.delete(id)
    await db.completions.where('taskId').equals(id).delete()
    await db.overrides.where('taskId').equals(id).delete()
  })
}

export async function restoreTask(task: Task, completions = [] as Awaited<ReturnType<typeof snapshotTask>>['completions']) {
  await db.transaction('rw', db.tasks, db.completions, async () => {
    await db.tasks.put(task)
    await db.completions.bulkPut(completions)
  })
}

export async function snapshotTask(id: string) {
  return {
    task: await db.tasks.get(id),
    completions: await db.completions.where('taskId').equals(id).toArray(),
  }
}

export async function setStatus(taskId: string, date: DateStr, status: CompletionStatus | 'open') {
  const id = occKey(taskId, date)
  if (status === 'open') await db.completions.delete(id)
  else await db.completions.put({ id, taskId, date, status, at: Date.now() })
}

export async function moveOccurrence(taskId: string, date: DateStr, time: string | null) {
  const id = occKey(taskId, date)
  if (time === null) await db.overrides.delete(id)
  else await db.overrides.put({ id, taskId, date, time })
}

/** Moves a one-off task to another day, clearing anything recorded on the old one. */
export async function rescheduleOnce(task: Task, date: DateStr) {
  await db.transaction('rw', db.tasks, db.completions, db.overrides, async () => {
    await db.completions.delete(occKey(task.id, task.schedule.start))
    await db.overrides.delete(occKey(task.id, task.schedule.start))
    await db.tasks.put({ ...task, schedule: { ...task.schedule, start: date } })
  })
}

export async function pauseTask(task: Task, from: DateStr) {
  await db.tasks.put({ ...task, pauses: [...task.pauses, { from }] })
}

export async function resumeTask(task: Task, today: DateStr) {
  const pauses = task.pauses
    .map((p) => (p.to ? p : { ...p, to: addDays(today, -1) }))
    // A pause started and ended on the same day never took effect.
    .filter((p) => !p.to || p.to >= p.from)
  await db.tasks.put({ ...task, pauses })
}

/** Ends a routine after `lastDay`. History up to then is kept. */
export async function endTask(task: Task, lastDay: DateStr) {
  await db.tasks.put({ ...task, schedule: { ...task.schedule, end: { type: 'until', date: lastDay } } })
}

export async function saveReward(rule: RewardRule) {
  await db.rewards.put(rule)
}

export async function deleteReward(id: string) {
  await db.transaction('rw', db.rewards, db.redemptions, async () => {
    await db.rewards.delete(id)
    await db.redemptions.where('ruleId').equals(id).delete()
  })
}

export async function redeem(ruleId: string, periodStart: DateStr): Promise<Redemption> {
  const r: Redemption = { id: uid(), ruleId, periodStart, at: Date.now() }
  await db.redemptions.add(r)
  return r
}

export async function unredeem(id: string) {
  await db.redemptions.delete(id)
}
