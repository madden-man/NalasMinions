// Publish the moving plan's tasks as chores: `npm run seed:moving`.
//
// Every entry in scripts/moving-tasks.cjs becomes one document in
// tommy-data.nalas-minions, due at 9:00 AM on its day with a reminder the day
// before (remindDaysBefore: 1, honored by server/schedule.cjs). Ids are stable
// ("moving-<id>") so a re-run upserts: text, due date, and notes refresh, while
// a chore already checked off stays done. It never deletes — retiring a task
// means deleting its document, not just dropping it from the file.
//
// The hourly Netlify sweep (netlify/functions/reminders.cjs) queues each
// reminder as its day-before slot comes inside the two-day horizon, so nothing
// needs to be pushed from here.

const path = require('path')
// Load MONGODB_URI from .env before anything reads process.env.
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const mongo = require('../electron/mongo.cjs')
const { MOVING_TASKS, MOVING_SECTIONS } = require('./moving-tasks.cjs')

const DUE_TIME = '09:00'
const ASSIGNEE = process.env.MOVING_ASSIGNEE || 'Tommy'

async function main() {
  if (!mongo.isEnabled()) {
    console.error('MONGODB_URI is not set — see .env.example')
    process.exitCode = 1
    return
  }
  // src/links.js is an ES module (the app shares it), hence the dynamic import.
  const { sectionFor } = await import('../src/links.js')
  // Each chore links back to its context on /moving: the section that holds
  // its details when it has one, else its own row in the week-by-week plan.
  const linkFor = (t) => {
    const section = MOVING_SECTIONS[t.id] && sectionFor(`/moving#${MOVING_SECTIONS[t.id]}`)
    if (section) return { href: section.href, label: section.label }
    return { href: `/moving#chk-${t.id}`, label: sectionFor('/moving#plan').label }
  }
  const existing = new Map((await mongo.loadTasks()).map((t) => [t.id, t]))
  let added = 0
  let updated = 0
  // Seed in reverse so the earliest task ends up on top (addTask prepends).
  for (const t of [...MOVING_TASKS].reverse()) {
    const id = `moving-${t.id}`
    const prior = existing.get(id)
    await mongo.addTask({
      id,
      text: t.text,
      done: prior ? !!prior.done : false,
      completedAt: prior ? prior.completedAt ?? null : null,
      recurrence: 'once',
      assignee: prior?.assignee || ASSIGNEE,
      dueAt: `${t.due}T${DUE_TIME}`,
      remindDaysBefore: 1,
      project: 'moving',
      workstream: t.workstream,
      notes: t.notes,
      link: linkFor(t),
    })
    if (prior) updated++
    else added++
  }
  console.log(`Seeded ${MOVING_TASKS.length} moving tasks (${added} new, ${updated} updated).`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => mongo.close())
