// Publish the Japan packing list's chores: `npm run seed:japan-packing`.
//
// Every entry in scripts/japan-packing-tasks.cjs becomes one document in
// tommy-data.nalas-minions, linked to its section of /japan-packing. Ids are
// stable ("japan-packing-<id>") so a re-run upserts: text, time, and notes
// refresh, while a chore already checked off stays done. It never deletes.

const path = require('path')
// Load MONGODB_URI from .env before anything reads process.env.
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const mongo = require('../electron/mongo.cjs')
const { JAPAN_PACKING_TASKS } = require('./japan-packing-tasks.cjs')

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
  for (const t of [...JAPAN_PACKING_TASKS].reverse()) {
    const id = `japan-packing-${t.id}`
    const prior = existing.get(id)
    const section = sectionFor(`/japan-packing#${t.section}`)
    if (!section) throw new Error(`${id}: /japan-packing#${t.section} is not a registered section`)
    await mongo.addTask({
      id,
      text: t.text,
      done: prior ? !!prior.done : false,
      completedAt: prior ? prior.completedAt ?? null : null,
      recurrence: 'once',
      assignee: prior?.assignee || t.assignee,
      dueAt: t.due,
      remindDaysBefore: 1,
      project: 'japan-packing',
      notes: t.notes,
      link: { href: section.href, label: section.label },
    })
    if (prior) updated++
    else added++
  }
  console.log(`Seeded ${JAPAN_PACKING_TASKS.length} Japan packing tasks (${added} new, ${updated} updated).`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => mongo.close())
