// Unit tests for the day-list rules in src/due.js: when a chore is due on a
// day, when it's overdue, and when it's listed (due, or overdue and carried
// onto today). ESM because src/due.js is an ES module.

import test from 'node:test'
import assert from 'node:assert/strict'

import { isDueOn, isOverdue, isListedOn } from '../src/due.js'

const task = (over) => ({ id: 't', text: 'x', done: false, recurrence: 'once', ...over })
// Thursday 2026-07-02. Monday-aligned weeks: this week runs Mon 06-29 .. Sun 07-05.
const NOW = new Date('2026-07-02T12:00:00')
const day = (iso) => new Date(`${iso}T12:00:00`)

test('once: due only on its due day', () => {
  const t = task({ dueAt: '2026-07-02T09:00' })
  assert.equal(isDueOn(t, NOW), true)
  assert.equal(isDueOn(t, day('2026-07-03')), false)
})

test('once: overdue after its due day passes, until done', () => {
  assert.equal(isOverdue(task({ dueAt: '2026-06-30T09:00' }), NOW), true)
  assert.equal(isOverdue(task({ dueAt: '2026-06-30T09:00', done: true }), NOW), false)
  // Due earlier *today* is today's business, not overdue.
  assert.equal(isOverdue(task({ dueAt: '2026-07-02T08:00' }), NOW), false)
  assert.equal(isOverdue(task({ dueAt: '2026-07-04T08:00' }), NOW), false)
})

test('once: no due date means always listed, never overdue', () => {
  const t = task({ id: 'seed-1' })
  assert.equal(isDueOn(t, NOW), true)
  assert.equal(isOverdue(t, NOW), false)
})

test('overdue one-off is listed today but not on other days', () => {
  const t = task({ dueAt: '2026-06-30T09:00' })
  assert.equal(isListedOn(t, NOW, NOW), true)
  assert.equal(isListedOn(t, day('2026-07-01'), NOW), false)
  assert.equal(isListedOn(t, day('2026-07-03'), NOW), false)
  // Its own due day still lists it, of course.
  assert.equal(isListedOn(t, day('2026-06-30'), NOW), true)
})

test('daily chores are never overdue (they are on every list already)', () => {
  assert.equal(isOverdue(task({ recurrence: 'daily', dueAt: '2026-06-01T09:00' }), NOW), false)
})

test('weekly: missed earlier this week is overdue', () => {
  // Anchored to a Tuesday; today is Thursday of the same Monday-aligned week.
  const t = task({ recurrence: 'weekly', dueAt: '2026-06-09T09:00' })
  assert.equal(isDueOn(t, NOW), false)
  assert.equal(isOverdue(t, NOW), true)
  assert.equal(isListedOn(t, NOW, NOW), true)
  assert.equal(isOverdue({ ...t, done: true }, NOW), false)
})

test('weekly: last occurrence in a previous week is not overdue', () => {
  // Anchored to a Sunday. Sunday 06-28 was last week; the next is 07-05.
  const t = task({ recurrence: 'weekly', dueAt: '2026-06-07T09:00' })
  assert.equal(isOverdue(t, NOW), false)
  assert.equal(isListedOn(t, NOW, NOW), false)
})

test('weekly: not overdue before its first occurrence', () => {
  // Due this Friday for the first time — nothing has been missed yet.
  const t = task({ recurrence: 'weekly', dueAt: '2026-07-03T09:00' })
  assert.equal(isOverdue(t, NOW), false)
  assert.equal(isListedOn(t, NOW, NOW), false)
})

test('weekly: a chore created without a due date is due on its creation weekday', () => {
  // Created Wed 07-01 (anchor from the id); missed that first Wednesday.
  const t = task({ recurrence: 'weekly', id: String(day('2026-07-01').getTime()) })
  assert.equal(isOverdue(t, NOW), true)
})

test('biweekly: only an on-week occurrence in the current fortnight counts', () => {
  // The current fortnight bucket runs Mon 06-22 .. Sun 07-05.
  // Anchored Sun 06-14: on weeks 06-14 and 06-28 -> missed 06-28 -> overdue.
  const on = task({ recurrence: 'biweekly', dueAt: '2026-06-14T09:00' })
  assert.equal(isOverdue(on, NOW), true)
  // Anchored Sun 06-21: on weeks 06-21 and 07-05 -> the last occurrence was in
  // the previous fortnight and the next hasn't come -> not overdue.
  const off = task({ recurrence: 'biweekly', dueAt: '2026-06-21T09:00' })
  assert.equal(isOverdue(off, NOW), false)
})

test('monthly: missed earlier this month is overdue, last month is not', () => {
  const t1 = task({ recurrence: 'monthly', dueAt: '2026-01-01T09:00' })
  assert.equal(isOverdue(t1, NOW), true)
  const t20 = task({ recurrence: 'monthly', dueAt: '2026-01-20T09:00' })
  assert.equal(isOverdue(t20, NOW), false)
})
