// Unit tests for the recipe importer (server/recipe.cjs): a pasted link or
// pasted text becomes a meal document for tommy-data.nalas-menu. No network —
// importFromUrl takes a fetch stand-in.

const test = require('node:test')
const assert = require('node:assert/strict')

const {
  looksLikeUrl,
  slugify,
  parseRecipeText,
  parseRecipeHtml,
  importFromUrl,
  mealFromInput,
} = require('../server/recipe.cjs')

const PASTED = `Garlic Butter Noodles
Weeknight noodles, ten minutes flat.

Ingredients:
- 1 lb spaghetti
- 4 tbsp butter
* 6 garlic cloves

Instructions:
1. Boil the spaghetti.
2) Melt the butter with the garlic.
Step 3: Toss it all together.`

// A page with the schema.org metadata recipe sites publish.
const html = (recipe) =>
  `<html><head><script type="application/ld+json">${JSON.stringify(recipe)}</script></head><body>…</body></html>`

test('looksLikeUrl: tells a link from a pasted recipe', () => {
  assert.ok(looksLikeUrl('https://example.com/pad-thai'))
  assert.ok(looksLikeUrl('  http://example.com/x  '))
  assert.ok(!looksLikeUrl('Garlic Noodles\nIngredients:'))
  assert.ok(!looksLikeUrl('example.com/pad-thai'))
  assert.ok(!looksLikeUrl(''))
})

test('slugify: readable, stable document ids', () => {
  assert.equal(slugify('Sheet-Pan Gnocchi!'), 'meal-sheet-pan-gnocchi')
  assert.equal(slugify('Crème Brûlée'), 'meal-creme-brulee')
  assert.equal(slugify(''), 'meal-recipe')
})

test('parseRecipeText: pulls the title, description, ingredients, and steps apart', () => {
  const meal = parseRecipeText(PASTED)
  assert.equal(meal.id, 'meal-garlic-butter-noodles')
  assert.equal(meal.name, 'Garlic Butter Noodles')
  assert.equal(meal.description, 'Weeknight noodles, ten minutes flat.')
  assert.deepEqual(meal.ingredients, ['1 lb spaghetti', '4 tbsp butter', '6 garlic cloves'])
  assert.deepEqual(meal.steps, [
    'Boil the spaghetti.',
    'Melt the butter with the garlic.',
    'Toss it all together.',
  ])
})

test('parseRecipeText: an imported recipe is untried until someone cooks it', () => {
  assert.equal(parseRecipeText(PASTED).verified, false)
})

test('parseRecipeText: takes the other common step headings', () => {
  for (const heading of ['Directions:', 'Steps', 'Method:', 'Preparation:']) {
    const meal = parseRecipeText(`Toast\nIngredients:\n- bread\n${heading}\n- toast it`)
    assert.deepEqual(meal.steps, ['toast it'], heading)
  }
})

test('parseRecipeText: says what a paste is missing instead of guessing', () => {
  assert.throws(() => parseRecipeText('Just some rambling about dinner'), /Ingredients/)
  assert.throws(() => parseRecipeText('Toast\nIngredients:\n- bread'), /Instructions/)
  assert.throws(() => parseRecipeText('Ingredients:\n- bread\nInstructions:\n- toast'), /title/)
  assert.throws(() => parseRecipeText('Toast\nIngredients:\nInstructions:\n- toast'), /No ingredients/)
  assert.throws(() => parseRecipeText('Toast\nIngredients:\n- bread\nInstructions:\n'), /No steps/)
})

test('parseRecipeHtml: reads a schema.org Recipe, keeping the source link', () => {
  const page = html({
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: 'Pad See Ew',
    description: 'Wide noodles, charred.',
    recipeIngredient: ['1 lb wide rice noodles', '2 chicken thighs'],
    recipeInstructions: [
      { '@type': 'HowToStep', text: 'Soak the noodles.' },
      { '@type': 'HowToStep', text: 'Sear the chicken.' },
    ],
  })
  const meal = parseRecipeHtml(page, 'https://example.com/pad-see-ew')
  assert.equal(meal.id, 'meal-pad-see-ew')
  assert.equal(meal.name, 'Pad See Ew')
  assert.equal(meal.sourceUrl, 'https://example.com/pad-see-ew')
  assert.deepEqual(meal.ingredients, ['1 lb wide rice noodles', '2 chicken thighs'])
  assert.deepEqual(meal.steps, ['Soak the noodles.', 'Sear the chicken.'])
  assert.equal(meal.verified, false)
})

test('parseRecipeHtml: finds the recipe inside an @graph', () => {
  const page = html({
    '@graph': [
      { '@type': 'WebSite', name: 'Some Blog' },
      {
        '@type': ['Recipe', 'Article'],
        name: 'Chili',
        recipeIngredient: ['beans'],
        recipeInstructions: 'Simmer it.',
      },
    ],
  })
  assert.deepEqual(parseRecipeHtml(page).steps, ['Simmer it.'])
})

test('parseRecipeHtml: flattens sectioned instructions and strips markup', () => {
  const page = html({
    '@type': 'Recipe',
    name: 'Lasagna',
    recipeIngredient: ['noodles'],
    recipeInstructions: [
      {
        '@type': 'HowToSection',
        name: 'Sauce',
        itemListElement: [{ '@type': 'HowToStep', text: 'Brown the <b>beef</b>.' }],
      },
      { '@type': 'HowToSection', itemListElement: [{ text: 'Layer&nbsp;it up.' }] },
    ],
  })
  assert.deepEqual(parseRecipeHtml(page).steps, ['Brown the beef.', 'Layer it up.'])
})

test('parseRecipeHtml: skips a malformed JSON-LD block to find a good one', () => {
  const page = `<script type="application/ld+json">{ oops </script>${html({
    '@type': 'Recipe',
    name: 'Soup',
    recipeIngredient: ['stock'],
    recipeInstructions: ['Heat it.'],
  })}`
  assert.equal(parseRecipeHtml(page).name, 'Soup')
})

test('parseRecipeHtml: asks for the text when a page has no recipe metadata', () => {
  assert.throws(() => parseRecipeHtml('<html><body>no metadata</body></html>'), /paste the recipe text/)
})

test('importFromUrl: fetches the page and parses it', async () => {
  const page = html({
    '@type': 'Recipe',
    name: 'Congee',
    recipeIngredient: ['rice'],
    recipeInstructions: ['Simmer for an hour.'],
  })
  const calls = []
  const fakeFetch = async (url) => {
    calls.push(url)
    return { ok: true, text: async () => page }
  }
  const meal = await importFromUrl('https://example.com/congee', fakeFetch)
  assert.deepEqual(calls, ['https://example.com/congee'])
  assert.equal(meal.name, 'Congee')
})

test('importFromUrl: reports a site that refuses or fails', async () => {
  await assert.rejects(
    () => importFromUrl('https://example.com/x', async () => ({ ok: false, status: 403 })),
    /returned 403/,
  )
  await assert.rejects(
    () =>
      importFromUrl('https://example.com/x', async () => {
        throw new Error('getaddrinfo ENOTFOUND')
      }),
    /Couldn't reach/,
  )
})

test('mealFromInput: routes a link to the fetcher and text to the parser', async () => {
  const page = html({
    '@type': 'Recipe',
    name: 'Tacos',
    recipeIngredient: ['tortillas'],
    recipeInstructions: ['Fill them.'],
  })
  const linked = await mealFromInput('https://example.com/tacos', async () => ({
    ok: true,
    text: async () => page,
  }))
  assert.equal(linked.name, 'Tacos')

  const pasted = await mealFromInput(PASTED, async () => {
    throw new Error('should not fetch for pasted text')
  })
  assert.equal(pasted.name, 'Garlic Butter Noodles')
})

test('mealFromInput: an empty paste asks for something to work with', async () => {
  await assert.rejects(() => mealFromInput('   '), /Paste a recipe link or the recipe text/)
})
