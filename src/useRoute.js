import { useEffect, useState } from 'react'
import { isElectron } from './platform'

// Minimal routing for a two-page app — no router dependency needed.
//
// In the browser the route is the real URL path (/, /grocery): the node server,
// the Netlify redirect, and the service worker all fall back to index.html, so
// deep links and reloads work. Electron loads the app from file://, where
// pushState is unavailable, so there the route lives in the hash (#/grocery).
const readPath = () => {
  if (isElectron) return window.location.hash.replace(/^#/, '') || '/'
  return window.location.pathname || '/'
}

export default function useRoute() {
  const [path, setPath] = useState(readPath)

  useEffect(() => {
    const onChange = () => setPath(readPath())
    // popstate covers browser back/forward; hashchange covers Electron.
    window.addEventListener('popstate', onChange)
    window.addEventListener('hashchange', onChange)
    return () => {
      window.removeEventListener('popstate', onChange)
      window.removeEventListener('hashchange', onChange)
    }
  }, [])

  const navigate = (to) => {
    if (readPath() === to) return
    if (isElectron) {
      window.location.hash = to // fires hashchange, which updates path
    } else {
      window.history.pushState({}, '', to)
      setPath(to)
    }
  }

  return [path, navigate]
}
