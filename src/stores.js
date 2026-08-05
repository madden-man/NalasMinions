// The five grocery stores, for the browser.
//
// See server/stores.cjs for why the vocabulary is closed at five. That module is
// the canonical copy; this one exists because it's CommonJS and can't be
// imported by the Vite build. The two lists are held identical by a test
// (test/stores-filter.test.mjs), which is cheaper than the contortions needed to
// share one file across both module systems and both runtimes.
//
// Only the list is duplicated. Normalizing the recipe library's free-text
// shopping notes stays on the server, where those notes arrive.

export const STORES = ["Trader Joe's", 'King Soopers', 'Costco', 'Safeway', 'Whole Foods']

export const isStore = (value) => STORES.includes(value)

// The filter's own pseudo-options, which aren't stores: everything, and the
// meals that name no store at all (cooked from what's in the house, or a
// library dish whose shopping note pointed at a specialty market).
export const ALL_STORES = '__all__'
export const NO_STORE = '__none__'

// Meals matching the current filter selection.
export function filterByStore(meals, filter) {
  if (filter === ALL_STORES) return meals
  if (filter === NO_STORE) return meals.filter((m) => !m.store)
  return meals.filter((m) => m.store === filter)
}

// How many meals each filter option would show, so the chips can carry counts
// and an option that would show nothing can be left out.
export function storeCounts(meals) {
  const counts = { [ALL_STORES]: meals.length, [NO_STORE]: 0 }
  for (const store of STORES) counts[store] = 0
  for (const meal of meals) {
    if (!meal.store) counts[NO_STORE] += 1
    else if (counts[meal.store] !== undefined) counts[meal.store] += 1
  }
  return counts
}
