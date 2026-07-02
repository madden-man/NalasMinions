// Per-recurrence renewal of completed chores.
//
// A completed recurring chore should un-check itself ("renew") once its schedule
// rolls over to a fresh occurrence — daily each calendar day, weekly every week,
// and so on — while one-time chores stay done. This is pure and framework-free
// so it can be unit-tested (test/renew.test.mjs) and shared by the UI (App.jsx).

const DAY_MS = 86400000
// Timezone-safe index of a date's local calendar day (days since the epoch).
const dayIndex = (d) => Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY_MS)

// A string identifying the occurrence "bucket" a task's recurrence falls into on
// a given date. When a completed chore's bucket differs from the current one, its
// schedule has rolled over to a fresh occurrence and it should un-check itself
// ("renew"). One-time chores share a single constant bucket, so once done they
// never renew.
export function occurrenceBucket(recurrence, date) {
  // Offset by 4 so week/biweek buckets start on Monday (epoch day 4,
  // 1970-01-05, was a Monday) rather than the epoch's Thursday.
  const day = dayIndex(date)
  switch (recurrence) {
    case 'daily':
      return `d${day}`
    case 'weekly':
      return `w${Math.floor((day - 4) / 7)}`
    case 'biweekly':
      return `b${Math.floor((day - 4) / 14)}`
    case 'monthly':
      return `m${date.getFullYear()}-${date.getMonth()}`
    case 'once':
    default:
      return 'once'
  }
}

// Un-check ("renew") any completed *recurring* chore finished in an earlier
// occurrence than now — daily each calendar day, weekly every 7 days, and so on.
// One-time chores keep their checked state. Returns the same array reference when
// nothing changed, so callers can skip a needless save/re-render.
export function renewTasks(tasks, now = new Date()) {
  let changed = false
  const next = tasks.map((task) => {
    if (!task.done) return task
    const recurrence = task.recurrence || 'once'
    if (recurrence === 'once') return task
    const completedBucket = task.completedAt
      ? occurrenceBucket(recurrence, new Date(task.completedAt))
      : null
    if (completedBucket === occurrenceBucket(recurrence, now)) return task
    changed = true
    return { ...task, done: false, completedAt: null }
  })
  return changed ? next : tasks
}
