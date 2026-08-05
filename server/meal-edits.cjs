// Edits a person made to a recipe from the app.
//
// Every meal on /menu is editable, but almost none of them are ours to write to:
// the 138 library dinners live in the meal-planner project's `recipes`
// collection, which this app only ever reads, and the household meals are
// published from scripts/meals-data.cjs, so `npm run seed:meals` would overwrite
// anything typed into them.
//
// So edits don't go back to where the meal came from. They're stored on their
// own, keyed by meal id, and laid over the meal when the menu loads. That keeps
// the read-only collection read-only, keeps re-seeding safe, and makes "reset
// this recipe" a delete rather than a restore.

// What the edit dialog can change. Anything else on a meal — its id, whether
// it's verified, the links, the pulled ingredient cache — is not the user's to
// type over.
const EDITABLE_FIELDS = ['name', 'description', 'store', 'ingredients', 'options', 'steps']

const isFilledString = (v) => typeof v === 'string' && v.trim().length > 0

// An incoming edit -> just the fields worth storing, normalized.
//
// Lists come from a textarea, so they arrive with blank lines and stray
// whitespace; a name arrives with neither guaranteed. Absent keys stay absent
// (that field simply isn't edited), but an empty store is meaningful — it's how
// you say "no particular shop" — so it's stored as null rather than dropped.
function pickEdits(fields) {
  const out = {}
  if (!fields || typeof fields !== 'object') return out

  for (const key of ['name', 'description']) {
    if (fields[key] === undefined) continue
    if (typeof fields[key] !== 'string') continue
    out[key] = fields[key].trim()
  }

  for (const key of ['ingredients', 'options', 'steps']) {
    if (fields[key] === undefined) continue
    if (!Array.isArray(fields[key])) continue
    out[key] = fields[key].filter(isFilledString).map((line) => line.trim())
  }

  if (fields.store !== undefined) {
    out.store = isFilledString(fields.store) ? fields.store.trim() : null
  }

  return out
}

// Lay an edit over the meal it belongs to.
//
// One rule beyond a plain merge: hand-typed ingredients replace the grocery
// rewrite as well as the display list. `shopping` exists only because ingredients
// read off a recipe site need tidying before they reach the grocery list
// (server/ingredients.cjs); a list somebody typed is already phrased the way
// they'd shop, exactly like the household meals, so it's used as-is.
function applyMealEdit(meal, edit) {
  if (!edit) return meal
  const patch = {}
  for (const key of EDITABLE_FIELDS) {
    if (edit[key] === undefined) continue
    // A cleared store is stored as null but read as "unset", so no chip shows.
    patch[key] = key === 'store' && edit[key] === null ? undefined : edit[key]
  }
  const next = { ...meal, ...patch }
  if (patch.ingredients) delete next.shopping
  // `edited` drives the "edited" marker and the reset action in the dialog.
  return { ...next, edited: true }
}

module.exports = { EDITABLE_FIELDS, pickEdits, applyMealEdit }
