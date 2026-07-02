const { contextBridge } = require('electron')

// The renderer talks to MongoDB through the HTTP API (server/index.cjs), the
// same backend the browser uses — there's no separate IPC bridge anymore. Main
// passes the API's base URL as a launch argument; expose it so storage.js can
// build absolute request URLs (the app is loaded from file:// in production, so
// a relative /api wouldn't resolve).
const arg = process.argv.find((a) => a.startsWith('--api-base='))
contextBridge.exposeInMainWorld('API_BASE', arg ? arg.slice('--api-base='.length) : '')
