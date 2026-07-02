// Unit tests for per-recurrence chore renewal (src/renew.js).
//
// renewTasks un-checks a completed recurring chore once its occurrence rolls
// over; one-time chores stay done. ESM because src/renew.js is an ES module.

import test from 'node:test'
import assert from 'node:assert/strict'

import { renewTasks, occurrenceBucket } from '../src/renew.js'

const task = (over) => ({ id: 't', text: 'x', done: true, ...over })
// A Thursday. Monday-aligned weeks mean this shares a week with Mon 2026-06-29.
const NOW = new Date('2026-07-02T12:00:00')

test('one-time chores never renew', () => {
  const tasks = [task({ recurrence: 'once', completedAt: '2020-01-01T00:00:00' })]
  assert.equal(renewTasks(tasks, NOW), tasks) // same reference: unchanged
  assert.equal(renewTasks(tasks, NOW)[0].done, true)
})

test('unchecked chores are left alone', () => {
  const tasks = [task({ done: false, recurrence: 'daily' })]
  assert.equal(renewTasks(tasks, NOW), tasks)
})

test('daily: completed yesterday renews (un-checks + clears completedAt)', () => {
  const out = renewTasks([task({ recurrence: 'daily', completedAt: '2026-07-01T09:00:00' })], NOW)
  assert.equal(out[0].done, false)
  assert.equal(out[0].completedAt, null)
})

test('daily: completed today stays done', () => {
  const tasks = [task({ recurrence: 'daily', completedAt: '2026-07-02T08:00:00' })]
  assert.equal(renewTasks(tasks, NOW), tasks)
})

test('weekly: completed earlier this (Monday-aligned) week stays done', () => {
  // 2026-06-29 is the Monday of NOW's week.
  const tasks = [task({ recurrence: 'weekly', completedAt: '2026-06-29T09:00:00' })]
  assert.equal(renewTasks(tasks, NOW), tasks)
})

test('weekly: completed last week renews', () => {
  const out = renewTasks([task({ recurrence: 'weekly', completedAt: '2026-06-28T09:00:00' })], NOW)
  assert.equal(out[0].done, false)
})

test('monthly: completed last month renews; this month stays', () => {
  assert.equal(renewTasks([task({ recurrence: 'monthly', completedAt: '2026-06-30T09:00:00' })], NOW)[0].done, false)
  const same = [task({ recurrence: 'monthly', completedAt: '2026-07-01T09:00:00' })]
  assert.equal(renewTasks(same, NOW), same)
})

test('legacy: done recurring chore with no completedAt renews once', () => {
  const out = renewTasks([task({ recurrence: 'daily', completedAt: undefined })], NOW)
  assert.equal(out[0].done, false)
})

test('occurrenceBucket: weeks are Monday-aligned', () => {
  // Mon 2026-06-29 .. Sun 2026-07-05 share a weekly bucket; the prior Sunday does not.
  assert.equal(occurrenceBucket('weekly', new Date('2026-06-29T00:00')), occurrenceBucket('weekly', new Date('2026-07-05T00:00')))
  assert.notEqual(occurrenceBucket('weekly', new Date('2026-06-28T00:00')), occurrenceBucket('weekly', new Date('2026-06-29T00:00')))
})
