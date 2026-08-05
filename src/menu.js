// The weekly meal menu.
//
// The meal catalog itself lives in MongoDB (tommy-data.nalas-menu), fetched by
// MenuPage through storage.loadMeals(); scripts/meals-data.cjs is the curated
// seed it's published from. What's left here is the rule for picking a meal:
// its ingredients (plus whichever optional extras were kept) go onto the
// /grocery list as one-off items — bought once for that week, unlike the
// renewing staples. Which list of ingredients that means is the one wrinkle,
// and shoppingList() below is where it's decided. Pure and framework-free so it
// can be unit-tested (test/menu.test.mjs), mirroring grocery.js.

// Extension included so Node's test runner can resolve it (Vite doesn't mind).
import { addOneOff } from './grocery.js'

// What a meal actually puts on the grocery list.
//
// A meal whose ingredients were read off its recipe link carries them twice:
// `ingredients` exactly as the recipe published them (what the dialog shows),
// and `shopping` — the same list rewritten for a grocery run, with cooking
// notes dropped and pantry staples skipped (server/ingredients.cjs). Shop from
// `shopping` when it's there. Everything in nalas-menu has no `shopping` and
// needs none: those lists were written by hand, already phrased to shop from.
export function shoppingList(meal) {
  return meal.shopping?.length ? meal.shopping : meal.ingredients || []
}

// Put a meal's ingredients on the grocery list as one-off items, plus whichever
// of its optional extras were kept (all of them by default). Ingredients
// already on the list (matched case-insensitively, bought or not) are skipped,
// so picking the same meal twice — or two meals sharing an ingredient — never
// duplicates a line. Returns the same task reference when nothing was added,
// so callers can skip a needless save (same contract as renewGroceryItems).
export function addMealToGrocery(task, meal, now = new Date(), selectedOptions = meal.options || []) {
  const existing = new Set((task.oneOffs || []).map((i) => i.text.trim().toLowerCase()))
  let result = task
  let added = 0
  for (const ingredient of [...shoppingList(meal), ...selectedOptions]) {
    if (existing.has(ingredient.trim().toLowerCase())) continue
    // Offset the timestamp so each item gets a distinct id even though they're
    // all added in one tick.
    result = addOneOff(result, ingredient, new Date(now.getTime() + added))
    added += 1
  }
  return result
}
