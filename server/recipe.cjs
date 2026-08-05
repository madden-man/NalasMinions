// Turn "a link or a pasted recipe" into a meal document for the menu.
//
// The /menu page's "Add recipe" box takes whatever the user has — a URL from a
// recipe site, or the recipe typed/pasted as text — and this module makes a
// meal out of it: { id, name, description, ingredients, steps, sourceUrl }.
// It lives on the server because fetching someone else's site from the browser
// is blocked by CORS, and because both backends (server/index.cjs and the
// Netlify function) need the same behaviour.
//
// Links are read through schema.org Recipe metadata (the JSON-LD block nearly
// every recipe site publishes) rather than by scraping layout, so a site
// redesign doesn't break parsing. When a page has no such metadata we say so
// and ask for the text instead — a wrong guess would be worse than an error.
//
// Nothing here is verified: an imported recipe lands with verified: false until
// somebody actually cooks it.

// Bullets, dashes, and "1." / "1)" / "Step 1:" numbering that make a pasted
// list readable but shouldn't end up in the stored text.
const BULLET = /^\s*(?:[-–—*•·▢]|\d{1,2}\s*[.)]|step\s*\d{1,2}\s*[:.)]?)\s+/i
const INGREDIENTS_HEADING = /^\s*#*\s*ingredients\b\s*:?\s*$/i
const STEPS_HEADING = /^\s*#*\s*(?:instructions|steps|directions|method|preparation|how to make it)\b[^:]*:?\s*$/i

const looksLikeUrl = (input) => /^https?:\/\/\S+$/i.test(String(input || '').trim())

// A stable, readable document id: "Sheet-Pan Gnocchi!" -> "meal-sheet-pan-gnocchi".
function slugify(name) {
  const slug = String(name || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '')
  return `meal-${slug || 'recipe'}`
}

// Recipe sites encode more than the handful of entities you'd expect —
// "4 inches&#32;daikon" and "don&#8217;t" both turn up in real instructions — so
// decode numerically rather than listing them. Done before the named ones so an
// escaped "&amp;#39;" survives as text instead of becoming an apostrophe.
const decodeEntities = (s) =>
  s
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')

const clean = (s) =>
  decodeEntities(String(s || '').replace(/<[^>]*>/g, ' ')) // instructions sometimes carry markup
    .replace(/\s+/g, ' ')
    // Stripping inline markup ("the <b>beef</b>.") leaves a space before the
    // punctuation; close it back up.
    .replace(/\s+([,.;:!?])/g, '$1')
    .trim()

// One line of a pasted list -> the text to store, or '' if it's just noise.
const stripBullet = (line) => clean(line.replace(BULLET, ''))

// Build the stored meal, with the fields the menu needs and nothing else.
function toMeal({ name, description, ingredients, steps, sourceUrl }) {
  return {
    id: slugify(name),
    name: clean(name),
    description: clean(description),
    // Imported recipes are untried until someone cooks from these steps.
    verified: false,
    ingredients: ingredients.map(clean).filter(Boolean),
    steps: steps.map(clean).filter(Boolean),
    ...(sourceUrl ? { sourceUrl } : {}),
  }
}

// A recipe pasted as text. Expected shape (what you get copying off a site or
// out of a note): a title line, then an "Ingredients:" heading, then a steps
// heading — anything between the title and the ingredients is the description.
function parseRecipeText(text, sourceUrl) {
  const lines = String(text || '').split(/\r?\n/)
  const iIng = lines.findIndex((l) => INGREDIENTS_HEADING.test(l))
  const iSteps = lines.findIndex((l, i) => i > iIng && STEPS_HEADING.test(l))

  if (iIng === -1) {
    throw new Error('Couldn\'t find an "Ingredients:" line — add one above the ingredient list.')
  }
  if (iSteps === -1) {
    throw new Error('Couldn\'t find an "Instructions:" line — add one above the steps.')
  }

  const head = lines.slice(0, iIng).map(stripBullet).filter(Boolean)
  const name = head[0]
  if (!name) throw new Error('The recipe needs a title on the first line.')

  const ingredients = lines.slice(iIng + 1, iSteps).map(stripBullet).filter(Boolean)
  const steps = lines.slice(iSteps + 1).map(stripBullet).filter(Boolean)
  if (!ingredients.length) throw new Error('No ingredients found under the "Ingredients:" line.')
  if (!steps.length) throw new Error('No steps found under the "Instructions:" line.')

  return toMeal({
    name,
    description: head.slice(1).join(' '),
    ingredients,
    steps,
    sourceUrl,
  })
}

// schema.org instructions come in three flavours: plain strings, HowToStep
// objects, and HowToSection objects wrapping a list of steps. Flatten them all.
function instructionsToSteps(instructions) {
  const out = []
  for (const entry of [].concat(instructions || [])) {
    if (typeof entry === 'string') out.push(entry)
    else if (entry && Array.isArray(entry.itemListElement)) {
      out.push(...instructionsToSteps(entry.itemListElement))
    } else if (entry && (entry.text || entry.name)) {
      out.push(entry.text || entry.name)
    }
  }
  return out
}

// Walk a JSON-LD payload (a node, an array, or an @graph) for the Recipe node.
function findRecipeNode(node) {
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findRecipeNode(item)
      if (found) return found
    }
    return null
  }
  if (!node || typeof node !== 'object') return null
  const types = [].concat(node['@type'] || [])
  if (types.some((t) => String(t).toLowerCase() === 'recipe')) return node
  return node['@graph'] ? findRecipeNode(node['@graph']) : null
}

// Every schema.org Recipe node a page publishes, in document order. A page can
// carry several JSON-LD blocks (and one malformed block shouldn't hide a good
// one), so this yields rather than returning the first hit — what counts as
// usable differs by caller.
function* recipeNodes(html) {
  const blocks = String(html || '').matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )
  for (const [, raw] of blocks) {
    let parsed
    try {
      parsed = JSON.parse(raw.trim())
    } catch {
      continue
    }
    const recipe = findRecipeNode(parsed)
    if (recipe) yield recipe
  }
}

const NO_RECIPE = "That page doesn't publish a readable recipe — paste the recipe text instead."

const nodeIngredients = (node) => [].concat(node.recipeIngredient || node.ingredients || [])

// A recipe page's HTML -> a meal, via its schema.org Recipe metadata. Needs
// both halves: a meal joins the menu to be cooked from, so steps are the point.
function parseRecipeHtml(html, sourceUrl) {
  for (const recipe of recipeNodes(html)) {
    const ingredients = nodeIngredients(recipe)
    const steps = instructionsToSteps(recipe.recipeInstructions)
    if (!ingredients.length || !steps.length) continue

    return toMeal({
      name: recipe.name || 'Imported recipe',
      description: recipe.description || '',
      ingredients,
      steps,
      sourceUrl,
    })
  }
  throw new Error(NO_RECIPE)
}

// The same metadata read for a dish that only links out (server/ingredients.cjs).
//
// Deliberately laxer than parseRecipeHtml: ingredients are what this is for, and
// a page that lists them without machine-readable instructions is still well
// worth shopping from. Steps come along when the page publishes them — that's
// what fills in a library dish that would otherwise be a name and a link — but
// their absence is not a reason to reject the page.
function parseIngredientsHtml(html, sourceUrl) {
  for (const recipe of recipeNodes(html)) {
    const ingredients = nodeIngredients(recipe).map(clean).filter(Boolean)
    if (!ingredients.length) continue
    return {
      url: sourceUrl,
      name: clean(recipe.name) || 'Imported recipe',
      description: clean(recipe.description),
      ingredients,
      steps: instructionsToSteps(recipe.recipeInstructions).map(clean).filter(Boolean),
    }
  }
  throw new Error(NO_RECIPE)
}

// Fetch a recipe page and parse it. Kept small and explicit about failures so
// the dialog can show the user why an import didn't work.
async function importFromUrl(url, fetchImpl = fetch) {
  let res
  try {
    res = await fetchImpl(url, {
      redirect: 'follow',
      headers: {
        // Some recipe sites serve a stub to unknown clients.
        'User-Agent': 'Mozilla/5.0 (compatible; nalas-minion-todo/1.0)',
        Accept: 'text/html,application/xhtml+xml',
      },
    })
  } catch (err) {
    throw new Error(`Couldn't reach ${url}: ${err.message}`)
  }
  if (!res.ok) throw new Error(`Couldn't read ${url} — the site returned ${res.status}.`)
  return parseRecipeHtml(await res.text(), url)
}

// The single entry point the API routes use: one pasted blob, link or text.
async function mealFromInput(input, fetchImpl = fetch) {
  const value = String(input || '').trim()
  if (!value) throw new Error('Paste a recipe link or the recipe text.')
  return looksLikeUrl(value)
    ? importFromUrl(value, fetchImpl)
    : parseRecipeText(value)
}

module.exports = {
  looksLikeUrl,
  slugify,
  parseRecipeText,
  parseRecipeHtml,
  parseIngredientsHtml,
  importFromUrl,
  mealFromInput,
}
