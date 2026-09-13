// Links from a chore to the part of a public page it belongs to.
//
// Many chores mirror an item on one of the standalone pages — the moving plan
// at /moving or the Japan itinerary at /japan — and the page has the context
// the chore's one-liner leaves out. A task can carry `link: { href, label }`;
// the row shows it as a chip that opens the page at that section. Pure and
// framework-free so the seed scripts and unit tests can share it.

import { isElectron } from './platform.js'

// Where the public pages live when the app isn't served from the same origin
// (the Electron build loads from file://).
export const SITE_ORIGIN = 'https://nalasminions.netlify.app'

// The sections a chore can point at, offered as picks in the chore dialog.
// hrefs are site-relative so they work in local dev and on the live site.
export const PAGE_SECTIONS = [
  { href: '/moving#plan', label: 'Moving plan · Week by week' },
  { href: '/moving#rooms', label: 'Moving plan · Room packing order' },
  { href: '/moving#studio', label: 'Moving plan · The studio question' },
  { href: '/moving#mlv', label: 'Moving plan · Vinyl repair' },
  { href: '/moving#listing', label: 'Moving plan · Listing playbook' },
  { href: '/moving#rental', label: 'Moving plan · Renter critical path' },
  { href: '/moving#bids', label: 'Moving plan · Tile bids' },
  { href: '/moving#budget', label: 'Moving plan · Budget' },
  { href: '/japan#flights', label: 'Japan · Flights' },
  { href: '/japan#stay', label: 'Japan · Accommodations' },
  { href: '/japan#transit', label: 'Japan · Getting around' },
  { href: '/japan#budget', label: 'Japan · Budget' },
  { href: '/japan#itinerary', label: 'Japan · Day-by-day' },
  { href: '/japan#packing', label: 'Japan · Must-pack' },
  { href: '/japan#checklist', label: 'Japan · Pre-trip checklist' },
]

// The section entry an href points at, if it's one of the known sections.
export const sectionFor = (href) => PAGE_SECTIONS.find((s) => s.href === href) ?? null

// A readable label for a link: the section's name for a known section, else
// the page name for a deeper anchor on a known page (e.g. /japan#item-…), else
// the URL's host, else the href itself.
export function linkLabel(href) {
  const known = sectionFor(href)
  if (known) return known.label
  const page = String(href).split('#')[0]
  const onPage = PAGE_SECTIONS.find((s) => s.href.split('#')[0] === page)
  if (onPage) return onPage.label.split(' · ')[0]
  try {
    return new URL(href).host
  } catch {
    return href
  }
}

// Turn dialog input into a stored link, or null for none. `option` is a picked
// section (or an existing task link); `text` is whatever is in the box. Free
// text becomes a custom link, with a bare "moving#bids" getting its slash.
export function linkFromInput(option, text) {
  const typed = (text ?? '').trim()
  if (option && option.href && (!typed || typed === option.label)) {
    return { href: option.href, label: option.label || linkLabel(option.href) }
  }
  if (!typed) return null
  const known = PAGE_SECTIONS.find((s) => s.label.toLowerCase() === typed.toLowerCase())
  if (known) return { ...known }
  const href = /^(https?:)?\/\//.test(typed) || typed.startsWith('/') ? typed : `/${typed}`
  return { href, label: linkLabel(href) }
}

// The href to actually navigate to: absolute links as-is; site-relative ones
// against the current origin in the browser, or the live site under Electron
// (file:// has no origin to serve /moving from).
export function resolveLink(href) {
  if (/^(https?:)?\/\//.test(href)) return href
  const origin =
    isElectron || typeof window === 'undefined' || !/^https?:/.test(window.location.origin)
      ? SITE_ORIGIN
      : window.location.origin
  return `${origin}${href}`
}
