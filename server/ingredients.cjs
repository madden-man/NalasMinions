// Pull a real ingredient list off a recipe's link, and turn it into groceries.
//
// A dish on /menu is only useful if picking it fills the shopping list, and for
// the shared recipe library (server/recipe-library.cjs) the only thing close to
// an ingredient list is `produce` — three or four items, and empty for most
// dishes. The link, though, points at the actual recipe. So the menu reads the
// ingredients off that page, through the same schema.org metadata the "Add
// recipe" importer uses (server/recipe.cjs), and keeps two lists:
//
//   * `ingredients` — every line exactly as the recipe publishes it. This is
//     what the recipe dialog shows, so it matches the page it came from.
//   * `shopping`    — the same lines rewritten for a grocery list: cooking
//     notes dropped and pantry staples skipped, the way the household's own
//     recipes are already written (scripts/meals-data.cjs deliberately leaves
//     out salt and water). Without it a week of dinners puts "½ tsp Diamond
//     Crystal kosher salt" and "3 tablespoons olive oil, (divided)" on the
//     list, and the list stops being worth reading.
//
// Meals that already carry a hand-written shopping list — everything in
// nalas-menu — have no `shopping` and are left exactly as they are.

const { parseIngredientsHtml } = require('./recipe.cjs')

// Ingredient lines carry their measurement up front. Stripping it leaves the
// food itself, which is what decides whether a line is a pantry staple.
const AMOUNT =
  /^\s*(?:\d+[\d\s./-]*|[½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]|\d*\s*[½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])?\s*(?:(?:cups?|c|tbsps?|tablespoons?|tsps?|teaspoons?|ounces?|oz|pounds?|lbs?|lb|grams?|g|kg|kilograms?|ml|milliliters?|l|liters?|pinch(?:es)?|dash(?:es)?|cloves?|cans?|jars?|packages?|packs?|quarts?|pints?|sticks?|sprigs?|bunch(?:es)?|handfuls?|sprinkles?|slices?|pieces?|heads?|stalks?|large|medium|small)\b\.?\s*)*(?:of\s+)?/i

// Everything after the comma that starts a prep or serving note: what the cook
// does with the thing, not what to buy. Anchored on the note's opening word and
// then greedy, because these run on — "…, 7 roughly torn into chunks, 3 finely
// julienned for garnish" is all one aside. Anchoring matters: a bare "drop
// everything after the first comma" would eat "1 tsp EACH basil, oregano, sugar".
const PREP_WORDS = [
  'chopped', 'minced', 'diced', 'sliced', 'grated', 'shredded', 'crushed', 'cubed',
  'julienned', 'torn', 'halved', 'quartered', 'seeded', 'stemmed', 'trimmed', 'peeled',
  'drained', 'rinsed', 'softened', 'melted', 'beaten', 'whisked', 'toasted', 'thawed',
  'packed', 'divided', 'optional', 'cut', 'cored', 'pitted', 'scrubbed', 'washed',
  'thinly', 'finely', 'roughly', 'coarsely', 'freshly', 'lightly', 'well',
  'plus', 'for', 'to taste', 'as needed', 'or more', 'about', 'preferably',
  'such as', 'store[- ]bought', 'room temperature', 'at room temperature',
]
// The note may open with a count of its own ("…, 7 roughly torn into chunks").
const TRAILING_NOTE = new RegExp(
  `,\\s*(?:\\d+[\\d\\s./-]*)?(?:${PREP_WORDS.join('|')})\\b.*$`,
  'i',
)

// What the kitchen is assumed to already have. Deliberately narrow and matched
// against the whole food (not a substring), so "sesame oil" and "smoked salt"
// stay on the list while "kosher salt" and "3 tbsp olive oil" drop off.
const PANTRY_STAPLES = [
  // Brands stack with grinds ("Morton kosher salt"), so the modifiers repeat.
  /^(?:(?:diamond crystal|morton'?s?|kosher|sea|table|coarse|fine|flaky|iodized)\s*)*salt$/i,
  /^salt\s*(?:and|&|,)\s*(?:freshly ground\s*)?(?:black\s*)?pepper$/i,
  /^(?:(?:freshly|fresh|coarsely|finely|ground|cracked|black|white)\s*)*pepper(?:corns)?$/i,
  /^(?:cold|hot|warm|boiling|filtered|lukewarm|ice)?\s*water$/i,
  /^ice(?:\s*cubes?)?$/i,
  /^(?:extra[\s-]?virgin|virgin|light|pure)?\s*(?:olive|vegetable|canola|neutral|cooking|sunflower|grapeseed)?\s*oil$/i,
]

// Drop balanced parentheses and brackets, innermost first, so nested asides
// ("(pounded ¼-in (6-mm) thick)") come out whole rather than leaving a stray
// closing bracket behind.
function stripAsides(text) {
  let out = String(text)
  for (let i = 0; i < 6; i += 1) {
    const next = out.replace(/\([^()]*\)|\[[^[\]]*\]/g, ' ')
    if (next === out) break
    out = next
  }
  return out
}

// One published ingredient line -> the line to put on a grocery list.
// Returns '' for a line that's nothing but a note.
function shoppingLine(raw) {
  let text = stripAsides(raw)
    // "2 tbsp curry paste OR 1 quantity homemade paste" — keep the first choice.
    .replace(/\s+\bOR\b.*$/, '')
    .replace(/\s+/g, ' ')
    .trim()
  // Notes can stack: "…, drained and rinsed, divided".
  for (let i = 0; i < 3; i += 1) {
    const next = text.replace(TRAILING_NOTE, '')
    if (next === text) break
    text = next
  }
  // Whatever punctuation the stripping left dangling.
  return text.replace(/[\s,;:.•*-]+$/, '').trim()
}

// Is this line something the kitchen already has?
function isPantryStaple(line) {
  const food = shoppingLine(line).replace(AMOUNT, '').replace(/[\s,.;:]+$/, '').trim()
  if (!food) return true // a line that was only a note buys nothing
  return PANTRY_STAPLES.some((re) => re.test(food))
}

// A recipe's published ingredients -> the lines worth shopping for: cleaned,
// pantry staples dropped, and de-duplicated case-insensitively (recipes often
// list the same thing twice across sub-sections).
function toShoppingList(ingredients) {
  const seen = new Set()
  const out = []
  for (const raw of ingredients || []) {
    if (isPantryStaple(raw)) continue
    const line = shoppingLine(raw)
    if (!line) continue
    const key = line.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(line)
  }
  return out
}

// Fetch a recipe page and read its ingredients. Deliberately more forgiving
// than the "Add recipe" importer: a page that lists ingredients but no usable
// steps is still worth shopping from, because the cook reads the steps at the
// link anyway.
async function pullIngredients(url, fetchImpl = fetch) {
  let res
  try {
    res = await fetchImpl(url, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; nalas-minion-todo/1.0)',
        Accept: 'text/html,application/xhtml+xml',
      },
    })
  } catch (err) {
    throw new Error(`Couldn't reach ${url}: ${err.message}`)
  }
  if (!res.ok) throw new Error(`Couldn't read ${url} — the site returned ${res.status}.`)

  const { name, ingredients } = parseIngredientsHtml(await res.text(), url)
  return { url, name, ingredients, shopping: toShoppingList(ingredients) }
}

module.exports = {
  AMOUNT,
  PANTRY_STAPLES,
  shoppingLine,
  isPantryStaple,
  toShoppingList,
  pullIngredients,
}
