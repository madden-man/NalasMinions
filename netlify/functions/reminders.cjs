// Scheduled Netlify Function: keeps each chore's next reminder queued in ntfy.
//
// Runs hourly (see the schedule in netlify.toml). ntfy fires the actual push at
// the exact due time via its `At` delivery, so this only needs to run often
// enough to keep the next occurrence queued — recurring chores get a fresh
// reminder each period as their occurrence advances. Idempotent: a per-task
// marker in the `meta` collection records the scheduled occurrence, so re-runs
// don't double-send.
//
// Requires MONGODB_URI and NTFY_TOPIC in the Netlify environment; REMINDER_TZ is
// optional (defaults to the household zone in server/schedule.cjs).

const mongo = require('../../electron/mongo.cjs')
const { notify } = require('../../server/notify.cjs')
const { ensureReminderScheduled } = require('../../server/schedule.cjs')

const getMarker = (taskId) => mongo.getMeta(`reminder:${taskId}`)
const setMarker = (taskId, value) => mongo.setMeta(`reminder:${taskId}`, value)

exports.handler = async () => {
  if (!mongo.isEnabled()) {
    return { statusCode: 200, body: 'MONGODB_URI not set; nothing to do' }
  }

  const now = Date.now()
  let scheduled = 0
  let tasks = []
  try {
    tasks = await mongo.loadTasks()
    for (const task of tasks) {
      try {
        const at = await ensureReminderScheduled(task, { nowMs: now, notify, getMarker, setMarker })
        if (at) {
          scheduled++
          console.log(`[reminders] queued "${task.text}" for ${at}`)
        }
      } catch (err) {
        console.error(`[reminders] ${task.id} (${task.text}):`, err.message)
      }
    }
  } catch (err) {
    console.error('[reminders] sweep failed:', err.message)
    return { statusCode: 500, body: err.message }
  }

  console.log(`[reminders] swept ${tasks.length} tasks, queued ${scheduled} new reminder(s)`)
  return { statusCode: 200, body: JSON.stringify({ tasks: tasks.length, scheduled }) }
}
