// Unit tests for the weekly meal menu.
//
// The catalog itself now lives in MongoDB (tommy-data.nalas-menu); what's
// checked here is the curated seed it's published from
// (scripts/meals-data.cjs) — each meal carries its grocery ingredients and
// cooking steps — plus addMealToGrocery (src/menu.js), which drops a meal's
// ingredients onto the grocery task's one-off list, skipping any already there.
// ESM because src/menu.js is an ES module; the seed data is required as CJS.

import test from 'node:test'
import assert from 'node:assert/strict'

import { createRequire } from 'node:module'

import { createGroceryTask, addOneOff, toggleOneOff } from '../src/grocery.js'
import { addMealToGrocery, shoppingList } from '../src/menu.js'

const require_ = createRequire(import.meta.url)
const { MEALS } = require_('../scripts/meals-data.cjs')
const { STORES, isStore } = require_('../server/stores.cjs')

const NOW = new Date('2026-07-15T12:00:00')
const padThai = MEALS.find((m) => m.id === 'meal-pad-thai')
const pizza = MEALS.find((m) => m.id === 'meal-flatbread-pizza')

test('seed: every meal has a name, ingredients, and steps', () => {
  assert.ok(MEALS.length > 0)
  for (const meal of MEALS) {
    assert.ok(meal.id)
    assert.equal(typeof meal.name, 'string')
    assert.ok(meal.ingredients.length > 0)
    assert.ok(meal.steps.length > 0)
  }
})

test('seed: every household recipe is marked verified', () => {
  // These are the ones that have actually been cooked from these steps —
  // anything imported later starts untried.
  for (const meal of MEALS) assert.equal(meal.verified, true, meal.id)
})

test('seed: the catalog carries the household recipes', () => {
  const ids = MEALS.map((m) => m.id)
  assert.ok(ids.includes('meal-pad-thai'))
  assert.ok(ids.includes('meal-kevins-chicken-potatoes'))
  assert.ok(ids.includes('meal-flatbread-pizza'))
  assert.ok(ids.includes('meal-eggs-for-group'))
  assert.ok(ids.includes('meal-costco-steak'))
  assert.ok(ids.includes('meal-turkey-sandwich'))
  assert.ok(ids.includes('meal-crockpot-mexican-chicken'))
})

test('seed: turkey sandwich condiments are pick-your-own options', () => {
  const sandwich = MEALS.find((m) => m.id === 'meal-turkey-sandwich')
  assert.deepEqual(sandwich.options, ['Mayo', 'Chick-fil-A sauce', 'Cheese'])
})

test("seed: Kevin's chicken meal shops for the brand product", () => {
  const kevins = MEALS.find((m) => m.id === 'meal-kevins-chicken-potatoes')
  assert.ok(kevins.ingredients.includes("Kevin's chicken"))
  // Pantry assumptions stay off the list.
  assert.ok(!kevins.ingredients.some((i) => /water|salt/i.test(i)))
})

test('seed: pizza toppings are options, not fixed ingredients', () => {
  assert.deepEqual(pizza.options, ['Mozzarella cheese', 'Pepperoni', 'Sausage'])
  for (const topping of pizza.options) {
    assert.ok(!pizza.ingredients.includes(topping))
  }
})

test('addMealToGrocery: keeps all optional extras by default', () => {
  const t = addMealToGrocery(createGroceryTask(), pizza, NOW)
  const texts = t.oneOffs.map((i) => i.text)
  assert.equal(texts.length, pizza.ingredients.length + pizza.options.length)
  for (const topping of pizza.options) assert.ok(texts.includes(topping))
})

test('addMealToGrocery: deselected options stay off the list', () => {
  const t = addMealToGrocery(createGroceryTask(), pizza, NOW, ['Pepperoni'])
  const texts = t.oneOffs.map((i) => i.text)
  assert.ok(texts.includes('Pepperoni'))
  assert.ok(!texts.includes('Sausage'))
  assert.ok(!texts.includes('Mozzarella cheese'))
  assert.equal(texts.length, pizza.ingredients.length + 1)
})

test('addMealToGrocery: adds every ingredient as an unbought one-off', () => {
  const t = addMealToGrocery(createGroceryTask(), padThai, NOW)
  assert.equal(t.oneOffs.length, padThai.ingredients.length)
  for (const ingredient of padThai.ingredients) {
    const item = t.oneOffs.find((i) => i.text === ingredient)
    assert.ok(item, `missing ${ingredient}`)
    assert.equal(item.done, false)
  }
})

test('addMealToGrocery: items get distinct ids', () => {
  const t = addMealToGrocery(createGroceryTask(), padThai, NOW)
  const ids = new Set(t.oneOffs.map((i) => i.id))
  assert.equal(ids.size, t.oneOffs.length)
})

test('addMealToGrocery: picking the same meal twice adds nothing new', () => {
  const once = addMealToGrocery(createGroceryTask(), padThai, NOW)
  const twice = addMealToGrocery(once, padThai, new Date(NOW.getTime() + 1000))
  // Same reference — callers use this to skip a needless save.
  assert.equal(twice, once)
})

test('addMealToGrocery: skips an ingredient already typed by hand (case-insensitive)', () => {
  const manual = addOneOff(createGroceryTask(), padThai.ingredients[0].toUpperCase(), NOW)
  const t = addMealToGrocery(manual, padThai, new Date(NOW.getTime() + 1000))
  assert.equal(t.oneOffs.length, padThai.ingredients.length)
})

test('addMealToGrocery: an already-bought ingredient is not re-added', () => {
  let t = addMealToGrocery(createGroceryTask(), padThai, NOW)
  const bought = t.oneOffs[0]
  t = toggleOneOff(t, bought.id)
  const again = addMealToGrocery(t, padThai, new Date(NOW.getTime() + 1000))
  assert.equal(again, t)
})

test('addMealToGrocery: tolerates documents that predate oneOffs', () => {
  const legacy = { ...createGroceryTask() }
  delete legacy.oneOffs
  const t = addMealToGrocery(legacy, padThai, NOW)
  assert.equal(t.oneOffs.length, padThai.ingredients.length)
})

test('addMealToGrocery: leaves staples and other one-offs untouched', () => {
  const before = addOneOff(createGroceryTask(), 'Birthday candles', NOW)
  const t = addMealToGrocery(before, padThai, new Date(NOW.getTime() + 1000))
  assert.deepEqual(t.items, before.items)
  assert.ok(t.oneOffs.some((i) => i.text === 'Birthday candles'))
})

// --- meals whose ingredients were read off a link -------------------------
//
// A library dish carries the recipe's own wording in `ingredients` and the
// grocery-ready rewrite in `shopping` (server/ingredients.cjs). The menu shops
// from the second and shows the first.

const linked = {
  id: 'recipe-abc',
  name: 'Chicken Katsu',
  ingredients: ['2 bell peppers (orange + red)', '½ tsp Diamond Crystal kosher salt'],
  shopping: ['2 bell peppers'],
  options: [],
}

test('shoppingList: prefers the grocery rewrite when the meal has one', () => {
  assert.deepEqual(shoppingList(linked), ['2 bell peppers'])
})

test('shoppingList: a hand-written meal shops from its own ingredients', () => {
  // Nothing in nalas-menu has `shopping` — those lists are already shop-ready.
  assert.equal(padThai.shopping, undefined)
  assert.deepEqual(shoppingList(padThai), padThai.ingredients)
})

test('shoppingList: an empty rewrite falls back rather than shopping for nothing', () => {
  assert.deepEqual(shoppingList({ ...linked, shopping: [] }), linked.ingredients)
})

test('shoppingList: tolerates a meal with no ingredients at all', () => {
  assert.deepEqual(shoppingList({ id: 'x', name: 'Nothing' }), [])
})

test('addMealToGrocery: puts the rewrite on the list, not the recipe wording', () => {
  const t = addMealToGrocery(createGroceryTask(), linked, NOW)
  assert.deepEqual(t.oneOffs.map((i) => i.text), ['2 bell peppers'])
  // The salt the recipe listed is assumed to be in the kitchen already.
  assert.ok(!t.oneOffs.some((i) => /salt/i.test(i.text)))
})

test('addMealToGrocery: kept options still ride along with a pulled list', () => {
  const withSides = { ...linked, options: ['Miso Soup'] }
  const t = addMealToGrocery(createGroceryTask(), withSides, NOW)
  assert.deepEqual(t.oneOffs.map((i) => i.text).sort(), ['2 bell peppers', 'Miso Soup'])
})

// --- the store indicator --------------------------------------------------
//
// `store` names where a meal's ingredients are bought, for the ones that are a
// single trip to a single place. It's optional: the meals cooked from whatever
// is in the house leave it unset.

test('seed: every store set is one of the five the household shops at', () => {
  for (const meal of MEALS) {
    if (meal.store === undefined) continue
    assert.ok(isStore(meal.store), `${meal.id}: ${JSON.stringify(meal.store)} is not one of ${STORES.join(', ')}`)
  }
})

test('seed: the easy meals each name the store they are shopped at', () => {
  const easy = [
    'meal-tj-orange-chicken',
    'meal-tj-butter-chicken-dumplings',
    'meal-sausage-potatoes-broccoli',
    'meal-alfredo-pasta-peas',
    'meal-rotisserie-chicken-sandwich',
    'meal-tomato-soup-grilled-cheese',
  ]
  for (const id of easy) {
    const meal = MEALS.find((m) => m.id === id)
    assert.ok(meal, `missing ${id}`)
    assert.ok(isStore(meal.store), `${id}: ${meal.store}`)
  }
})

test("seed: the Trader Joe's meals are the frozen-aisle ones", () => {
  const tj = MEALS.filter((m) => m.store === "Trader Joe's").map((m) => m.id)
  assert.deepEqual(tj.sort(), ['meal-tj-butter-chicken-dumplings', 'meal-tj-orange-chicken'])
})

test('seed: the original household meals set no store', () => {
  // They are cooked from what's in the house, not from one shop.
  for (const id of ['meal-pad-thai', 'meal-flatbread-pizza', 'meal-banana-bread']) {
    assert.equal(MEALS.find((m) => m.id === id).store, undefined, id)
  }
})

test('seed: the easy meals still carry real ingredients and steps', () => {
  const easy = MEALS.filter((m) => m.store)
  assert.equal(easy.length, 6)
  for (const meal of easy) {
    assert.ok(meal.ingredients.length >= 2, meal.id)
    assert.ok(meal.steps.length >= 4, meal.id)
    // These go on the grocery list as-is, so no pulled-list rewrite applies.
    assert.equal(meal.shopping, undefined, meal.id)
  }
})

test('addMealToGrocery: an easy meal shops for exactly its ingredients', () => {
  const soup = MEALS.find((m) => m.id === 'meal-tomato-soup-grilled-cheese')
  const t = addMealToGrocery(createGroceryTask(), soup, NOW)
  assert.deepEqual(t.oneOffs.map((i) => i.text).sort(), [...soup.ingredients].sort())
})

test('addMealToGrocery: the alfredo chicken is optional, not assumed', () => {
  const pasta = MEALS.find((m) => m.id === 'meal-alfredo-pasta-peas')
  assert.ok(pasta.options.includes('Rotisserie chicken'))
  // Deselect everything optional and the base meal still stands on its own.
  const t = addMealToGrocery(createGroceryTask(), pasta, NOW, [])
  assert.deepEqual(t.oneOffs.map((i) => i.text).sort(), [...pasta.ingredients].sort())
})
