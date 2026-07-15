// Unit tests for the weekly meal menu (src/menu.js).
//
// MEALS carries each meal's grocery ingredients and cooking steps;
// addMealToGrocery drops the ingredients onto the grocery task's one-off list,
// skipping any already there. ESM because src/menu.js is an ES module.

import test from 'node:test'
import assert from 'node:assert/strict'

import { createGroceryTask, addOneOff, toggleOneOff } from '../src/grocery.js'
import { MEALS, addMealToGrocery } from '../src/menu.js'

const NOW = new Date('2026-07-15T12:00:00')
const padThai = MEALS.find((m) => m.id === 'meal-pad-thai')
const pizza = MEALS.find((m) => m.id === 'meal-flatbread-pizza')

test('MEALS: every meal has a name, ingredients, and steps', () => {
  assert.ok(MEALS.length > 0)
  for (const meal of MEALS) {
    assert.ok(meal.id)
    assert.equal(typeof meal.name, 'string')
    assert.ok(meal.ingredients.length > 0)
    assert.ok(meal.steps.length > 0)
  }
})

test('MEALS: the catalog carries the household recipes', () => {
  const ids = MEALS.map((m) => m.id)
  assert.ok(ids.includes('meal-pad-thai'))
  assert.ok(ids.includes('meal-kevins-chicken-potatoes'))
  assert.ok(ids.includes('meal-flatbread-pizza'))
  assert.ok(ids.includes('meal-eggs-for-group'))
  assert.ok(ids.includes('meal-costco-steak'))
  assert.ok(ids.includes('meal-turkey-sandwich'))
  assert.ok(ids.includes('meal-crockpot-mexican-chicken'))
})

test('MEALS: turkey sandwich condiments are pick-your-own options', () => {
  const sandwich = MEALS.find((m) => m.id === 'meal-turkey-sandwich')
  assert.deepEqual(sandwich.options, ['Mayo', 'Chick-fil-A sauce', 'Cheese'])
})

test("MEALS: Kevin's chicken meal shops for the brand product", () => {
  const kevins = MEALS.find((m) => m.id === 'meal-kevins-chicken-potatoes')
  assert.ok(kevins.ingredients.includes("Kevin's chicken"))
  // Pantry assumptions stay off the list.
  assert.ok(!kevins.ingredients.some((i) => /water|salt/i.test(i)))
})

test('MEALS: pizza toppings are options, not fixed ingredients', () => {
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
