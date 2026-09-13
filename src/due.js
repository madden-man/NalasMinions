// When a chore belongs on a day's list.
//
// Pure and framework-free so it can be unit-tested (test/due.test.mjs) and
// shared by the UI (App.jsx). Two questions live here: is a chore *due* on a
// given day (its schedule lands there), and is it *overdue* (an occurrence
// came and went without it being checked off) — overdue chores stay on the
// Today list until they're done instead of silently disappearing.

import { occurrenceBucket } from './renew.js'

const DAY_MS = 24 * 60 * 60 * 1000

export const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
export const sameDay = (a, b) => startOfDay(a).getTime() === startOfDay(b).getTime()
const weeksBetween = (a, b) =>
  Math.floor(Math.abs(startOfDay(b) - startOfDay(a)) / (7 * DAY_MS))

// The date a task's schedule is anchored to: its explicit due date if set,
// otherwise the creation time encoded in its numeric id. null when neither is
// available (e.g. the legacy seed tasks), which callers treat as "always due".
export function taskAnchor(task) {
  if (task.dueAt) {
    const d = new Date(task.dueAt)
    if (!Number.isNaN(d.getTime())) return d
  }
  const n = Number(task.id)
  if (Number.isFinite(n) && n > 1e12) return new Date(n)
  return null
}

// Whether a task's schedule lands on a given day. Daily chores always do; the
// other cadences match the weekday / day-of-month of the task's anchor date; a
// one-off shows only on its due day (or always, if it never got a due date).
export function isDueOn(task, date = new Date()) {
  const rec = task.recurrence || 'once'
  if (rec === 'daily') return true
  const anchor = taskAnchor(task)
  if (!anchor) return true
  switch (rec) {
    case 'weekly':
      return anchor.getDay() === date.getDay()
    case 'biweekly':
      return anchor.getDay() === date.getDay() && weeksBetween(anchor, date) % 2 === 0
    case 'monthly':
      return anchor.getDate() === date.getDate()
    case 'once':
    default:
      return task.dueAt ? sameDay(anchor, date) : true
  }
}

// How far back to look for a recurring chore's most recent occurrence. A
// monthly chore anchored to the 31st can skip a short month, hence two months.
const LOOKBACK_DAYS = { weekly: 7, biweekly: 14, monthly: 62 }

// Whether an unfinished chore has missed an occurrence as of `now`:
//
// - A one-off with a due date is overdue once that day has passed.
// - A recurring chore is overdue when its latest occurrence fell on an earlier
//   day within the *current renewal period* (see occurrenceBucket). Renewal
//   un-checks a done chore only when the period rolls over, so inside one
//   period "not done" means "not done since that occurrence". Once the period
//   rolls over the chore is simply waiting for its next occurrence, not late.
// - Daily chores and chores without a schedule are never overdue: they're on
//   every day's list already.
export function isOverdue(task, now = new Date()) {
  if (task.done) return false
  const rec = task.recurrence || 'once'
  if (rec === 'daily') return false
  const anchor = taskAnchor(task)
  if (!anchor) return false
  const today = startOfDay(now)
  if (rec === 'once') return Boolean(task.dueAt) && startOfDay(anchor) < today
  const lookback = LOOKBACK_DAYS[rec]
  if (!lookback) return false
  const bucket = occurrenceBucket(rec, today)
  const first = startOfDay(anchor)
  for (let back = 1; back <= lookback; back++) {
    const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() - back)
    if (day < first) return false
    if (isDueOn(task, day)) return occurrenceBucket(rec, day) === bucket
  }
  return false
}

// Whether a chore belongs on the list for `date`: it's due that day, or —
// when `date` is today — it's overdue and still needs doing. Overdue chores
// only carry onto today's list; past and future days show just what was
// actually scheduled.
export function isListedOn(task, date = new Date(), now = new Date()) {
  if (isDueOn(task, date)) return true
  return sameDay(date, now) && isOverdue(task, now)
}
