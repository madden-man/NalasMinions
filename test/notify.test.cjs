// Unit tests for the ntfy push helper (server/notify.cjs).
//
// global.fetch is stubbed so these run offline and assert the exact request we
// send to ntfy: URL, headers, body, scheduled-delivery header, and cancellation.

const test = require('node:test')
const assert = require('node:assert/strict')

process.env.NTFY_TOPIC = 'test-topic'
delete process.env.NTFY_SERVER

const { notify, cancelScheduled } = require('../server/notify.cjs')

// Install a fetch stub that records calls and returns a canned ntfy response.
function stubFetch({ ok = true, id = 'msg-1' } = {}) {
  const calls = []
  global.fetch = async (url, opts = {}) => {
    calls.push({ url, opts })
    return {
      ok,
      status: ok ? 200 : 500,
      json: async () => ({ id }),
      text: async () => (ok ? '' : 'error'),
    }
  }
  return calls
}

test('notify posts to the topic with default title/body and returns the id', async () => {
  const calls = stubFetch({ id: 'abc' })
  const id = await notify({ source: 'S', event: 'bump' })
  assert.equal(id, 'abc')
  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, 'https://ntfy.sh/test-topic')
  assert.equal(calls[0].opts.method, 'POST')
  assert.equal(calls[0].opts.headers.Title, 'S: bump')
  assert.equal(calls[0].opts.headers.Tags, 'bell')
  assert.equal(calls[0].opts.body, 'Someone triggered "bump" on S.')
})

test('notify honors custom title/message', async () => {
  const calls = stubFetch()
  await notify({ title: 'Chore due: Trash', message: 'Tommy: due' })
  assert.equal(calls[0].opts.headers.Title, 'Chore due: Trash')
  assert.equal(calls[0].opts.body, 'Tommy: due')
})

test('notify sets the At header for scheduled delivery', async () => {
  const calls = stubFetch()
  await notify({ title: 't', at: 1783004400 })
  assert.equal(calls[0].opts.headers.At, '1783004400')
})

test('notify without At omits the header (immediate)', async () => {
  const calls = stubFetch()
  await notify({ title: 't' })
  assert.equal(calls[0].opts.headers.At, undefined)
})

test('notify respects NTFY_SERVER override', async () => {
  process.env.NTFY_SERVER = 'https://ntfy.example.com'
  const calls = stubFetch()
  await notify({ title: 't' })
  assert.equal(calls[0].url, 'https://ntfy.example.com/test-topic')
  delete process.env.NTFY_SERVER
})

test('notify throws a clear error on a non-OK response', async () => {
  stubFetch({ ok: false })
  await assert.rejects(() => notify({ title: 't' }), /ntfy error: 500/)
})

test('notify errors when NTFY_TOPIC is not configured', async () => {
  stubFetch()
  delete process.env.NTFY_TOPIC
  await assert.rejects(() => notify({ title: 't' }), /NTFY_TOPIC is not configured/)
  process.env.NTFY_TOPIC = 'test-topic'
})

test('cancelScheduled issues a DELETE to the message URL', async () => {
  const calls = stubFetch()
  await cancelScheduled('msg-xyz')
  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, 'https://ntfy.sh/test-topic/msg-xyz')
  assert.equal(calls[0].opts.method, 'DELETE')
})

test('cancelScheduled with no id is a no-op', async () => {
  const calls = stubFetch()
  await cancelScheduled(null)
  assert.equal(calls.length, 0)
})
