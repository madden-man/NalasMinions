// Unit tests for reading a recipe link's ingredients (server/ingredients.cjs).
//
// Two jobs, tested separately: rewriting a published ingredient line into
// something worth putting on a grocery list, and deciding which lines are
// pantry staples the kitchen already has. The sample lines are real ones, taken
// from the sites the recipe library links to.

const test = require('node:test')
const assert = require('node:assert/strict')

const {
  shoppingLine,
  isPantryStaple,
  toShoppingList,
  pullIngredients,
} = require('../server/ingredients.cjs')

test('drops the parenthetical asides recipes hang off an ingredient', () => {
  assert.equal(shoppingLine('3 tablespoons olive oil, (divided)'), '3 tablespoons olive oil')
  assert.equal(
    shoppingLine('1 (15 oz) can crushed tomatoes, drained and rinsed'),
    '1 can crushed tomatoes',
  )
})

test('unwraps nested parentheses rather than leaving a stray bracket', () => {
  assert.equal(
    shoppingLine(
      '1½ pounds boneless skinless chicken breasts, (pounded ¼-in (6-mm) thick (see note), or chicken tenderloins)',
    ),
    '1½ pounds boneless skinless chicken breasts',
  )
})

test('keeps the first of two alternatives rather than both', () => {
  assert.equal(
    shoppingLine('4 - 6 tbsp Thai Green Curry Paste (Maesri best) OR ((Note 1))'),
    '4 - 6 tbsp Thai Green Curry Paste',
  )
})

test('strips stacked trailing prep notes', () => {
  assert.equal(shoppingLine('2 cups carrots, finely chopped, divided'), '2 cups carrots')
  assert.equal(shoppingLine('1 cup parmesan, plus more for serving'), '1 cup parmesan')
})

test('a prep note runs to the end of the line, however long it rambles', () => {
  assert.equal(
    shoppingLine('10.5 oz pork tenderloin or collar but, thinly sliced against the grain'),
    '10.5 oz pork tenderloin or collar but',
  )
  assert.equal(
    shoppingLine('1 ¼ cups coconut milk, plus a little extra for garnish if you wish'),
    '1 ¼ cups coconut milk',
  )
  // Even when the note opens with a count of its own.
  assert.equal(
    shoppingLine('10 makrut lime leaves, 7 roughly torn into chunks, 3 finely julienned'),
    '10 makrut lime leaves',
  )
})

test('a comma listing more things to buy is not a prep note', () => {
  // The give-away is what follows the comma: another ingredient, not a verb.
  assert.equal(
    shoppingLine('1 tsp EACH dried basil, oregano, sugar'),
    '1 tsp EACH dried basil, oregano, sugar',
  )
  assert.equal(shoppingLine('500g / 1 lb ground beef or pork'), '500g / 1 lb ground beef or pork')
})

test('salt, pepper, water and plain oil are assumed to be in the kitchen', () => {
  for (const line of [
    'Salt',
    '½ tsp Diamond Crystal kosher salt',
    '3 tablespoons Morton kosher salt',
    'salt and pepper',
    '1 teaspoon freshly ground black pepper',
    '¼ teaspoon white pepper',
    '1 cup water',
    '2 cups cold water',
    '1 tbsp olive oil',
    'Extra virgin olive oil',
    '1/2 cup vegetable oil',
    '2 tsp (10 ml) neutral oil',
  ]) {
    assert.equal(isPantryStaple(line), true, `expected a staple: ${line}`)
  }
})

test('a seasoning you would actually buy is not a staple', () => {
  for (const line of [
    '1 tsp sesame oil',
    '2 tablespoons toasted sesame oil',
    '1 tsp smoked salt',
    '¼ teaspoon cayenne pepper',
    '2 bell peppers',
    '1 can chickpeas',
    '1 tablespoon truffle oil',
  ]) {
    assert.equal(isPantryStaple(line), false, `expected to shop for: ${line}`)
  }
})

test('a line that is nothing but a note buys nothing', () => {
  assert.equal(isPantryStaple('(for serving)'), true)
})

test('the shopping list drops staples and de-duplicates what is left', () => {
  assert.deepEqual(
    toShoppingList([
      '2 bell peppers (orange + red)',
      '1 teaspoon kosher salt',
      '2 Bell Peppers',
      '1 cup water',
      '3 chicken thighs, trimmed',
    ]),
    ['2 bell peppers', '3 chicken thighs'],
  )
})

test('an empty or missing list stays empty', () => {
  assert.deepEqual(toShoppingList([]), [])
  assert.deepEqual(toShoppingList(undefined), [])
})

// --- pullIngredients ------------------------------------------------------
//
// The fetch is injected, so these never touch the network.

const PAGE = (ingredients) => `<html><head>
<script type="application/ld+json">${JSON.stringify({
  '@type': 'Recipe',
  name: 'Test Dish',
  recipeIngredient: ingredients,
  recipeInstructions: ['Cook it.'],
})}</script></head><body></body></html>`

const okFetch = (body) => async () => ({ ok: true, status: 200, text: async () => body })

test('reads a page into both lists: as published, and as shopped for', async () => {
  const pulled = await pullIngredients(
    'https://example.com/dish',
    okFetch(PAGE(['2 bell peppers', '1 tsp kosher salt', '1 lb chicken thighs, (diced)'])),
  )
  assert.equal(pulled.url, 'https://example.com/dish')
  assert.equal(pulled.name, 'Test Dish')
  // Exactly what the recipe says, for the dialog.
  assert.deepEqual(pulled.ingredients, ['2 bell peppers', '1 tsp kosher salt', '1 lb chicken thighs, (diced)'])
  // Tidied and de-stapled, for the grocery list.
  assert.deepEqual(pulled.shopping, ['2 bell peppers', '1 lb chicken thighs'])
})

test('accepts a page with ingredients but no usable steps — the cook reads the link', async () => {
  const body = `<html><script type="application/ld+json">${JSON.stringify({
    '@type': 'Recipe',
    name: 'Stepless',
    recipeIngredient: ['1 onion'],
  })}</script></html>`
  const pulled = await pullIngredients('https://example.com/x', okFetch(body))
  assert.deepEqual(pulled.shopping, ['1 onion'])
})

test('says why a page could not be read, rather than throwing something opaque', async () => {
  await assert.rejects(
    () => pullIngredients('https://example.com/blocked', async () => ({ ok: false, status: 403 })),
    /returned 403/,
  )
  await assert.rejects(
    () =>
      pullIngredients('https://example.com/down', async () => {
        throw new Error('ECONNREFUSED')
      }),
    /Couldn't reach/,
  )
  await assert.rejects(
    () => pullIngredients('https://example.com/plain', okFetch('<html>no metadata</html>')),
    /doesn't publish a readable recipe/,
  )
})
