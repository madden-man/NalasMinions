// Unit tests for edits made to a recipe from the app (server/meal-edits.cjs).
//
// Edits never go back to where the meal came from — the recipe library is
// read-only and the household meals get republished by the seeder — so they're
// stored apart and laid over the meal on load. What matters here is that the
// overlay only carries what a person actually changed, and that a hand-typed
// ingredient list takes over the grocery list as well as the display list.

const test = require('node:test')
const assert = require('node:assert/strict')

const { EDITABLE_FIELDS, pickEdits, applyMealEdit } = require('../server/meal-edits.cjs')

const MEAL = {
  id: 'recipe-abc',
  name: 'Chicken Katsu',
  description: 'Japanese — some technique',
  verified: false,
  store: 'King Soopers',
  ingredients: ['2 bell peppers (orange + red)', '½ tsp kosher salt'],
  shopping: ['2 bell peppers'],
  options: ['Miso Soup'],
  steps: ['Fry it.'],
  links: [{ label: 'Katsu', url: 'https://example.com/katsu' }],
}

test('only the fields a person can type are editable', () => {
  assert.deepEqual(EDITABLE_FIELDS, [
    'name',
    'description',
    'store',
    'ingredients',
    'options',
    'steps',
  ])
})

test('an untouched field stays untouched rather than being blanked', () => {
  const patch = pickEdits({ name: 'New name' })
  assert.deepEqual(patch, { name: 'New name' })
  assert.equal('ingredients' in patch, false)
})

test('list fields lose the blank lines and stray whitespace a textarea leaves', () => {
  assert.deepEqual(
    pickEdits({ ingredients: ['  2 onions  ', '', '   ', 'Rice'] }).ingredients,
    ['2 onions', 'Rice'],
  )
})

test('an emptied store is stored, not dropped — it means "no particular shop"', () => {
  assert.deepEqual(pickEdits({ store: '' }), { store: null })
  assert.deepEqual(pickEdits({ store: '   ' }), { store: null })
  assert.deepEqual(pickEdits({ store: 'Costco' }), { store: 'Costco' })
})

test('fields of the wrong shape are ignored rather than stored', () => {
  assert.deepEqual(pickEdits({ name: 42, ingredients: 'not a list', steps: null }), {})
  assert.deepEqual(pickEdits(null), {})
  assert.deepEqual(pickEdits('nope'), {})
})

test('nothing outside the editable set gets through', () => {
  const patch = pickEdits({ id: 'hacked', verified: true, links: [], shopping: ['x'] })
  assert.deepEqual(patch, {})
})

test('an edit lays over the meal and marks it edited', () => {
  const merged = applyMealEdit(MEAL, { name: 'Katsu, our way' })
  assert.equal(merged.name, 'Katsu, our way')
  assert.equal(merged.edited, true)
  // Everything untouched survives.
  assert.equal(merged.description, MEAL.description)
  assert.deepEqual(merged.links, MEAL.links)
})

test('no edit means no overlay and no edited marker', () => {
  assert.equal(applyMealEdit(MEAL, undefined), MEAL)
  assert.equal(applyMealEdit(MEAL, undefined).edited, undefined)
})

test('a typed ingredient list takes over the grocery list too', () => {
  const merged = applyMealEdit(MEAL, { ingredients: ['2 bell peppers', 'Panko'] })
  assert.deepEqual(merged.ingredients, ['2 bell peppers', 'Panko'])
  // `shopping` only exists to tidy lines scraped off a website. A list somebody
  // typed is already how they'd shop, so the rewrite is dropped entirely.
  assert.equal('shopping' in merged, false)
})

test('editing something else leaves the pulled grocery rewrite alone', () => {
  const merged = applyMealEdit(MEAL, { name: 'Renamed' })
  assert.deepEqual(merged.shopping, ['2 bell peppers'])
})

test('a cleared store reads as unset, so no chip shows', () => {
  const merged = applyMealEdit(MEAL, { store: null })
  assert.equal(merged.store, undefined)
})
