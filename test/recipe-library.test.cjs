// Unit tests for the shared recipe library mapping (server/recipe-library.cjs):
// a document from tommy-data.recipes — the meal-planner project's year of
// dinners — becomes a meal the weekly menu can render. Fixtures mirror the real
// documents: a "featured" dish carries produce, sides and a dessert; a
// "supporting" one carries only a link and a note.

const test = require('node:test')
const assert = require('node:assert/strict')

const {
  RECIPES,
  LIBRARY_SORT,
  mealFromRecipe,
  linksFor,
  recipeUrlsFor,
} = require('../server/recipe-library.cjs')
const { RECIPE_LINKS } = require('../scripts/recipe-links.cjs')

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

// --- ingredients read off the link ----------------------------------------

test('a pulled list replaces produce, and carries the grocery version with it', () => {
  const pulled = {
    ingredients: ['2 bell peppers (orange + red)', '1 tsp kosher salt'],
    shopping: ['2 bell peppers'],
  }
  const meal = mealFromRecipe(FEATURED, pulled)
  // The dialog shows what the recipe actually says…
  assert.deepEqual(meal.ingredients, ['2 bell peppers (orange + red)', '1 tsp kosher salt'])
  // …while the grocery list gets the tidied, de-stapled version.
  assert.deepEqual(meal.shopping, ['2 bell peppers'])
})

test('without a pull, a dish still shops from produce and sets no shopping list', () => {
  const meal = mealFromRecipe(FEATURED)
  assert.deepEqual(meal.ingredients, ['Cabbage', 'Daikon', 'Carrots', 'Citrus'])
  // No `shopping` means "this list is already written the way you'd shop".
  assert.equal(meal.shopping, undefined)
})

test('an empty pull is treated as no pull rather than as an empty dish', () => {
  const meal = mealFromRecipe(FEATURED, { ingredients: [], shopping: [] })
  assert.deepEqual(meal.ingredients, ['Cabbage', 'Daikon', 'Carrots', 'Citrus'])
})

test('a planner note naming one of the five becomes the store indicator', () => {
  const meal = mealFromRecipe({ ...FEATURED, groceryStore: 'King Soopers (seafood counter)' })
  assert.equal(meal.store, 'King Soopers')
})

test('a planner note naming a specialty market sets no store', () => {
  // The fixture's own note is "H Mart or an Asian market" — none of the five,
  // so the card shows no chip rather than pointing at the wrong shop.
  assert.equal(FEATURED.groceryStore, 'H Mart or an Asian market')
  assert.equal(mealFromRecipe(FEATURED).store, undefined)
  // And a dish with no note at all sets none either.
  assert.equal(mealFromRecipe({ _id: 'x', dish: 'Beans on Toast' }).store, undefined)
})

// --- replacement links ----------------------------------------------------

test('an override leads the link list, and the dish keeps its other links', () => {
  const links = linksFor(FEATURED, {
    label: 'Chicken Katsu (replacement)',
    url: 'https://example.com/new-katsu',
  })
  assert.deepEqual(links, [
    { label: 'Chicken Katsu (replacement)', url: 'https://example.com/new-katsu' },
    { label: 'Chicken Katsu (Just One Cookbook)', url: 'https://example.com/katsu' },
    { label: 'Miso Soup', url: 'https://example.com/miso' },
  ])
})

test('a link the override marked dead is dropped; a merely blocked one stays', () => {
  const links = linksFor(FEATURED, {
    label: 'New',
    url: 'https://example.com/new',
    // The katsu link 404s; the miso one only refuses this app, so it survives.
    dead: ['https://example.com/katsu'],
  })
  assert.deepEqual(links.map((l) => l.url), [
    'https://example.com/new',
    'https://example.com/miso',
  ])
})

test('an override is never listed twice when it matches a link already there', () => {
  const links = linksFor(FEATURED, {
    label: 'Chicken Katsu (Just One Cookbook)',
    url: 'https://example.com/katsu',
  })
  assert.equal(links.filter((l) => l.url === 'https://example.com/katsu').length, 1)
})

test('the pull candidates are every link the dish shows, in the order shown', () => {
  // All of them, not just the first: a dish keeps its own links when any one
  // of them parses, so the leader can still be a page that has gone dead.
  assert.deepEqual(recipeUrlsFor(FEATURED), [
    'https://example.com/katsu',
    'https://example.com/miso',
  ])
  assert.deepEqual(recipeUrlsFor({ _id: 'nope', dish: 'Nothing' }), [])
})

test('an overridden dish reads from the replacement first', () => {
  const [id, entry] = Object.entries(RECIPE_LINKS)[0]
  const urls = recipeUrlsFor({ _id: id, dish: entry.dish, links: [{ url: 'https://old.example' }] })
  assert.equal(urls[0], entry.url)
  assert.ok(urls.includes('https://old.example'))
})

test('every curated override names a dish and an http link', () => {
  const entries = Object.entries(RECIPE_LINKS)
  assert.ok(entries.length > 0)
  for (const [id, entry] of entries) {
    assert.match(id, /^[a-f0-9]{24}$/, `${entry.dish}: id should be a library _id`)
    assert.ok(entry.dish, `${id} should say which dish it is for`)
    assert.match(entry.url, /^https:\/\//, `${entry.dish}: link should be https`)
    assert.ok(entry.label, `${entry.dish}: link should be labelled`)
    for (const dead of entry.dead || []) {
      assert.match(dead, /^https?:\/\//, `${entry.dish}: dead link should be a url`)
    }
  }
})

test('no two dishes are pointed at the same replacement recipe', () => {
  const urls = Object.values(RECIPE_LINKS).map((e) => e.url)
  assert.equal(new Set(urls).size, urls.length)
})
