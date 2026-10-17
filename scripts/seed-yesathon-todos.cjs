// Publish the Yes-a-thon food plan's cooking cues as chores: `npm run seed:yesathon`.
//
// Every entry in scripts/yesathon-tasks.cjs becomes one document in
// tommy-data.nalas-minions, due at its own time with the reminder at that time
// (remindDaysBefore: 0). Ids are stable ("yesathon-<id>") so a re-run upserts:
// text, time, and notes refresh, while a chore already checked off stays done.
// It never deletes — retiring a task means deleting its document.

const path = require('path')
// Load MONGODB_URI from .env before anything reads process.env.
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const mongo = require('../electron/mongo.cjs')
const { YESATHON_TASKS } = require('./yesathon-tasks.cjs')

const ASSIGNEE = process.env.YESATHON_ASSIGNEE || 'Tommy'

async function main() {
  if (!mongo.isEnabled()) {
    console.error('MONGODB_URI is not set — see .env.example')
    process.exitCode = 1
    return
  }
  // src/links.js is an ES module (the app shares it), hence the dynamic import.
  const { sectionFor } = await import('../src/links.js')
  const existing = new Map((await mongo.loadTasks()).map((t) => [t.id, t]))
  let added = 0
  let updated = 0
  // Seed in reverse so the earliest task ends up on top (addTask prepends).
  for (const t of [...YESATHON_TASKS].reverse()) {
    const id = `yesathon-${t.id}`
    const prior = existing.get(id)
    const section = sectionFor(`/yesathon#${t.section}`)
    if (!section) throw new Error(`${id}: /yesathon#${t.section} is not a registered section`)
    await mongo.addTask({
      id,
      text: t.text,
      done: prior ? !!prior.done : false,
      completedAt: prior ? prior.completedAt ?? null : null,
      recurrence: 'once',
      assignee: prior?.assignee || ASSIGNEE,
      dueAt: t.at,
      remindDaysBefore: 0,
      project: 'yesathon',
      notes: t.notes,
      link: { href: section.href, label: section.label },
    })
    if (prior) updated++
    else added++
  }
  console.log(`Seeded ${YESATHON_TASKS.length} Yes-a-thon tasks (${added} new, ${updated} updated).`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => mongo.close())
