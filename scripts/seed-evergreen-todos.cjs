// Publish the Evergreen emergency prep tasks as chores: `npm run seed:evergreen`.
//
// Every dated entry in scripts/evergreen-tasks.cjs becomes one document in
// tommy-data.nalas-minions, due at 9:00 AM on its day with a reminder the day
// before. Habits (due: null — Red Flag days, every hike) stay on the page only.
// Ids are stable ("evergreen-<id>") so a re-run upserts: text, due date, and
// notes refresh, while a chore already checked off stays done. It never
// deletes — retiring a task means deleting its document, not just dropping it
// from the file.

const path = require('path')
// Load MONGODB_URI from .env before anything reads process.env.
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const mongo = require('../electron/mongo.cjs')
const { AREAS, EVERGREEN_TASKS } = require('./evergreen-tasks.cjs')

const DUE_TIME = '09:00'
const ASSIGNEE = process.env.EVERGREEN_ASSIGNEE || 'Tommy'

// Chores are plain text: keep a link's label, drop its URL.
const plain = (s) => s.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')

async function main() {
  if (!mongo.isEnabled()) {
    console.error('MONGODB_URI is not set — see .env.example')
    process.exitCode = 1
    return
  }
  // src/links.js is an ES module (the app shares it), hence the dynamic import.
  const { sectionFor } = await import('../src/links.js')
  const areas = new Map(AREAS.map((a) => [a.key, a]))
  const dated = EVERGREEN_TASKS.filter((t) => t.due)
  const existing = new Map((await mongo.loadTasks()).map((t) => [t.id, t]))
  let added = 0
  let updated = 0
  // Seed in reverse so the earliest task ends up on top (addTask prepends).
  for (const t of [...dated].sort((a, b) => b.due.localeCompare(a.due))) {
    const id = `evergreen-${t.id}`
    const prior = existing.get(id)
    const area = areas.get(t.area)
    const section = sectionFor(`/evergreen#area-${t.area}`)
    const notes = [plain(t.text), t.repeats && `Repeats ${t.repeats}; re-date it after you tick it off.`]
      .filter(Boolean)
      .join('\n\n')
    await mongo.addTask({
      id,
      text: `${area.emoji} ${t.short}`,
      done: prior ? !!prior.done : false,
      completedAt: prior ? prior.completedAt ?? null : null,
      recurrence: t.recurrence || 'once',
      assignee: prior?.assignee || ASSIGNEE,
      dueAt: `${t.due}T${DUE_TIME}`,
      remindDaysBefore: 1,
      project: 'evergreen',
      workstream: area.name,
      notes,
      // The how-to for it when there is one, else its own row on the page
      // (labelled with its area's section).
      link: t.guide
        ? { href: `/evergreen#${t.guide}`, label: sectionFor(`/evergreen#${t.guide}`).label }
        : { href: `/evergreen#task-${t.id}`, label: section.label },
    })
    if (prior) updated++
    else added++
  }
  console.log(`Seeded ${dated.length} Evergreen tasks (${added} new, ${updated} updated); ${EVERGREEN_TASKS.length - dated.length} habits stay on the page.`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => mongo.close())
