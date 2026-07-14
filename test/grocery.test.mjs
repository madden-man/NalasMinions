// Unit tests for the special recurring grocery task (src/grocery.js).
//
// The grocery task holds an `items` sub-array of staples (text + brandUrl +
// durationDays); buying one stamps purchasedAt and renewGroceryItems un-buys
// it once the duration elapses. ESM because src/grocery.js is an ES module.

import test from 'node:test'
import assert from 'node:assert/strict'

import {
  GROCERY_TASK_ID,
  isGroceryTask,
  createGroceryTask,
  renewGroceryItems,
  toggleGroceryItem,
  restockDate,
  addOneOff,
  toggleOneOff,
  removeOneOff,
  clearBoughtOneOffs,
} from '../src/grocery.js'

const NOW = new Date('2026-07-13T12:00:00')

test('createGroceryTask: stable id, grocery kind, never done', () => {
  const t = createGroceryTask()
  assert.equal(t.id, GROCERY_TASK_ID)
  assert.ok(isGroceryTask(t))
  assert.equal(t.done, false)
})

test('createGroceryTask: every item has text, a brand link, and a duration', () => {
  const { items } = createGroceryTask()
  assert.ok(items.length > 0)
  for (const item of items) {
    assert.ok(item.id)
    assert.equal(typeof item.text, 'string')
    assert.match(item.brandUrl, /^https:\/\//)
    assert.ok(item.durationDays > 0)
    assert.equal(item.purchasedAt, null)
  }
})

test('isGroceryTask: ordinary chores are not grocery tasks', () => {
  assert.equal(isGroceryTask({ id: 't', text: 'Vacuum', done: false }), false)
  assert.equal(isGroceryTask(null), false)
})

test('toggle: buying stamps purchasedAt; toggling again clears it', () => {
  const t = createGroceryTask()
  const id = t.items[0].id
  const bought = toggleGroceryItem(t, id, NOW)
  assert.equal(bought.items[0].purchasedAt, NOW.toISOString())
  // Other items untouched.
  assert.equal(bought.items[1].purchasedAt, null)
  const unbought = toggleGroceryItem(bought, id, NOW)
  assert.equal(unbought.items[0].purchasedAt, null)
})

test('renew: a bought item comes back once its duration elapses', () => {
  const t = createGroceryTask()
  const milk = t.items.find((i) => i.text === 'Milk') // lasts 7 days
  const bought = toggleGroceryItem(t, milk.id, new Date('2026-07-01T12:00:00'))
  const out = renewGroceryItems(bought, NOW) // 12 days later
  assert.equal(out.items.find((i) => i.id === milk.id).purchasedAt, null)
})

test('renew: within its duration an item stays bought (same reference)', () => {
  const t = createGroceryTask()
  const milk = t.items.find((i) => i.text === 'Milk')
  const bought = toggleGroceryItem(t, milk.id, new Date('2026-07-10T12:00:00'))
  assert.equal(renewGroceryItems(bought, NOW), bought) // 3 of 7 days: unchanged
})

test('renew: unbought items are left alone', () => {
  const t = createGroceryTask()
  assert.equal(renewGroceryItems(t, NOW), t)
})

test('restockDate: purchase time plus duration, null when not bought', () => {
  const item = { purchasedAt: '2026-07-01T12:00:00.000Z', durationDays: 7 }
  assert.equal(restockDate(item).toISOString(), '2026-07-08T12:00:00.000Z')
  assert.equal(restockDate({ ...item, purchasedAt: null }), null)
})

test('one-offs: add prepends, toggle flips done, remove drops, clear keeps unbought', () => {
  let t = addOneOff(createGroceryTask(), 'Birthday candles', NOW)
  t = addOneOff(t, 'Limes', new Date(NOW.getTime() + 1000))
  assert.deepEqual(t.oneOffs.map((i) => i.text), ['Limes', 'Birthday candles'])
  assert.equal(t.oneOffs[0].done, false)

  const limes = t.oneOffs[0]
  t = toggleOneOff(t, limes.id)
  assert.equal(t.oneOffs[0].done, true)

  t = clearBoughtOneOffs(t)
  assert.deepEqual(t.oneOffs.map((i) => i.text), ['Birthday candles'])

  t = removeOneOff(t, t.oneOffs[0].id)
  assert.deepEqual(t.oneOffs, [])
})

test('one-offs: helpers tolerate documents that predate the field', () => {
  const legacy = { ...createGroceryTask() }
  delete legacy.oneOffs
  assert.equal(addOneOff(legacy, 'Salt', NOW).oneOffs.length, 1)
  assert.deepEqual(toggleOneOff(legacy, 'nope').oneOffs, [])
  assert.deepEqual(clearBoughtOneOffs(legacy).oneOffs, [])
})
