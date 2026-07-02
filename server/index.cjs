// Minimal HTTP API so the web build (browser / iPad / phone) can reach MongoDB.
//
// The MongoDB driver needs Node, so it can't run in a browser. This server
// holds the connection and exposes a tiny REST API that mirrors the Electron
// preload bridge; the renderer (src/storage.js) calls it with fetch. It reuses
// electron/mongo.cjs so Electron and the web app share one persistence layer,
// and it also serves the built static app (dist/) so iPad/phone can load
// everything from a single origin.

const path = require('path')
// Load MONGODB_URI from .env before anything reads process.env.
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const http = require('http')
const fs = require('fs')
const mongo = require('../electron/mongo.cjs')
const { notify } = require('./notify.cjs')

const PORT = process.env.PORT || 3001
const DIST = path.join(__dirname, '..', 'dist')

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
}

function sendJson(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    // Permissive CORS so the app works even if it's hosted on a different
    // origin than this API (same-origin needs no headers, so this is just slack).
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  })
  res.end(JSON.stringify(body))
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', (chunk) => {
      raw += chunk
      if (raw.length > 1e6) req.destroy() // ~1 MB guard
    })
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : null)
      } catch (e) {
        reject(e)
      }
    })
    req.on('error', reject)
  })
}

function serveStatic(pathname, res) {
  const rel = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '')
  const filePath = path.join(DIST, rel)
  // Keep requests inside dist/.
  if (!filePath.startsWith(DIST)) return sendJson(res, 403, { error: 'forbidden' })

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // SPA fallback: serve index.html for unknown paths.
      return fs.readFile(path.join(DIST, 'index.html'), (e2, html) => {
        if (e2) {
          res.writeHead(404, { 'Content-Type': 'text/plain' })
          return res.end('Not found. Run `npm run build` first.')
        }
        res.writeHead(200, { 'Content-Type': MIME['.html'] })
        res.end(html)
      })
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' })
    res.end(data)
  })
}

async function handler(req, res) {
  const { method } = req
  const url = new URL(req.url, `http://${req.headers.host}`)
  const p = url.pathname

  // CORS preflight.
  if (method === 'OPTIONS') return sendJson(res, 204, {})

  // Bump → push notification. Kept independent of MongoDB so it works even when
  // the database isn't configured, and so other projects can reuse it by POSTing
  // a different { type }.
  if (p === '/api/bump' && method === 'POST') {
    try {
      const body = await readBody(req).catch(() => null)
      await notify(body || {})
      return sendJson(res, 200, { ok: true })
    } catch (err) {
      console.error('[server] bump error:', err.message)
      return sendJson(res, 502, { error: err.message })
    }
  }

  // Everything else under /api needs MongoDB.
  if (p.startsWith('/api/')) {
    if (!mongo.isEnabled()) {
      return sendJson(res, 503, { error: 'MONGODB_URI is not set — see .env.example' })
    }
    try {
      if (p === '/api/tasks' && method === 'GET') {
        return sendJson(res, 200, { tasks: await mongo.loadTasks() })
      }
      if (p === '/api/tasks' && method === 'POST') {
        await mongo.addTask(await readBody(req)) // upsert one task
        return sendJson(res, 201, { ok: true })
      }
      if (p === '/api/tasks' && method === 'PUT') {
        await mongo.saveTasks(await readBody(req)) // bulk sync the whole array
        return sendJson(res, 200, { ok: true })
      }
      if (p.startsWith('/api/meta/')) {
        const key = decodeURIComponent(p.slice('/api/meta/'.length))
        if (method === 'GET') return sendJson(res, 200, { value: await mongo.getMeta(key) })
        if (method === 'PUT') {
          const body = await readBody(req)
          await mongo.setMeta(key, body ? body.value : null)
          return sendJson(res, 200, { ok: true })
        }
      }
      return sendJson(res, 404, { error: 'unknown endpoint' })
    } catch (err) {
      console.error('[server] api error:', err.message)
      return sendJson(res, 500, { error: err.message })
    }
  }

  // Otherwise serve the built app.
  serveStatic(p, res)
}

// Start the API server on `port` and return the http.Server. Reused by the CLI
// (`npm run server`) and by the Electron main process, so desktop and web share
// one backend. If the port is already taken (e.g. another instance is running),
// log and carry on — clients just use the server that's already there.
function start(port = PORT) {
  const server = http.createServer(handler)
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[server] port ${port} already in use — reusing the existing API server`)
    } else {
      console.error('[server] error:', err.message)
    }
  })
  server.listen(port, () => {
    console.log(`[server] listening on http://localhost:${port}`)
    if (!mongo.isEnabled()) {
      console.warn('[server] MONGODB_URI is not set — /api calls will return 503.')
      console.warn('[server] Copy .env.example to .env and add your connection string.')
    } else {
      console.log('[server] MongoDB enabled (tommy-data.nalas-minions)')
    }
  })
  return server
}

module.exports = { start }

// Run directly (`node server/index.cjs`): start and close Mongo cleanly on exit.
if (require.main === module) {
  const server = start()
  for (const sig of ['SIGINT', 'SIGTERM']) {
    process.on(sig, () => {
      server.close()
      mongo.close().finally(() => process.exit(0))
    })
  }
}
