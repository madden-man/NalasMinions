// Publish the Japan checklist as chores: `npm run seed:japan`.
//
// Every entry in scripts/japan-tasks.cjs becomes one document in
// tommy-data.nalas-minions with project 'japan', linked to its checklist item
// on /japan (#item-<item>), due at 9:00 AM on its day with a reminder the day
// before. Ids are stable, so a re-run upserts: text, due date, notes and link
// refresh, while a chore already checked off stays done. It never deletes.

const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const mongo = require('../electron/mongo.cjs')
const { JAPAN_TASKS } = require('./japan-tasks.cjs')

const DUE_TIME = '09:00'
const ASSIGNEE = process.env.JAPAN_ASSIGNEE || 'Tommy'

async function main() {
  if (!mongo.isEnabled()) {
    console.error('MONGODB_URI is not set — see .env.example')
    process.exitCode = 1
    return
  }
  const { sectionFor } = await import('../src/links.js')
  const existing = new Map((await mongo.loadTasks()).map((t) => [t.id, t]))
  let added = 0
  let updated = 0
  // Seed in reverse so the first checklist item ends up on top (addTask prepends).
  for (const t of [...JAPAN_TASKS].reverse()) {
    const prior = existing.get(t.id)
    const section = sectionFor(t.item.startsWith('kumano-') ? '/japan#safety' : '/japan#checklist')
    await mongo.addTask({
      id: t.id,
      text: t.text,
      done: prior ? !!prior.done : false,
      completedAt: prior ? prior.completedAt ?? null : null,
      recurrence: 'once',
      assignee: prior?.assignee || ASSIGNEE,
      dueAt: `${t.due}T${DUE_TIME}`,
      remindDaysBefore: 1,
      project: 'japan',
      notes: t.notes,
      link: { href: `/japan#item-${t.item}`, label: section.label },
    })
    if (prior) updated++
    else added++
  }
  console.log(`Seeded ${JAPAN_TASKS.length} Japan tasks (${added} new, ${updated} updated).`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => mongo.close())
