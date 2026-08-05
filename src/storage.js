// Persistence layer for task state. MongoDB is the single source of truth —
// tasks live in tommy-data.nalas-minions and nowhere else.
//
// Every client — desktop (Electron), browser, iPad, phone — reaches Mongo the
// same way: through the HTTP API (server/index.cjs). In the browser that's a
// relative /api (proxied in dev, same-origin in prod). In Electron the app is
// loaded from file://, so main passes an absolute base URL (window.API_BASE,
// e.g. http://localhost:3001) that the in-process server listens on.
//
// There is intentionally no localStorage fallback: the list you see always
// reflects the database, and a failed write surfaces as an error instead of
// silently diverging into a local-only copy.

const API_BASE = (typeof window !== 'undefined' && window.API_BASE) || ''

// Earlier versions cached tasks (including default seeds) in localStorage. Drop
// that key once on startup so stale chores can't linger and shadow MongoDB.
try {
  if (typeof localStorage !== 'undefined') localStorage.removeItem('nalas-minion-todos')
} catch (e) {
  /* ignore unavailable storage */
}

async function api(path, options = {}) {
  const res = await fetch(`${API_BASE}/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    // A rejected request comes back as { error: "<why>" } — surface that on its
    // own (an unparseable recipe paste, say, is a message for the user, not a
    // status line). Anything else keeps the full request context for debugging.
    let reason
    try {
      reason = JSON.parse(detail).error
    } catch {
      /* not JSON — fall through */
    }
    const err = new Error(
      reason || `API ${options.method || 'GET'} ${path} -> ${res.status} ${detail}`.trim(),
    )
    err.status = res.status
    throw err
  }
  return res.status === 204 ? null : res.json()
}

// Returns the saved task array, or null if nothing has been stored yet.
export async function loadTasks() {
  const { tasks } = await api('/tasks')
  return Array.isArray(tasks) ? tasks : null
}

// Upsert a single new task into tommy-data.nalas-minions. Used when the
// "Add chore" modal is completed.
export async function addTask(task) {
  await api('/tasks', { method: 'POST', body: JSON.stringify(task) })
}

// Sync the whole task array (used for toggle / delete / clear / daily reset).
export async function saveTasks(tasks) {
  await api('/tasks', { method: 'PUT', body: JSON.stringify(tasks) })
}

// The weekly menu's meal catalog, straight from tommy-data.nalas-menu (in the
// order stored there).
export async function loadMeals() {
  const { meals } = await api('/meals')
  return Array.isArray(meals) ? meals : []
}

// Add a recipe to the menu from one pasted blob — a link to a recipe page, or
// the recipe itself as text. The server does the parsing (server/recipe.cjs)
// and stores it in nalas-menu; the stored meal comes back so the page can show
// it without a reload. A paste it can't read rejects with a message saying
// what's missing.
export async function addMeal(input) {
  const { meal } = await api('/meals', { method: 'POST', body: JSON.stringify({ input }) })
  return meal
}

// Read a recipe link's ingredients now and cache them, for a library dish that
// is still shopping from its short `produce` note. Normally the backfill script
// (npm run pull:ingredients) has already done this; this is the retry for a
// page that was unreachable then. Rejects with the site's reason when it still
// can't be read. Returns { url, name, ingredients, shopping }.
export async function pullIngredients(url) {
  const { ingredients } = await api('/ingredients', {
    method: 'POST',
    body: JSON.stringify({ url }),
  })
  return ingredients
}

// Small key/value app state (currently just the daily-reset date).
export async function getMeta(key) {
  const { value } = await api(`/meta/${encodeURIComponent(key)}`)
  return value
}

export async function setMeta(key, value) {
  await api(`/meta/${encodeURIComponent(key)}`, {
    method: 'PUT',
    body: JSON.stringify({ value }),
  })
}

// Fire a "bump" push notification (delivered via ntfy from the server). The
// server fills in the source/event, so no body is needed here.
export async function bump() {
  await api('/bump', { method: 'POST' })
}
