// Re-check every curated replacement link: `npm run check:links`.
//
// scripts/recipe-links.cjs points 50-odd library dishes at recipes this app can
// actually read, and the whole point of those links is that an ingredient list
// comes back. Recipe sites move URLs and change their markup, so this re-fetches
// each one and fails loudly on any that stopped parsing — the signal to pick a
// replacement rather than let a dish quietly fall back to `produce`.
//
// Exits non-zero when a link is broken, so it can gate a release.

const { RECIPE_LINKS } = require('./recipe-links.cjs')
const { pullIngredients } = require('../server/ingredients.cjs')

const CONCURRENCY = 4

async function main() {
  const entries = Object.entries(RECIPE_LINKS)
  console.log(`Checking ${entries.length} curated recipe links…\n`)

  const queue = [...entries]
  const broken = []
  let ok = 0

  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (queue.length) {
        const [id, entry] = queue.shift()
        try {
          const pulled = await pullIngredients(entry.url)
          ok += 1
          console.log(
            `  ok  ${String(pulled.ingredients.length).padStart(2)} ingredients  ${entry.dish}`,
          )
        } catch (err) {
          broken.push({ id, entry, why: err.message })
          console.error(`  !!  ${entry.dish}: ${err.message}`)
        }
      }
    }),
  )

  console.log(`\n${ok} ok, ${broken.length} broken.`)
  if (broken.length) {
    console.error('\nPick a replacement for each of these in scripts/recipe-links.cjs:')
    for (const b of broken) console.error(`  ${b.entry.dish}\n    ${b.entry.url}\n    ${b.why}`)
    process.exitCode = 1
  }
}

main().catch((err) => {
  console.error('Check failed:', err.message)
  process.exitCode = 1
})
