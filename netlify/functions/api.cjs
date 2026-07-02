// Netlify Function backing the web app's HTTP API in the cloud.
//
// Netlify is a static host and can't run the persistent server in
// server/index.cjs, so this mirrors its /api routes as a serverless function,
// reusing the same MongoDB layer (electron/mongo.cjs) and push helper
// (server/notify.cjs). netlify.toml rewrites /api/* to this function, so the
// client (src/storage.js) needs no changes.
//
// Env vars are configured in the Netlify dashboard (Site settings → Environment
// variables), not from .env: MONGODB_URI (required for tasks), NTFY_TOPIC
// (required for the bump push), and optionally NTFY_SERVER.

const mongo = require('../../electron/mongo.cjs')
const { notify } = require('../../server/notify.cjs')

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify(body),
})

exports.handler = async (event) => {
  // Normalize the path whether Netlify passes the original request path
  // (/api/tasks) or the rewritten target (/.netlify/functions/api/tasks).
  const sub =
    (event.path || '')
      .replace(/^\/\.netlify\/functions\/api/, '')
      .replace(/^\/api/, '') || '/'
  const method = event.httpMethod

  const parseBody = () => {
    try {
      return event.body ? JSON.parse(event.body) : null
    } catch {
      return null
    }
  }

  try {
    // Bump works without a database, so handle it before the Mongo gate.
    if (sub === '/bump' && method === 'POST') {
      await notify(parseBody() || {})
      return json(200, { ok: true })
    }

    if (!mongo.isEnabled()) {
      return json(503, { error: 'MONGODB_URI is not set in the Netlify environment' })
    }

    if (sub === '/tasks' && method === 'GET') return json(200, { tasks: await mongo.loadTasks() })
    if (sub === '/tasks' && method === 'POST') {
      await mongo.addTask(parseBody())
      return json(201, { ok: true })
    }
    if (sub === '/tasks' && method === 'PUT') {
      await mongo.saveTasks(parseBody())
      return json(200, { ok: true })
    }

    if (sub.startsWith('/meta/')) {
      const key = decodeURIComponent(sub.slice('/meta/'.length))
      if (method === 'GET') return json(200, { value: await mongo.getMeta(key) })
      if (method === 'PUT') {
        const body = parseBody()
        await mongo.setMeta(key, body ? body.value : null)
        return json(200, { ok: true })
      }
    }

    return json(404, { error: 'unknown endpoint' })
  } catch (err) {
    console.error('[fn api] error:', err.message)
    return json(500, { error: err.message })
  }
}
