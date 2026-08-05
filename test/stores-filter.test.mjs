// Unit tests for the store filter's pure helpers (src/stores.js).
//
// ESM because the browser side is an ES module. The store list is spelled out
// in two places — once for each module system — so the first test here is the
// thing holding them together.

import test from 'node:test'
import assert from 'node:assert/strict'

import { createRequire } from 'node:module'

import {
  STORES,
  isStore,
  ALL_STORES,
  NO_STORE,
  filterByStore,
  storeCounts,
} from '../src/stores.js'

const MEALS = [
  { id: 'a', name: 'Orange Chicken', store: "Trader Joe's" },
  { id: 'b', name: 'Butter Chicken', store: "Trader Joe's" },
  { id: 'c', name: 'Grilled Cheese', store: 'King Soopers' },
  { id: 'd', name: 'Pad Thai' },
  { id: 'e', name: 'Banana Bread', store: undefined },
]

test('the browser list and the server list are the same five, in the same order', () => {
  // The one duplicated thing in the feature, so it gets the loudest test: an
  // edit dialog offering a store the server would reject is a dead end.
  const server = createRequire(import.meta.url)('../server/stores.cjs')
  assert.deepEqual(STORES, server.STORES)
  assert.deepEqual(STORES, [
    "Trader Joe's",
    'King Soopers',
    'Costco',
    'Safeway',
    'Whole Foods',
  ])
  assert.equal(isStore('Costco'), true)
  assert.equal(isStore('Kroger'), false)
})

test('filtering by a store shows only what you can buy there', () => {
  assert.deepEqual(filterByStore(MEALS, "Trader Joe's").map((m) => m.id), ['a', 'b'])
  assert.deepEqual(filterByStore(MEALS, 'King Soopers').map((m) => m.id), ['c'])
})

test('a store nothing comes from shows nothing, not everything', () => {
  assert.deepEqual(filterByStore(MEALS, 'Costco'), [])
})

test('"all" is every meal, in the order the menu gave them', () => {
  assert.deepEqual(filterByStore(MEALS, ALL_STORES).map((m) => m.id), ['a', 'b', 'c', 'd', 'e'])
})

test('"no store" collects the meals cooked from whatever is in the house', () => {
  // Both a missing key and an explicit undefined count as unset.
  assert.deepEqual(filterByStore(MEALS, NO_STORE).map((m) => m.id), ['d', 'e'])
})

test('counts add up to the whole menu, so the chips can be trusted', () => {
  const counts = storeCounts(MEALS)
  assert.equal(counts[ALL_STORES], MEALS.length)
  assert.equal(counts["Trader Joe's"], 2)
  assert.equal(counts['King Soopers'], 1)
  assert.equal(counts[NO_STORE], 2)
  // Every store gets a count even when nothing comes from it, so the filter
  // can decide to leave that chip out.
  assert.equal(counts.Costco, 0)
  const perStore = STORES.reduce((a, s) => a + counts[s], 0)
  assert.equal(perStore + counts[NO_STORE], MEALS.length)
})

test('an empty menu counts as empty rather than throwing', () => {
  const counts = storeCounts([])
  assert.equal(counts[ALL_STORES], 0)
  assert.equal(counts[NO_STORE], 0)
  assert.deepEqual(filterByStore([], ALL_STORES), [])
})
