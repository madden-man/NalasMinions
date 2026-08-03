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

const RECIPES = 'recipes'

// Featured dishes lead their week, then the supporting ones — which is just
// alphabetical order on `role`, so the database can do the sorting.
const LIBRARY_SORT = { week: 1, role: 1, dish: 1 }

// One library document -> a menu meal.
//
// The mapping is lossy by nature: `produce` is the closest thing to an
// ingredient list (it's what you shop for), sides and dessert become the
// optional extras the picker can toggle off, and there are no steps at all —
// `links` carries the recipe instead, which the recipe dialog shows in their
// place.
function mealFromRecipe(doc) {
  const links = (doc.links || [])
    .filter((l) => l && l.url)
    .map(({ label, url }) => ({ label: label || url, url }))

  return {
    // Prefixed so a library dish can never collide with a meal in nalas-menu.
    id: `recipe-${doc._id}`,
    name: doc.dish,
    // The note is the human line about the dish; without one, say what the
    // planner knows — the cuisine and how involved it is.
    description: doc.note || [doc.cuisine, doc.difficultyLabel].filter(Boolean).join(' — '),
    verified: false,
    ingredients: doc.produce || [],
    options: [...(doc.sides || []), ...(doc.dessert ? [doc.dessert] : [])],
    steps: [],
    ...(links.length ? { links, sourceUrl: links[0].url } : {}),
  }
}

module.exports = { RECIPES, LIBRARY_SORT, mealFromRecipe }
