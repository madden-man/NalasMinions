// The special recurring grocery task.
//
// One task document (kind: 'grocery') lives in tommy-data.nalas-minions right
// next to the chores, but it behaves differently: the chores page hides it and
// /grocery renders it. Instead of a single done flag it carries an `items`
// sub-array of staples — each one records the item, a photo of the desired
// brand (imageData, a compressed base64 data URI; older items may still carry
// a legacy brandUrl link), and how many days a purchase lasts (durationDays).
// Buying
// an item stamps purchasedAt; once its duration elapses the item renews
// (un-checks itself), which is what makes the task recurring. Pure and
// framework-free so it can be unit-tested (test/grocery.test.mjs), mirroring
// renew.js.

export const GROCERY_TASK_ID = 'grocery-staples'

const DAY_MS = 86400000

export const isGroceryTask = (task) => Boolean(task) && task.kind === 'grocery'

// The staples the household always comes back to: what to buy, the brand we
// like, and roughly how many days a purchase lasts before it's needed again.
const DEFAULT_ITEMS = [
  {
    id: 'staple-milk',
    text: 'Milk',
    brandUrl: 'https://www.organicvalley.coop/',
    durationDays: 7,
  },
  {
    id: 'staple-bananas',
    text: 'Bananas',
    brandUrl: 'https://www.dole.com/',
    durationDays: 5,
  },
  {
    id: 'staple-dog-food',
    text: 'Dog food for Nala',
    brandUrl: 'https://bluebuffalo.com/',
    durationDays: 30,
  },
]

// The document seeded into the collection the first time /grocery loads and
// finds no grocery task. `done` stays false forever — completion lives on the
// individual items — so chore-level renewal and reminders never touch it.
// Besides the recurring staples, the document also carries the page's one-off
// items (`oneOffs`), so the entire /grocery list persists as this one task.
export function createGroceryTask() {
  return {
    id: GROCERY_TASK_ID,
    kind: 'grocery',
    text: 'Grocery staples',
    done: false,
    items: DEFAULT_ITEMS.map((item) => ({ ...item, purchasedAt: null })),
    oneOffs: [],
  }
}

// When a bought item runs out and is due to reappear on the list, or null for
// an item that isn't currently bought (or has an unparseable timestamp).
export function restockDate(item) {
  if (!item.purchasedAt) return null
  const bought = new Date(item.purchasedAt)
  if (Number.isNaN(bought.getTime())) return null
  return new Date(bought.getTime() + (item.durationDays || 0) * DAY_MS)
}

// Un-buy any staple whose duration has elapsed since it was purchased, so it
// shows up as "to buy" again. Returns the same task reference when nothing
// changed, so callers can skip a needless save/re-render (same contract as
// renewTasks in renew.js).
export function renewGroceryItems(task, now = new Date()) {
  let changed = false
  const items = (task.items || []).map((item) => {
    const due = restockDate(item)
    if (!due || due > now) return item
    changed = true
    return { ...item, purchasedAt: null }
  })
  return changed ? { ...task, items } : task
}

// Mark a staple bought (stamping purchasedAt so renewal knows when it runs
// out) or un-mark it. Always returns a fresh task object.
export function toggleGroceryItem(task, itemId, now = new Date()) {
  return {
    ...task,
    items: (task.items || []).map((item) =>
      item.id === itemId
        ? { ...item, purchasedAt: item.purchasedAt ? null : now.toISOString() }
        : item,
    ),
  }
}

// Add a new staple to the top of the list. `fields` carries text, brandUrl,
// and durationDays (the dialog validates them); the item starts unbought.
export function addStaple(task, fields, now = new Date()) {
  return {
    ...task,
    items: [{ id: `staple-${now.getTime()}`, ...fields, purchasedAt: null }, ...(task.items || [])],
  }
}

// Merge edited fields (text / brandUrl / durationDays) into a staple. Bought
// state is untouched — durationDays changes take effect from the existing
// purchase timestamp.
export function updateStaple(task, itemId, fields) {
  return {
    ...task,
    items: (task.items || []).map((i) => (i.id === itemId ? { ...i, ...fields } : i)),
  }
}

export function removeStaple(task, itemId) {
  return { ...task, items: (task.items || []).filter((i) => i.id !== itemId) }
}

// --- one-off items --------------------------------------------------------
//
// Free-typed entries with no brand or duration. They live in the same task
// document so the whole /grocery list rides one upsert; bought ones are
// cleared manually instead of renewing. All helpers tolerate documents that
// predate the field (`oneOffs` missing) and return a fresh task object.

export function addOneOff(task, text, now = new Date()) {
  return {
    ...task,
    oneOffs: [{ id: `${now.getTime()}`, text, done: false }, ...(task.oneOffs || [])],
  }
}

export function toggleOneOff(task, itemId) {
  return {
    ...task,
    oneOffs: (task.oneOffs || []).map((i) => (i.id === itemId ? { ...i, done: !i.done } : i)),
  }
}

export function updateOneOff(task, itemId, fields) {
  return {
    ...task,
    oneOffs: (task.oneOffs || []).map((i) => (i.id === itemId ? { ...i, ...fields } : i)),
  }
}

export function removeOneOff(task, itemId) {
  return { ...task, oneOffs: (task.oneOffs || []).filter((i) => i.id !== itemId) }
}

export function clearBoughtOneOffs(task) {
  return { ...task, oneOffs: (task.oneOffs || []).filter((i) => !i.done) }
}
