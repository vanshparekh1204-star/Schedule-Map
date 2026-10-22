import {
  deleteTask,
  endTask,
  moveOccurrence,
  pauseTask,
  rescheduleOnce,
  restoreTask,
  resumeTask,
  setStatus,
  snapshotTask,
} from '../db/actions'
import { addDays } from '../lib/dates'
import { fmtRelative } from '../lib/format'
import type { Occurrence } from '../lib/recurrence'
import type { DateStr, Task } from '../lib/types'
import { useUI } from '../state/ui'

const toast = (...args: Parameters<ReturnType<typeof useUI.getState>['toast']>) => useUI.getState().toast(...args)

export function toggleDone(o: Occurrence) {
  return setStatus(o.task.id, o.date, o.status === 'done' ? 'open' : 'done')
}

export async function skipOccurrence(o: Occurrence) {
  const before = o.status
  await setStatus(o.task.id, o.date, o.status === 'skipped' ? 'open' : 'skipped')
  if (before !== 'skipped') {
    toast(`Skipped ${o.task.title}. Streaks don’t break on a skip.`, {
      label: 'Undo',
      run: () => setStatus(o.task.id, o.date, before),
    })
  }
}

export async function moveTime(o: Occurrence, time: string | null) {
  await moveOccurrence(o.task.id, o.date, time)
}

export async function moveOnceTo(task: Task, date: DateStr, today: DateStr) {
  const from = task.schedule.start
  await rescheduleOnce(task, date)
  toast(`Moved ${task.title} to ${fmtRelative(date, today).toLowerCase()}.`, {
    label: 'Undo',
    run: () => rescheduleOnce({ ...task, schedule: { ...task.schedule, start: date } }, from),
  })
}

export async function removeTask(task: Task) {
  const snap = await snapshotTask(task.id)
  await deleteTask(task.id)
  toast(`Deleted ${task.title}.`, {
    label: 'Undo',
    run: () => snap.task && restoreTask(snap.task, snap.completions),
  })
}

export async function pause(task: Task, today: DateStr) {
  await pauseTask(task, today)
  toast(`Paused ${task.title}. It won’t appear until you resume it.`, { label: 'Undo', run: () => restoreTask(task) })
}

export async function resume(task: Task, today: DateStr) {
  await resumeTask(task, today)
  toast(`Resumed ${task.title}.`)
}

export async function endRoutine(task: Task, today: DateStr) {
  await endTask(task, addDays(today, -1))
  toast(`Ended ${task.title}. Its history stays in Insights.`, { label: 'Undo', run: () => restoreTask(task) })
}
