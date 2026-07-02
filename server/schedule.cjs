// Reminder scheduling for chores with a due time.
//
// ntfy delivers scheduled pushes precisely (via the `At` header) but only up to
// 3 days out and only once per message. So instead of scheduling every future
// occurrence, we keep just the *next* occurrence queued in ntfy and recompute it
// as time passes (from the hourly Netlify sweep, and immediately when a chore is
// added). Recurring chores therefore get a fresh reminder each period.
//
// dueAt is stored as a local wall-clock string ("YYYY-MM-DDTHH:mm") with no
// timezone, so we interpret it in REMINDER_TZ (defaults to the household zone)
// and convert to an absolute instant for ntfy.

const REMINDER_TZ = process.env.REMINDER_TZ || 'America/Denver'
// How far ahead we're willing to queue a reminder. Kept under ntfy.sh's 3-day
// cap and comfortably above the hourly sweep interval so nothing slips through.
const HORIZON_MS = 2 * 24 * 60 * 60 * 1000
const DAY_MS = 86400000

// --- timezone helpers ---------------------------------------------------------

// Offset (ms) of `tz` from UTC at a given instant, DST included.
function tzOffsetMs(utcMs, tz) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
  const p = {}
  for (const part of dtf.formatToParts(new Date(utcMs))) p[part.type] = part.value
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second)
  return asUTC - utcMs
}

// Convert a wall-clock time in `tz` to an absolute epoch (ms), correcting for the
// zone's offset (and re-checking once for DST boundaries).
function zonedWallToEpoch({ y, mo, d, hh, mi }, tz) {
  const guess = Date.UTC(y, mo - 1, d, hh, mi)
  let epoch = guess - tzOffsetMs(guess, tz)
  const off2 = tzOffsetMs(epoch, tz)
  if (off2 !== tzOffsetMs(guess, tz)) epoch = guess - off2
  return epoch
}

// The local calendar date (in `tz`) for an instant.
function localDateParts(utcMs, tz) {
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
  })
  const p = {}
  for (const part of dtf.formatToParts(new Date(utcMs))) p[part.type] = part.value
  return { y: +p.year, mo: +p.month, d: +p.day }
}

// --- recurrence ---------------------------------------------------------------

const dayIndex = ({ y, mo, d }) => Math.floor(Date.UTC(y, mo - 1, d) / DAY_MS)
const sameYMD = (a, b) => a.y === b.y && a.mo === b.mo && a.d === b.d

function addDays({ y, mo, d }, n) {
  const dt = new Date(Date.UTC(y, mo - 1, d) + n * DAY_MS)
  return { y: dt.getUTCFullYear(), mo: dt.getUTCMonth() + 1, d: dt.getUTCDate() }
}

// Whether a recurring chore anchored on `anchor` recurs on calendar date `date`.
function dueOnDate(recurrence, anchor, date) {
  switch (recurrence) {
    case 'daily':
      return true
    case 'weekly':
      return (dayIndex(date) - dayIndex(anchor)) % 7 === 0
    case 'biweekly':
      return (dayIndex(date) - dayIndex(anchor)) % 14 === 0
    case 'monthly':
      return date.d === anchor.d
    default:
      return false
  }
}

// The absolute time (epoch ms) of the next reminder for `task` that falls within
// the horizon, or null if there's nothing to schedule (no due time, a finished
// one-off, or the next occurrence is beyond the horizon).
function nextReminderEpoch(task, nowMs, tz = REMINDER_TZ) {
  if (!task || !task.dueAt) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(task.dueAt)
  if (!m) return null
  const anchor = { y: +m[1], mo: +m[2], d: +m[3], hh: +m[4], mi: +m[5] }
  const anchorEpoch = zonedWallToEpoch(anchor, tz)
  const recurrence = task.recurrence || 'once'

  if (recurrence === 'once') {
    if (task.done) return null
    return anchorEpoch > nowMs && anchorEpoch <= nowMs + HORIZON_MS ? anchorEpoch : null
  }

  // Recurring: walk forward from today until we find the next occurrence that is
  // in the future and on/after the chore's anchor, giving up past the horizon.
  const today = localDateParts(nowMs, tz)
  const completedDay =
    task.done && task.completedAt ? localDateParts(Date.parse(task.completedAt), tz) : null
  const maxOffset = Math.ceil(HORIZON_MS / DAY_MS) + 1
  for (let offset = 0; offset <= maxOffset; offset++) {
    const date = addDays(today, offset)
    const epoch = zonedWallToEpoch({ ...date, hh: anchor.hh, mi: anchor.mi }, tz)
    if (epoch <= nowMs || epoch < anchorEpoch) continue
    if (epoch > nowMs + HORIZON_MS) return null
    if (!dueOnDate(recurrence, anchor, date)) continue
    // Don't remind about an occurrence already completed on its day.
    if (completedDay && sameYMD(completedDay, date)) continue
    return epoch
  }
  return null
}

// --- orchestration ------------------------------------------------------------

// Ensure `task`'s next reminder is queued in ntfy. Idempotent: a per-task marker
// (stored via the injected getMarker/setMarker, backed by the `meta` collection)
// records which occurrence is already scheduled, so repeated sweeps don't
// re-send. Deps are injected to keep this usable from the Netlify sweep and the
// write endpoints, and testable. Returns the scheduled occurrence's ISO string,
// or null when nothing was (re)scheduled.
async function ensureReminderScheduled(
  task,
  { nowMs = Date.now(), tz, notify, cancelScheduled, getMarker, setMarker },
) {
  const epoch = nextReminderEpoch(task, nowMs, tz)
  const marker = await getMarker(task.id)
  // A queued push is still cancelable while its time is in the future.
  const pendingId = marker && marker.id && Date.parse(marker.at) > nowMs ? marker.id : null

  // Nothing to remind about anymore (finished one-off, due time removed, …):
  // drop any still-pending push and clear the marker.
  if (epoch == null) {
    if (pendingId) {
      if (cancelScheduled) await cancelScheduled(pendingId)
      await setMarker(task.id, null)
    }
    return null
  }

  const atISO = new Date(epoch).toISOString()
  if (marker && marker.at === atISO) return null // already queued for this occurrence

  // The occurrence moved (edited due time/recurrence, or rolled over) — cancel
  // the stale queued push before scheduling the new one.
  if (pendingId && cancelScheduled) await cancelScheduled(pendingId)

  // ntfy rejects delays under 10s, so anything essentially due now goes out
  // immediately instead of scheduled.
  const at = epoch - nowMs >= 10000 ? Math.floor(epoch / 1000) : undefined
  const who = task.assignee ? `${task.assignee}: ` : ''
  const id = await notify({
    source: "Nala's Minions",
    event: 'reminder',
    title: `Chore due: ${task.text}`,
    message: `${who}"${task.text}" is due.`,
    at,
  })

  await setMarker(task.id, { at: atISO, id: id || null })
  return atISO
}

module.exports = {
  REMINDER_TZ,
  HORIZON_MS,
  nextReminderEpoch,
  ensureReminderScheduled,
  // exported for tests
  zonedWallToEpoch,
  dueOnDate,
}
