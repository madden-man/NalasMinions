// Unit tests for reminder scheduling (server/schedule.cjs).
//
// These are pure and need no database or network — they pin down the timezone
// conversion and the per-recurrence "next occurrence" math, which is the easy
// place to get subtle bugs (DST, wrong hour, week/month rollover).

const test = require('node:test')
const assert = require('node:assert/strict')

const { nextReminderEpoch, zonedWallToEpoch } = require('../server/schedule.cjs')

const TZ = 'America/Denver'
// "now" = 2026-07-02 08:00 in Denver (MDT, UTC-6) → 14:00 UTC. 2026-07-02 is a Thursday.
const NOW = Date.parse('2026-07-02T14:00:00Z')
const utc = (s) => Date.parse(s)
const task = (over) => ({ id: 't', text: 'x', done: false, ...over })

test('timezone: 09:00 Denver maps to 15:00 UTC', () => {
  assert.equal(zonedWallToEpoch({ y: 2026, mo: 7, d: 2, hh: 9, mi: 0 }, TZ), utc('2026-07-02T15:00:00Z'))
})

test('once: future due today is scheduled', () => {
  assert.equal(
    nextReminderEpoch(task({ recurrence: 'once', dueAt: '2026-07-02T09:00' }), NOW, TZ),
    utc('2026-07-02T15:00:00Z'),
  )
})

test('once: already past → null', () => {
  assert.equal(nextReminderEpoch(task({ recurrence: 'once', dueAt: '2026-07-02T07:00' }), NOW, TZ), null)
})

test('once: done → null', () => {
  assert.equal(
    nextReminderEpoch(task({ recurrence: 'once', dueAt: '2026-07-02T09:00', done: true }), NOW, TZ),
    null,
  )
})

test('no due time → null', () => {
  assert.equal(nextReminderEpoch(task({ recurrence: 'daily' }), NOW, TZ), null)
})

test('daily: later today', () => {
  assert.equal(
    nextReminderEpoch(task({ recurrence: 'daily', dueAt: '2026-06-01T09:00' }), NOW, TZ),
    utc('2026-07-02T15:00:00Z'),
  )
})

test('daily: time already passed → tomorrow', () => {
  assert.equal(
    nextReminderEpoch(task({ recurrence: 'daily', dueAt: '2026-06-01T07:00' }), NOW, TZ),
    utc('2026-07-03T13:00:00Z'),
  )
})

test('daily: completed today → skips to tomorrow', () => {
  assert.equal(
    nextReminderEpoch(
      task({ recurrence: 'daily', dueAt: '2026-06-01T09:00', done: true, completedAt: '2026-07-02T14:30:00Z' }),
      NOW,
      TZ,
    ),
    utc('2026-07-03T15:00:00Z'),
  )
})

test('weekly: due this Thursday later today', () => {
  // anchor 2026-06-25 is a Thursday, same weekday as NOW.
  assert.equal(
    nextReminderEpoch(task({ recurrence: 'weekly', dueAt: '2026-06-25T10:00' }), NOW, TZ),
    utc('2026-07-02T16:00:00Z'),
  )
})

test('weekly: next occurrence beyond 2-day horizon → null', () => {
  // Thursday 06:00 already passed today; next Thursday is 7 days out.
  assert.equal(nextReminderEpoch(task({ recurrence: 'weekly', dueAt: '2026-06-25T06:00' }), NOW, TZ), null)
})

test('biweekly: aligned to anchor, due today', () => {
  // anchor 2026-06-18 Thursday; 2026-07-02 is 14 days later.
  assert.equal(
    nextReminderEpoch(task({ recurrence: 'biweekly', dueAt: '2026-06-18T10:00' }), NOW, TZ),
    utc('2026-07-02T16:00:00Z'),
  )
})

test('monthly: due on the anchor day-of-month later today', () => {
  // anchor day = 2; today is the 2nd.
  assert.equal(
    nextReminderEpoch(task({ recurrence: 'monthly', dueAt: '2026-06-02T12:00' }), NOW, TZ),
    utc('2026-07-02T18:00:00Z'),
  )
})
