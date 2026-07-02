// End-to-end tests for the HTTP API in server/index.cjs.
//
// These boot the *real* server on an ephemeral port and drive it with fetch,
// exercising the full path the app uses: HTTP handler -> electron/mongo.cjs ->
// Atlas. If the Mongo connection is broken (bad URI, dead cluster, a runtime
// whose TLS stack can't reach Atlas), GET /api/tasks comes back 500 with the
// driver error instead of 200 — so these fail loudly with that message.
//
// Run under Electron's bundled runtime (`npm run test:electron`) to also catch
// runtime/TLS regressions; see connection.test.cjs for why that matters.
//
// Safety: the read tests never mutate data, and the one write test round-trips a
// namespaced key in the `meta` collection ("__integration_test__"), so it never
// touches real tasks or app state.

const test = require('node:test')
const assert = require('node:assert/strict')
const path = require('path')

require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const apiServer = require('../server/index.cjs')
const mongo = require('../electron/mongo.cjs')

const dbSkip = mongo.isEnabled() ? false : 'MONGODB_URI not set — copy .env.example to .env'

let server
let base

test.before(async () => {
  server = apiServer.start(0) // port 0 -> OS assigns a free port
  await new Promise((resolve) => server.once('listening', resolve))
  base = `http://localhost:${server.address().port}`
})

test.after(async () => {
  await new Promise((resolve) => server.close(resolve))
  await mongo.close()
})

test('CORS preflight (OPTIONS) returns 204 with permissive headers', async () => {
  const res = await fetch(`${base}/api/tasks`, { method: 'OPTIONS' })
  assert.equal(res.status, 204)
  assert.equal(res.headers.get('access-control-allow-origin'), '*')
  // Drain the body so the socket is released.
  await res.text()
})

test('GET /api/tasks returns 200 and a tasks array', { skip: dbSkip }, async () => {
  const res = await fetch(`${base}/api/tasks`)
  const body = await res.json()
  // A broken Mongo connection surfaces here as 500 + the driver error message,
  // so include the body in the assertion to make failures self-explanatory.
  assert.equal(res.status, 200, `expected 200, got ${res.status}: ${JSON.stringify(body)}`)
  assert.ok(Array.isArray(body.tasks), `expected tasks array, got ${JSON.stringify(body)}`)
})

test('meta round-trips through the API (write path)', { skip: dbSkip }, async () => {
  const key = '__integration_test__'
  const value = `ping-${Date.now()}`

  const put = await fetch(`${base}/api/meta/${key}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value }),
  })
  assert.equal(put.status, 200, `PUT meta failed: ${put.status} ${await put.text()}`)

  const get = await fetch(`${base}/api/meta/${key}`)
  const body = await get.json()
  assert.equal(get.status, 200)
  assert.equal(body.value, value)
})

test('unknown /api endpoint returns 404', { skip: dbSkip }, async () => {
  const res = await fetch(`${base}/api/does-not-exist`)
  assert.equal(res.status, 404)
  await res.text()
})
