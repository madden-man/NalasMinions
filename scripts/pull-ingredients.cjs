// Read every library dish's ingredients off its recipe link: `npm run pull:ingredients`.
//
// /menu shops a library dish from the ingredients published at its link rather
// than from the planner's short `produce` note (see server/ingredients.cjs).
// Fetching 100+ recipe pages while somebody waits for the page to render would
// be absurd, so the pulls are cached in tommy-data.nalas-menu-ingredients and
// this script is what fills that cache.
//
// Safe to re-run: dishes already cached are skipped unless --force is passed,
// and a page that can't be read is reported rather than cached, so the dish
// keeps falling back to `produce` and shows up again on the next run.
//
//   npm run pull:ingredients            # fill in what's missing
//   npm run pull:ingredients -- --force # re-read everything

const path = require('path')
// Load MONGODB_URI from .env before anything reads process.env.
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const mongo = require('../electron/mongo.cjs')
const { recipeUrlsFor } = require('../server/recipe-library.cjs')
const { pullIngredients } = require('../server/ingredients.cjs')

// Recipe sites are somebody else's servers: a few at a time, not 120 at once.
const CONCURRENCY = 4

async function main() {
  if (!mongo.isEnabled()) {
    console.error('MONGODB_URI is not set — see .env.example')
    process.exitCode = 1
    return
  }
  const force = process.argv.includes('--force')

  const [docs, cached] = await Promise.all([mongo.loadRecipeDocs(), mongo.loadIngredients()])
  const have = new Set(cached.map((c) => c._id))

  // One entry per dish still needing a read, carrying every link it could be
  // read from. A dish is done as soon as any of its links is already cached.
  const wanted = []
  const noLink = []
  for (const doc of docs) {
    const urls = recipeUrlsFor(doc)
    if (!urls.length) {
      noLink.push(doc.dish)
      continue
    }
    if (!force && urls.some((u) => have.has(u))) continue
    wanted.push({ dish: doc.dish, urls })
  }

  console.log(
    `${docs.length} library dishes | ${have.size} links cached | ${wanted.length} to read${force ? ' (forced)' : ''}`,
  )
  if (noLink.length) {
    console.warn(`\n${noLink.length} dishes have no link at all:`)
    for (const dish of noLink) console.warn(`  ${dish}`)
  }
  if (!wanted.length) {
    console.log('\nNothing to do.')
    return
  }

  const queue = [...wanted]
  const failures = []
  let done = 0

  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (queue.length) {
        const { dish, urls } = queue.shift()
        // Try each of the dish's links until one answers: the first is often
        // the main course, but it can also be the one that has gone dead.
        const tried = []
        let pulled = null
        for (const url of urls) {
          try {
            pulled = await pullIngredients(url)
            break
          } catch (err) {
            tried.push(`${url}\n      ${err.message}`)
          }
        }
        if (!pulled) {
          failures.push({ dish, tried })
          console.warn(`  --  ${dish}: none of its ${urls.length} link(s) could be read`)
          continue
        }
        await mongo.saveIngredients(pulled)
        done += 1
        console.log(
          `  ok  ${String(pulled.ingredients.length).padStart(2)} ingredients ` +
            `-> ${String(pulled.shopping.length).padStart(2)} to shop  ${dish}`,
        )
      }
    }),
  )

  console.log(`\nCached ${done} of ${wanted.length}.`)
  if (failures.length) {
    console.warn(`\n${failures.length} could not be read — those dishes still shop from produce:`)
    for (const f of failures) console.warn(`  ${f.dish}\n    ${f.tried.join('\n    ')}`)
    // A page being down is not a broken build; report it and move on.
  }
}

main()
  .catch((err) => {
    console.error('Pull failed:', err.message)
    process.exitCode = 1
  })
  .finally(() => mongo.close())
