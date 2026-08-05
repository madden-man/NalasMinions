// MongoDB persistence for the Electron main process.
//
// The MongoDB driver needs Node (TCP sockets, DNS SRV lookups), so it can only
// live in the main process — never the renderer or a plain browser build. The
// renderer reaches these helpers over the async IPC bridge in preload.cjs.
//
// Connection string comes from the MONGODB_URI env var (loaded from .env by
// main.cjs); the database is fixed to "tommy-data". Tasks are stored one
// document per task in the "nalas-minions" collection, the weekly menu's meals
// (ingredients + recipe steps) one document per meal in "nalas-menu", and small
// key/value app state (e.g. the daily-reset date) lives in "meta". The menu
// also reads (never writes) the shared "recipes" collection — a sibling
// project's dinner library, mapped in server/recipe-library.cjs.

const { MongoClient } = require('mongodb')
const {
  RECIPES,
  LIBRARY_SORT,
  mealFromRecipe,
  recipeUrlsFor,
} = require('../server/recipe-library.cjs')

const DB_NAME = 'tommy-data'
const TASKS = 'nalas-minions'
const MEALS = 'nalas-menu'
const META = 'meta'
// Ingredients read off recipe links, cached by URL. This app's own collection —
// the library it reads them for (RECIPES) stays untouched.
const INGREDIENTS = 'nalas-menu-ingredients'

let clientPromise // cached connection, created on first use

function isEnabled() {
  return Boolean(process.env.MONGODB_URI)
}

// Lazily connect once and reuse the client. A short server-selection timeout
// keeps the app from hanging when Atlas is unreachable — callers treat a
// rejection as "offline" and fall back to the local cache.
function getDb() {
  if (!isEnabled()) {
    return Promise.reject(new Error('MONGODB_URI is not set'))
  }
  if (!clientPromise) {
    const client = new MongoClient(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      appName: 'nalas-minion-todo',
    })
    clientPromise = client.connect().catch((err) => {
      clientPromise = undefined // allow a later retry
      throw err
    })
  }
  return clientPromise.then((client) => client.db(DB_NAME))
}

async function loadTasks() {
  const db = await getDb()
  const docs = await db.collection(TASKS).find({}).sort({ order: 1 }).toArray()
  // Map _id -> id and drop the internal ordering/timestamp fields; everything
  // else the renderer stored (text, done, recurrence, assignee, …) round-trips.
  return docs.map(({ _id, order, updatedAt, ...rest }) => ({ id: _id, ...rest }))
}

// Upsert a single new task at the top of the list. Used when the "Add chore"
// modal is completed, so the new chore is written to tommy-data.nalas-minions
// immediately as one document (rather than re-syncing the whole array). New
// tasks sort first, so give it an order just below the current minimum; the
// next full saveTasks() renormalizes order across the list. Upsert (rather than
// insert) keeps a retry from failing on a duplicate _id.
async function addTask(task) {
  const db = await getDb()
  const col = db.collection(TASKS)
  const { id, ...rest } = task
  const [first] = await col
    .find({}, { projection: { order: 1 } })
    .sort({ order: 1 })
    .limit(1)
    .toArray()
  const order = (first?.order ?? 0) - 1
  await col.replaceOne(
    { _id: id },
    { _id: id, ...rest, done: !!rest.done, order, updatedAt: new Date() },
    { upsert: true },
  )
}

// Mirror the renderer's task array into the collection: upsert every current
// task (preserving order) and drop any documents that no longer exist. Whole-
// array semantics match how the UI thinks about its state, and the dataset is
// tiny, so this stays simple and correct.
async function saveTasks(tasks) {
  const db = await getDb()
  const col = db.collection(TASKS)
  const ids = tasks.map((t) => t.id)

  if (tasks.length) {
    await col.bulkWrite(
      tasks.map(({ id, ...rest }, i) => ({
        replaceOne: {
          filter: { _id: id },
          // Persist every field the renderer holds (text, done, recurrence,
          // assignee, …), plus order and a write timestamp.
          replacement: { _id: id, ...rest, done: !!rest.done, order: i, updatedAt: new Date() },
          upsert: true,
        },
      })),
    )
  }
  await col.deleteMany({ _id: { $nin: ids } })
}

// The weekly menu, in the order it should be shown: this app's own meals from
// nalas-menu first, then the shared recipe library (tommy-data.recipes — see
// server/recipe-library.cjs), which always sorts last and always reads as
// unverified. Same _id -> id mapping as loadTasks: the renderer sees plain
// meals ({ id, name, description, verified, ingredients, options?, steps }) and
// never the storage fields.
async function loadMeals() {
  const db = await getDb()
  const [ours, library, pulls] = await Promise.all([
    db.collection(MEALS).find({}).sort({ order: 1 }).toArray(),
    // The library belongs to another project. If it's missing or unreadable,
    // the household menu still loads — it just shows without the extras.
    db
      .collection(RECIPES)
      .find({})
      .sort(LIBRARY_SORT)
      .toArray()
      .catch((err) => {
        console.warn('[mongo] recipe library unavailable:', err.message)
        return []
      }),
    // Ingredients previously read off the recipe links. A cold cache is not an
    // error — every dish just falls back to its `produce`.
    db
      .collection(INGREDIENTS)
      .find({})
      .toArray()
      .catch((err) => {
        console.warn('[mongo] ingredient cache unavailable:', err.message)
        return []
      }),
  ])

  // Keyed by URL, not by dish: two dishes that link the same recipe share one
  // fetch, and a re-pointed link misses the cache instead of reading a stale
  // list for the page it no longer points at.
  const byUrl = new Map(pulls.map((p) => [p._id, p]))

  return [
    ...ours.map(({ _id, order, updatedAt, ...rest }) => ({
      id: _id,
      ...rest,
      verified: !!rest.verified,
    })),
    // Whichever of the dish's links was the one that answered.
    ...library.map((doc) => mealFromRecipe(doc, recipeUrlsFor(doc).map((u) => byUrl.get(u)).find(Boolean))),
  ]
}

// Remember the ingredients read off a recipe link, so the menu doesn't refetch
// the page on every load. Keyed by the URL they came from.
async function saveIngredients({ url, name, ingredients, steps = [], shopping }) {
  const db = await getDb()
  await db.collection(INGREDIENTS).replaceOne(
    { _id: url },
    { _id: url, name, ingredients, steps, shopping, fetchedAt: new Date() },
    { upsert: true },
  )
  return { url, name, ingredients, steps, shopping }
}

// Every cached pull, for the backfill script's "what's still missing" pass.
async function loadIngredients() {
  const db = await getDb()
  return db.collection(INGREDIENTS).find({}).toArray()
}

// The raw library documents, so the backfill script can work out each dish's
// recipe URL without going through the meal mapping.
async function loadRecipeDocs() {
  const db = await getDb()
  return db.collection(RECIPES).find({}).sort(LIBRARY_SORT).toArray()
}

// Add one meal to the end of the menu (the "Add recipe" box on /menu). The id
// comes from the recipe's name, so two recipes with the same title would
// collide — suffix it instead of overwriting the meal that's already there.
// Returns the stored meal, id and all, for the caller to show.
async function addMeal(meal) {
  const db = await getDb()
  const col = db.collection(MEALS)
  const { id, ...rest } = meal

  let uniqueId = id
  for (let n = 2; await col.findOne({ _id: uniqueId }, { projection: { _id: 1 } }); n += 1) {
    uniqueId = `${id}-${n}`
  }

  const [last] = await col
    .find({}, { projection: { order: 1 } })
    .sort({ order: -1 })
    .limit(1)
    .toArray()
  const order = (last?.order ?? -1) + 1

  await col.insertOne({
    _id: uniqueId,
    ...rest,
    verified: !!rest.verified,
    order,
    updatedAt: new Date(),
  })
  return { id: uniqueId, ...rest, verified: !!rest.verified }
}

// Publish a curated meal catalog into the collection: upsert every meal in it,
// keeping the given order. Used by the seeder (scripts/seed-meals.cjs).
//
// Deliberately additive — recipes added from the app live in this collection
// too, and they must survive a re-seed. Removing a meal is a delete against the
// collection, not an edit to the seed file.
async function saveMeals(meals) {
  if (!meals.length) return
  const db = await getDb()
  const col = db.collection(MEALS)

  await col.bulkWrite(
    meals.map(({ id, ...rest }, i) => ({
      replaceOne: {
        filter: { _id: id },
        // `verified` is normalized to a real boolean (like a task's `done`), so
        // an unverified meal reads as false rather than a missing field.
        replacement: {
          _id: id,
          ...rest,
          verified: !!rest.verified,
          order: i,
          updatedAt: new Date(),
        },
        upsert: true,
      },
    })),
  )
}

async function getMeta(key) {
  const db = await getDb()
  const doc = await db.collection(META).findOne({ _id: key })
  return doc ? doc.value : null
}

async function setMeta(key, value) {
  const db = await getDb()
  await db
    .collection(META)
    .updateOne({ _id: key }, { $set: { value } }, { upsert: true })
}

async function close() {
  if (!clientPromise) return
  const pending = clientPromise
  clientPromise = undefined
  try {
    const client = await pending
    await client.close()
  } catch {
    /* already failed to connect; nothing to close */
  }
}

module.exports = {
  isEnabled,
  loadTasks,
  addTask,
  saveTasks,
  loadMeals,
  addMeal,
  saveMeals,
  saveIngredients,
  loadIngredients,
  loadRecipeDocs,
  getMeta,
  setMeta,
  close,
}
