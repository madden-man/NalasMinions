// Unit tests for the store vocabulary (server/stores.cjs).
//
// A meal's `store` is only useful as a shopping trip if it names somewhere the
// household actually goes, so the field has exactly five legal values. The
// interesting behaviour is normalizeStore, which reads the shared recipe
// library's free-text shopping notes and either finds one of the five in them
// or — deliberately — gives up rather than guessing.

const test = require('node:test')
const assert = require('node:assert/strict')

const { STORES, isStore, normalizeStore } = require('../server/stores.cjs')

test('there are exactly five stores', () => {
  assert.deepEqual(STORES, [
    "Trader Joe's",
    'King Soopers',
    'Costco',
    'Safeway',
    'Whole Foods',
  ])
})

test('isStore accepts the five and nothing else', () => {
  for (const store of STORES) assert.equal(isStore(store), true, store)
  for (const other of ['H Mart', 'Kroger', 'trader joes', '', undefined, null]) {
    assert.equal(isStore(other), false, String(other))
  }
})

test('a note naming one of the five normalizes to it', () => {
  assert.equal(normalizeStore('King Soopers'), 'King Soopers')
  assert.equal(normalizeStore("Trader Joe's"), "Trader Joe's")
})

test('the trimmings on a note are about which counter, not which trip', () => {
  // Real values from the recipe library.
  assert.equal(normalizeStore('King Soopers (seafood counter)'), 'King Soopers')
  assert.equal(normalizeStore('King Soopers or a European deli'), 'King Soopers')
  assert.equal(normalizeStore('King Soopers + a Latin market for peppers'), 'King Soopers')
  assert.equal(normalizeStore('King Soopers + an Italian deli'), 'King Soopers')
  assert.equal(normalizeStore('King Soopers or a kosher deli'), 'King Soopers')
})

test('a specialty market is not quietly rounded to the nearest of the five', () => {
  // Sending somebody to Safeway for gochujang would be worse than saying
  // nothing, so these set no store at all.
  for (const note of [
    'H Mart or an Asian market',
    'a Middle Eastern market',
    'a Latin market',
    'an African or Middle Eastern market',
    'an Indian market',
  ]) {
    assert.equal(normalizeStore(note), undefined, note)
  }
})

test('an empty or missing note sets no store', () => {
  for (const note of ['', '   ', undefined, null]) {
    assert.equal(normalizeStore(note), undefined, String(note))
  }
})

test('matching ignores case, since the notes are prose', () => {
  assert.equal(normalizeStore('pick it up at costco'), 'Costco')
  assert.equal(normalizeStore('WHOLE FOODS'), 'Whole Foods')
})
