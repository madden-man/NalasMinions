// Push notifications for the "Bump" button, delivered via ntfy.sh.
//
// Shared by the long-running Node server (server/index.cjs) and the Netlify
// function (netlify/functions/api.cjs) so desktop/self-hosted and the cloud
// deploy send identical pushes. Config comes from env with sensible defaults:
//   NTFY_TOPIC  the ntfy topic to publish to (default: the household topic)
//   NTFY_URL    the ntfy server base URL (default: https://ntfy.sh)

const NTFY_BASE = process.env.NTFY_URL || 'https://ntfy.sh'
const NTFY_TOPIC = process.env.NTFY_TOPIC || 'Ali_Tommy_Bump_Buddies'

// Publish a bump. ntfy takes a plain POST: the message is the body, while
// Title/Priority/Tags ride along as headers (which must stay ASCII). `type`
// (e.g. "housework") lets several projects share one topic while still saying
// which app was bumped.
async function sendBump(type) {
  const kind = String(type || 'housework').replace(/[^\x20-\x7e]/g, '').trim().slice(0, 40) || 'housework'
  const res = await fetch(`${NTFY_BASE}/${encodeURIComponent(NTFY_TOPIC)}`, {
    method: 'POST',
    headers: { Title: 'Bump!', Priority: 'high', Tags: 'bell' },
    body: `Someone bumped ${kind} 🐾`,
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`ntfy ${res.status}: ${detail.slice(0, 200)}`.trim())
  }
}

module.exports = { sendBump }
