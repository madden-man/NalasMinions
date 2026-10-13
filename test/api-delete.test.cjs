// The task write paths of the Netlify function, with the Mongo layer stubbed:
// a bulk PUT only ever upserts, and a DELETE /tasks/:id is the one call that
// removes a chore (and drops its queued reminder). Guards against the 2026-10
// wipe, where a client that failed to load saved an empty list and the old
// PUT deleted everything not in it.

const test = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')

const calls = { saveTasks: [], deleteTask: [], cancelled: [] }
const meta = new Map()
const stub = (rel, exportsObj) => {
  const id = require.resolve(path.join(__dirname, '..', rel))
  require.cache[id] = { id, filename: id, loaded: true, exports: exportsObj }
}
stub('electron/mongo.cjs', {
  isEnabled: () => true,
  loadTasks: async () => [],
  addTask: async () => {},
  saveTasks: async (tasks) => calls.saveTasks.push(tasks),
  deleteTask: async (id) => calls.deleteTask.push(id),
  getMeta: async (k) => meta.get(k) ?? null,
  setMeta: async (k, v) => meta.set(k, v),
})
stub('server/notify.cjs', {
  notify: async () => ({ id: 'queued' }),
  cancelScheduled: async (id) => calls.cancelled.push(id),
})

const { handler } = require('../netlify/functions/api.cjs')
const call = (httpMethod, p, body) =>
  handler({ httpMethod, path: p, headers: {}, body: body == null ? null : JSON.stringify(body) })

test('PUT /tasks with an empty list reaches the store as an upsert of nothing', async () => {
  const res = await call('PUT', '/api/tasks', [])
  assert.equal(res.statusCode, 200)
  assert.deepEqual(calls.saveTasks, [[]])
  assert.deepEqual(calls.deleteTask, [])
})

test('DELETE /tasks/:id removes just that task and cancels its reminder', async () => {
  meta.set('reminder:walk-nala', { at: '2999-01-01T15:00:00.000Z', id: 'push-1' })
  const res = await call('DELETE', '/.netlify/functions/api/tasks/walk-nala')
  assert.equal(res.statusCode, 200)
  assert.deepEqual(calls.deleteTask, ['walk-nala'])
  assert.deepEqual(calls.cancelled, ['push-1'])
  assert.equal(meta.get('reminder:walk-nala'), null)
})

test('DELETE /tasks/ without an id is refused', async () => {
  const res = await call('DELETE', '/api/tasks/')
  assert.equal(res.statusCode, 400)
  assert.deepEqual(calls.deleteTask, ['walk-nala'])
})
