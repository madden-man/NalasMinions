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
    throw new Error(`API ${options.method || 'GET'} ${path} -> ${res.status} ${detail}`.trim())
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
