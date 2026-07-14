// Registers the service worker (public/sw.js) for the installed PWA on
// iPad/iPhone/web. No-ops where a service worker can't or shouldn't run:
//   - Electron loads the app from file://, where service workers don't apply.
//   - Older browsers without navigator.serviceWorker.
// Registration is deferred until load so it never competes with first paint.

export function registerServiceWorker() {
  if (typeof window === 'undefined') return
  if (!('serviceWorker' in navigator)) return
  // file:// (Electron) — skip; SWs require http/https.
  if (window.location.protocol === 'file:') return

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('[pwa] service worker registration failed:', err.message)
    })
  })
}
