// The shared recipe library: tommy-data.recipes, read into the weekly menu.
//
// That collection belongs to the meal-planner project, not to this app — it's a
// year of dinners (52 weeks; a "featured" dish per week plus "supporting" ones),
// shaped for planning rather than for cooking: a dish name, the produce to buy,
// sides and a dessert, and links out to the actual recipes. Nala's Minions
// reads it so those dinners show up on /menu alongside the household meals, and
// only ever reads it — nothing here writes back.
//
// Two rules the menu depends on, both from how this data differs from ours:
//
//   * Library dishes are always unverified. Nobody has cooked one from steps
//     this app holds — it doesn't hold any; the method lives at the link.
//   * They sort after everything in nalas-menu, so the meals added here stay at
//     the top of the page.
//
// Because the method lives at the link, so does the shopping list. `produce` is
// only what the planner thought to note — three or four items, and nothing at
// all for most dishes — so the menu reads the real ingredients off the linked
// page instead (server/ingredients.cjs) and caches them. Dishes whose own links
// can't be read get a replacement from scripts/recipe-links.cjs. `produce` is
// still the fallback for anything not pulled yet.

const { overrideFor } = require('../scripts/recipe-links.cjs')
const { normalizeStore } = require('./stores.cjs')

const RECIPES = 'recipes'

// Featured dishes lead their week, then the supporting ones — which is just
// alphabetical order on `role`, so the database can do the sorting.
const LIBRARY_SORT = { week: 1, role: 1, dish: 1 }

// Every link to show for a dish, best first.
//
// When the dish has an override, that link leads: it's the one the ingredients
// were pulled from, so it's the one that matches what the recipe dialog lists.
// The library's own links follow, minus any the override recorded as dead — a
// 404 helps nobody, while a link that merely refuses this app still opens fine
// in a browser and stays.
function linksFor(doc, override) {
  const dead = new Set(override?.dead || [])
  const own = (doc.links || [])
    .filter((l) => l && l.url && !dead.has(l.url))
    .map(({ label, url }) => ({ label: label || url, url }))

  if (!override) return own
  return [
    { label: override.label || override.url, url: override.url },
    ...own.filter((l) => l.url !== override.url),
  ]
}

// One library document -> a menu meal.
//
// `pulled` is the cached ingredient read for this dish's recipe link (see
// electron/mongo.cjs), when there is one: { ingredients, shopping }. It decides
// what the dish shops for —
//
//   * `ingredients` is what the recipe actually publishes, shown in the dialog.
//   * `shopping` is that list rewritten for the grocery list — cooking notes
//     dropped, pantry staples skipped — and is what a pick adds.
//
// Without a pull, both fall back to `produce`: the old behaviour, and still the
// honest answer when a site is down.
function mealFromRecipe(doc, pulled) {
  const override = overrideFor(doc._id)
  const links = linksFor(doc, override)
  const store = normalizeStore(doc.groceryStore)
  const produce = doc.produce || []
  const ingredients = pulled?.ingredients?.length ? pulled.ingredients : produce

  return {
    // Prefixed so a library dish can never collide with a meal in nalas-menu.
    id: `recipe-${doc._id}`,
    name: doc.dish,
    // The note is the human line about the dish; without one, say what the
    // planner knows — the cuisine and how involved it is.
    description: doc.note || [doc.cuisine, doc.difficultyLabel].filter(Boolean).join(' — '),
    verified: false,
    // The planner already notes where to shop for a dish, in prose. Where that
    // note names one of the household's five stores it becomes the same `store`
    // indicator the menu's own meals carry; where it names a specialty market
    // instead, it sets nothing rather than guessing (see server/stores.cjs).
    ...(store ? { store } : {}),
    ingredients,
    // Only set when the list came off the link and so needs the grocery-side
    // rewrite; a `produce` fallback is already written the way you'd shop.
    ...(pulled?.shopping ? { shopping: pulled.shopping } : {}),
    options: [...(doc.sides || []), ...(doc.dessert ? [doc.dessert] : [])],
    steps: [],
    ...(links.length ? { links, sourceUrl: links[0].url } : {}),
  }
}

// Where a dish's ingredients could be read from, best first — the same order
// the links are shown in.
//
// A list rather than a single URL because a dish often carries several links
// (the main course, then a side or a dessert) and the first one is not always
// the readable one: a dish keeps its own links whenever *any* of them parses,
// so the leader can still be a dead page. Callers walk the list until one
// works, which is also why the cache is keyed by URL — whichever link answered
// is the one remembered.
function recipeUrlsFor(doc) {
  return linksFor(doc, overrideFor(doc._id)).map((l) => l.url)
}

module.exports = { RECIPES, LIBRARY_SORT, mealFromRecipe, linksFor, recipeUrlsFor }
