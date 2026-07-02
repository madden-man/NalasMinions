// Sends a push notification via ntfy.sh (https://ntfy.sh).
//
// Setup: install the ntfy app on your phone, subscribe to the topic named in
// the NTFY_TOPIC env var, and you'll get a push whenever this runs.
//
// Shared across projects (matches TommysThoughts' server/notify): any caller can
// notify the same phone with { source, event } (or a custom title/message).
// Configure per-deploy:
//   NTFY_TOPIC   - the secret topic to publish to (required)
//   NTFY_SERVER  - defaults to https://ntfy.sh
//
// Used by both the long-running Node server (server/index.cjs) and the Netlify
// function (netlify/functions/api.cjs) so every path sends identical pushes.

async function notify({ source = "Nala's Minions", event = 'bump', message, title } = {}) {
  const topic = process.env.NTFY_TOPIC
  if (!topic) throw new Error('NTFY_TOPIC is not configured')
  const server = process.env.NTFY_SERVER || 'https://ntfy.sh'

  const notifyTitle = title || `${source}: ${event}`
  const notifyBody = message || `Someone triggered "${event}" on ${source}.`

  const response = await fetch(`${server}/${topic}`, {
    method: 'POST',
    headers: {
      Title: notifyTitle,
      Tags: 'bell',
      Priority: 'default',
    },
    body: notifyBody,
  })
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`ntfy error: ${response.status} ${text}`.trim())
  }
}

module.exports = { notify }
