// Publish the meal catalog to MongoDB: `npm run seed:meals`.
//
// The weekly menu reads its meals from tommy-data.nalas-menu, so this is how a
// curated recipe gets in front of the app: every meal in scripts/meals-data.cjs
// is upserted by id, keeping the file's order, so running it twice is harmless.
//
// It never deletes: recipes added from the app's "Add recipe" box live in the
// same collection and must survive a re-seed. Retiring a meal means deleting
// that document, not just dropping it from the file.

const path = require('path')
// Load MONGODB_URI from .env before anything reads process.env.
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const mongo = require('../electron/mongo.cjs')
const { MEALS } = require('./meals-data.cjs')
const { STORES, isStore } = require('../server/stores.cjs')

// A meal's `store` has to be one of the five the household shops at, or absent.
// Caught here rather than in the app, because a typo'd store silently becomes a
// chip nobody can shop from.
function checkStores(meals) {
  const bad = meals.filter((m) => m.store !== undefined && !isStore(m.store))
  if (!bad.length) return true
  console.error(`Unknown store on ${bad.length} meal(s) — must be one of: ${STORES.join(', ')}`)
  for (const m of bad) console.error(`  ${m.id}: ${JSON.stringify(m.store)}`)
  return false
}

async function main() {
  if (!mongo.isEnabled()) {
    console.error('MONGODB_URI is not set — see .env.example')
    process.exitCode = 1
    return
  }
  if (!checkStores(MEALS)) {
    process.exitCode = 1
    return
  }
  await mongo.saveMeals(MEALS)
  const stored = await mongo.loadMeals()
  console.log(`Seeded ${stored.length} meals into tommy-data.nalas-menu:`)
  for (const meal of stored) console.log(`  ${meal.id} — ${meal.name}`)
}

main()
  .catch((err) => {
    console.error('Seeding failed:', err.message)
    process.exitCode = 1
  })
  .finally(() => mongo.close())
