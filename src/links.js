// The public pages and how chores connect to them.
//
// Standalone pages (the moving plan at /moving, the Japan itinerary at /japan)
// hold the context a chore's one-liner leaves out. This registry is the single
// source of truth for those pages: the chore dialog offers their sections as
// link picks, the chores list gets one filter button per page, the seed scripts
// label links from it, and test/pages.test.mjs checks every public/*.html is
// registered and every section anchor exists. See CLAUDE.md, "Public pages",
// for the steps when adding a page.
//
// A chore connects to a page through `project: '<page key>'` and/or
// `link: { href, label }` where href is site-relative ("/moving#bids"). Pure
// and framework-free so the seed scripts and unit tests can share it.

import { isElectron } from './platform.js'

// Where the public pages live when the app isn't served from the same origin
// (the Electron build loads from file://).
export const SITE_ORIGIN = 'https://nalasminions.netlify.app'

// One entry per standalone page under public/. `key` doubles as the URL path
// (/<key>, rewritten from /<key>.html in netlify.toml) and the chore `project`
// value; `sections` are ids on the page a chore can link to.
export const PAGES = [
  {
    key: 'moving',
    name: 'Moving plan',
    file: 'public/moving.html',
    sections: [
      { id: 'plan', label: 'Week by week' },
      { id: 'rooms', label: 'Room packing order' },
      { id: 'studio', label: 'The studio question' },
      { id: 'mlv', label: 'Vinyl repair' },
      { id: 'listing', label: 'Listing playbook' },
      { id: 'rental', label: 'Renter critical path' },
      { id: 'bids', label: 'Tile bids' },
      { id: 'budget', label: 'Budget' },
    ],
  },
  {
    key: 'japan',
    name: 'Japan',
    file: 'public/japan.html',
    sections: [
      { id: 'flights', label: 'Flights' },
      { id: 'stay', label: 'Accommodations' },
      { id: 'transit', label: 'Getting around' },
      { id: 'budget', label: 'Budget' },
      { id: 'itinerary', label: 'Day-by-day' },
      { id: 'packing', label: 'Must-pack' },
      { id: 'checklist', label: 'Pre-trip checklist' },
    ],
  },
]

export const pagePath = (page) => `/${page.key}`

// Every linkable section across the pages, as { href, label, page }, offered
// as picks in the chore dialog. hrefs are site-relative so they work in local
// dev and on the live site.
export const PAGE_SECTIONS = PAGES.flatMap((p) =>
  p.sections.map((s) => ({
    href: `${pagePath(p)}#${s.id}`,
    label: `${p.name} · ${s.label}`,
    page: p.key,
  })),
)

// The section entry an href points at, if it's one of the known sections.
export const sectionFor = (href) => PAGE_SECTIONS.find((s) => s.href === href) ?? null

// The page an href lands on (any anchor, not just a listed section), or null.
export function pageForHref(href) {
  const path = String(href ?? '').split('#')[0]
  return PAGES.find((p) => pagePath(p) === path) ?? null
}

// The page a chore is connected to: its `project` when that names a page,
// else the page its link points at. null for an ordinary household chore.
export function pageForTask(task) {
  return PAGES.find((p) => p.key === task?.project) ?? pageForHref(task?.link?.href)
}

// A readable label for a link: the section's name for a known section, else
// the page name for a deeper anchor on a known page (e.g. /japan#item-…), else
// the URL's host, else the href itself.
export function linkLabel(href) {
  const known = sectionFor(href)
  if (known) return known.label
  const page = pageForHref(href)
  if (page) return page.name
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
  if (known) return { href: known.href, label: known.label }
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
