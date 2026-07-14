/* Service worker for Nala's Minion Todo List.
 *
 * Goal: make the installed PWA launch instantly and survive being offline,
 * without ever serving stale task data. Strategy by request type:
 *
 *   - /api/*            -> network only, never cached (live MongoDB data).
 *   - navigations       -> network first, fall back to the cached app shell so
 *                          the app still opens with no connection.
 *   - other GET (same   -> stale-while-revalidate: serve the cached copy at
 *     origin: JS/CSS/     once and refresh it in the background. Vite hashes
 *     fonts/icons)        these filenames, so a new build fetches new URLs and
 *                         the cache fills itself; old entries are swept on
 *                         activate when the cache version bumps.
 *
 * Bump CACHE_VERSION whenever this file's caching logic changes so old caches
 * are cleared on activate.
 */

const CACHE_VERSION = 'v1'
const CACHE = `nalas-minions-${CACHE_VERSION}`

// The minimum needed to boot the app offline. Hashed assets are added at
// runtime by the fetch handler.
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // Only handle our own origin; let cross-origin requests (e.g. a remote API or
  // ntfy) go straight to the network.
  if (url.origin !== self.location.origin) return

  // Never cache API calls — the list must always reflect the database.
  if (url.pathname.startsWith('/api/')) return

  // Navigations: network first, fall back to the cached shell when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html').then((r) => r || caches.match('/'))),
    )
    return
  }

  // Everything else same-origin: stale-while-revalidate.
  event.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(request).then((cached) => {
        const network = fetch(request)
          .then((response) => {
            if (response && response.ok) cache.put(request, response.clone())
            return response
          })
          .catch(() => cached)
        return cached || network
      }),
    ),
  )
})
