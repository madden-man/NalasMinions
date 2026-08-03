// Unit tests for the shared recipe library mapping (server/recipe-library.cjs):
// a document from tommy-data.recipes — the meal-planner project's year of
// dinners — becomes a meal the weekly menu can render. Fixtures mirror the real
// documents: a "featured" dish carries produce, sides and a dessert; a
// "supporting" one carries only a link and a note.

const test = require('node:test')
const assert = require('node:assert/strict')

const { RECIPES, LIBRARY_SORT, mealFromRecipe } = require('../server/recipe-library.cjs')

const FEATURED = {
  _id: '6a70f2a8ec268d4f241e9b9b',
  dish: 'Chicken Katsu with Rice & Cabbage',
  cuisine: 'Japanese',
  dessert: 'Mochi Ice Cream',
  difficulty: 3,
  difficultyLabel: 'some technique',
  groceryStore: 'H Mart or an Asian market',
  leftovers: 'Katsu sandwiches for lunch.',
  links: [
    { label: 'Chicken Katsu (Just One Cookbook)', url: 'https://example.com/katsu', verified: true },
    { label: 'Miso Soup', url: 'https://example.com/miso', verified: true },
  ],
  produce: ['Cabbage', 'Daikon', 'Carrots', 'Citrus'],
  role: 'featured',
  servesNights: 2,
  sides: ['Miso Soup', 'Pickled Cucumbers'],
  week: 1,
}

const SUPPORTING = {
  _id: '6a70f2a8ec268d4f241e9b9c',
  dish: 'Oyakodon',
  cuisine: 'Japanese',
  difficulty: 2,
  difficultyLabel: 'straightforward',
  groceryStore: 'H Mart or an Asian market',
  links: [{ label: 'Oyakodon (Just One Cookbook)', url: 'https://example.com/oyakodon' }],
  note: 'Chicken and egg over rice; uses the same onion and dashi.',
  role: 'supporting',
  servesNights: 1,
  week: 1,
}

test('reads the collection the planner project owns', () => {
  assert.equal(RECIPES, 'recipes')
})

test('sorts by week, then featured before supporting, then dish', () => {
  assert.deepEqual(LIBRARY_SORT, { week: 1, role: 1, dish: 1 })
  // The role ordering is alphabetical, which is why the database can do it.
  assert.ok('featured' < 'supporting')
})

test('maps a featured dish onto a menu meal', () => {
  const meal = mealFromRecipe(FEATURED)
  assert.equal(meal.id, 'recipe-6a70f2a8ec268d4f241e9b9b')
  assert.equal(meal.name, 'Chicken Katsu with Rice & Cabbage')
  // Produce is what you shop for, so it stands in for the ingredient list.
  assert.deepEqual(meal.ingredients, ['Cabbage', 'Daikon', 'Carrots', 'Citrus'])
  // Sides and the dessert are take-them-or-leave-them.
  assert.deepEqual(meal.options, ['Miso Soup', 'Pickled Cucumbers', 'Mochi Ice Cream'])
})

test('a library dish is never verified — the steps are not ours to vouch for', () => {
  assert.equal(mealFromRecipe(FEATURED).verified, false)
  assert.equal(mealFromRecipe(SUPPORTING).verified, false)
  // Even though the planner marks its links verified.
  assert.equal(FEATURED.links[0].verified, true)
})

test('carries no steps, and links to the real recipe instead', () => {
  const meal = mealFromRecipe(FEATURED)
  assert.deepEqual(meal.steps, [])
  assert.deepEqual(meal.links, [
    { label: 'Chicken Katsu (Just One Cookbook)', url: 'https://example.com/katsu' },
    { label: 'Miso Soup', url: 'https://example.com/miso' },
  ])
  // The first link doubles as the source, the way an imported recipe carries one.
  assert.equal(meal.sourceUrl, 'https://example.com/katsu')
})

test('describes a dish by its note, or by cuisine and difficulty without one', () => {
  assert.equal(
    mealFromRecipe(SUPPORTING).description,
    'Chicken and egg over rice; uses the same onion and dashi.',
  )
  assert.equal(mealFromRecipe(FEATURED).description, 'Japanese — some technique')
})

test('a supporting dish maps with nothing to shop for', () => {
  const meal = mealFromRecipe(SUPPORTING)
  assert.deepEqual(meal.ingredients, [])
  assert.deepEqual(meal.options, [])
  assert.equal(meal.name, 'Oyakodon')
})

test('tolerates a sparse document', () => {
  const meal = mealFromRecipe({ _id: 'x', dish: 'Beans on Toast' })
  assert.deepEqual(meal.ingredients, [])
  assert.deepEqual(meal.options, [])
  assert.deepEqual(meal.steps, [])
  assert.equal(meal.description, '')
  assert.equal(meal.sourceUrl, undefined)
  assert.equal(meal.links, undefined)
})

test('drops a link with no url, and labels a bare one by its url', () => {
  const meal = mealFromRecipe({
    _id: 'x',
    dish: 'Soup',
    links: [{ label: 'no url here' }, { url: 'https://example.com/soup' }],
  })
  assert.deepEqual(meal.links, [
    { label: 'https://example.com/soup', url: 'https://example.com/soup' },
  ])
})

test('library ids cannot collide with the menu ones', () => {
  assert.ok(mealFromRecipe(FEATURED).id.startsWith('recipe-'))
  assert.ok(!mealFromRecipe(FEATURED).id.startsWith('meal-'))
})
