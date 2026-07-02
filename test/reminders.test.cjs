// Unit tests for the reminder orchestrator (server/schedule.cjs's
// ensureReminderScheduled) — the schedule / dedup / reschedule / cancel logic.
// Fully mocked (notify, cancel, marker store), so no database or network.

const test = require('node:test')
const assert = require('node:assert/strict')

const { ensureReminderScheduled } = require('../server/schedule.cjs')

const TZ = 'America/Denver'
// 2026-07-02 08:00 Denver (MDT) → 14:00 UTC.
const NOW = Date.parse('2026-07-02T14:00:00Z')
const AT_9AM = '2026-07-02T15:00:00.000Z' // today 09:00 Denver
const daily = () => ({ id: 't', text: 'Trash', assignee: 'Tommy', recurrence: 'daily', dueAt: '2026-06-01T09:00' })

function harness(markers = {}) {
  const events = { notified: [], canceled: [] }
  const deps = {
    nowMs: NOW,
    tz: TZ,
    notify: async (p) => {
      events.notified.push(p)
      return `id-${events.notified.length}`
    },
    cancelScheduled: async (id) => events.canceled.push(id),
    getMarker: async (id) => markers[id] ?? null,
    setMarker: async (id, v) => {
      markers[id] = v
    },
  }
  return { markers, events, deps }
}

test('schedules a reminder for the next occurrence and records the marker', async () => {
  const h = harness()
  const at = await ensureReminderScheduled(daily(), h.deps)
  assert.equal(at, AT_9AM)
  assert.equal(h.events.notified.length, 1)
  assert.equal(h.events.notified[0].at, Math.floor(Date.parse(AT_9AM) / 1000))
  assert.equal(h.events.notified[0].title, 'Chore due: Trash')
  assert.deepEqual(h.markers.t, { at: AT_9AM, id: 'id-1' })
})

test('is idempotent: same occurrence already queued → no re-send', async () => {
  const h = harness({ t: { at: AT_9AM, id: 'existing' } })
  const at = await ensureReminderScheduled(daily(), h.deps)
  assert.equal(at, null)
  assert.equal(h.events.notified.length, 0)
  assert.equal(h.events.canceled.length, 0)
})

test('reschedule: occurrence moved → cancels the stale push, queues the new one', async () => {
  // Marker points at a different, still-future occurrence (e.g. an edited time).
  const h = harness({ t: { at: '2026-07-02T20:00:00.000Z', id: 'old' } })
  const at = await ensureReminderScheduled(daily(), h.deps)
  assert.equal(at, AT_9AM)
  assert.deepEqual(h.events.canceled, ['old'])
  assert.equal(h.events.notified.length, 1)
  assert.deepEqual(h.markers.t, { at: AT_9AM, id: 'id-1' })
})

test('cancel: nothing to remind (completed one-off) → cancels pending push, clears marker', async () => {
  const doneOnce = { id: 't', text: 'x', recurrence: 'once', done: true, dueAt: '2026-07-02T09:00' }
  const h = harness({ t: { at: AT_9AM, id: 'old' } })
  const at = await ensureReminderScheduled(doneOnce, h.deps)
  assert.equal(at, null)
  assert.deepEqual(h.events.canceled, ['old'])
  assert.equal(h.markers.t, null)
  assert.equal(h.events.notified.length, 0)
})

test('immediate: due within 10s → sends now (no At header)', async () => {
  const h = harness()
  h.deps.nowMs = Date.parse('2026-07-02T13:59:55Z') // 5s before an 08:00 Denver due time
  const task = { id: 't', text: 'x', recurrence: 'once', dueAt: '2026-07-02T08:00' }
  await ensureReminderScheduled(task, h.deps)
  assert.equal(h.events.notified.length, 1)
  assert.equal(h.events.notified[0].at, undefined)
})
