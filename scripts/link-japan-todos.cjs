// Point the hand-made Japan chores at their item on /japan: `npm run link:japan`.
//
// The "Japan: …" chores in tommy-data.nalas-minions were added by hand, so they
// have no project field and no link. Each one mirrors a Pre-Trip Checklist
// item on public/japan.html (anchored as #item-<checklist id>); this stamps
// `link` and `project: 'japan'` on them, keyed by the chore's stored id so a
// renamed chore still gets the right item. Everything else on the chore is
// left alone, and chores not in the map are untouched. Safe to re-run.

const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const mongo = require('../electron/mongo.cjs')

// chore id -> checklist item id on /japan
const JAPAN_ITEMS = {
  1788481127023: 'ghibli-tickets',
  1788481299463: 'teamlab-planets',
  1788481347599: 'shibuya-sky',
  1788481374598: 'teamlab-osaka',
  1788481377599: 'restaurant-reservations',
  1788481434598: 'kyoto-tea-ceremony',
  1788481465609: 'cup-noodles-workshop',
  1788481564612: 'verify-kyoto-lightups',
  1788481567612: 'transport-passes-seats',
  1788481914608: 'print-kumano-voucher',
  1788495874655: 'visit-japan-web',
  1788495877654: 'medication-check',
  1788495889651: 'travel-insurance',
  1788495892654: 'esim-wifi',
  1788495904654: 'trail-cash',
  1788495907654: 'no-fx-cards',
  1788495918655: 'ito-credit-check',
  1788495921652: 'park-hyatt-cancel-date',
  1788495932655: 'packing-hiking-gear',
  1788495935654: 'packing-battery-adapter',
  1788495946655: 'packing-copies',
  1788495949655: 'home-logistics',
}

async function main() {
  if (!mongo.isEnabled()) {
    console.error('MONGODB_URI is not set — see .env.example')
    process.exitCode = 1
    return
  }
  const { sectionFor } = await import('../src/links.js')
  const checklist = sectionFor('/japan#checklist')
  const tasks = await mongo.loadTasks()
  let linked = 0
  const next = tasks.map((t) => {
    const item = JAPAN_ITEMS[t.id]
    if (!item) return t
    linked++
    return { ...t, project: 'japan', link: { href: `/japan#item-${item}`, label: checklist.label } }
  })
  // Whole-array save, the same write the app does on every change: order is
  // preserved and nothing is dropped, since every loaded task is passed back.
  await mongo.saveTasks(next)
  console.log(`Linked ${linked} Japan chores to /japan (${tasks.length} tasks total).`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => mongo.close())
