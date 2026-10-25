// The public-page rule (CLAUDE.md, "Public pages"): every standalone page under
// public/ is registered in src/links.js PAGES, served at /<key> by a
// netlify.toml rewrite, and has every registered section as an element id. A
// new page fails here until it's wired up the same way as /moving and /japan,
// which is what gives it a filter button, link picks, and seedable chores.

import test from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

import { PAGES, PAGE_SECTIONS, pageForTask } from '../src/links.js'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (rel) => readFileSync(path.join(root, rel), 'utf8')

const htmlPages = readdirSync(path.join(root, 'public')).filter((f) => f.endsWith('.html'))

test('every public/*.html is a registered page', () => {
  const registered = new Set(PAGES.map((p) => p.file))
  for (const f of htmlPages) {
    assert.ok(registered.has(`public/${f}`), `public/${f} is not in PAGES (src/links.js) — see CLAUDE.md, "Public pages"`)
  }
})

test('every registered page exists, has a key matching its file, and a name', () => {
  for (const p of PAGES) {
    assert.match(p.key, /^[a-z][a-z0-9-]*$/, `${p.key}: keys are lowercase slugs (they are URL paths and project values)`)
    assert.equal(p.file, `public/${p.key}.html`, `${p.key}: file must be public/<key>.html`)
    assert.ok(htmlPages.includes(`${p.key}.html`), `${p.file} is registered but missing`)
    assert.ok(p.name && p.sections.length, `${p.key}: needs a name and at least one section`)
  }
})

test('netlify.toml serves each page at /<key>, ahead of the SPA fallback', () => {
  const toml = read('netlify.toml')
  const fallback = toml.indexOf('from = "/*"')
  assert.ok(fallback > 0, 'SPA fallback rewrite not found')
  for (const p of PAGES) {
    const at = toml.indexOf(`from = "/${p.key}"`)
    assert.ok(at > 0, `netlify.toml has no rewrite for /${p.key}`)
    assert.ok(at < fallback, `/${p.key} rewrite must come before the /* SPA fallback`)
    assert.ok(toml.includes(`to = "/${p.key}.html"`), `/${p.key} must rewrite to /${p.key}.html`)
  }
})

test('every registered section is an element id on its page', () => {
  for (const p of PAGES) {
    const html = read(p.file)
    for (const s of p.sections) {
      assert.ok(
        new RegExp(`\\sid="${s.id}"`).test(html),
        `${p.file}: no element with id="${s.id}" for section "${s.label}"`,
      )
    }
  }
})

test('section hrefs are unique and site-relative', () => {
  const hrefs = PAGE_SECTIONS.map((s) => s.href)
  assert.equal(new Set(hrefs).size, hrefs.length, 'duplicate section href')
  for (const h of hrefs) assert.match(h, /^\/[a-z0-9-]+#[a-z][a-z0-9-]*$/)
})

test('a chore connects to a page by project or by link', () => {
  assert.equal(pageForTask({ project: 'moving' })?.key, 'moving')
  assert.equal(pageForTask({ link: { href: '/japan#item-ghibli-tickets' } })?.key, 'japan')
  assert.equal(pageForTask({ project: 'household' }), null)
  assert.equal(pageForTask({ text: 'Vacuum' }), null)
})

test('every Japan chore links to a checklist item on /japan', () => {
  const { JAPAN_TASKS } = createRequire(import.meta.url)('../scripts/japan-tasks.cjs')
  const html = read('public/japan.html')
  const ids = JAPAN_TASKS.map((t) => t.id)
  assert.equal(new Set(ids).size, ids.length, 'duplicate Japan chore id')
  for (const t of JAPAN_TASKS) {
    assert.ok(html.includes(`id="item-${t.item}"`), `public/japan.html has no #item-${t.item}`)
    assert.match(t.due, /^\d{4}-\d{2}-\d{2}$/)
  }
})

test('every Japan packing chore links to a registered /japan-packing section', () => {
  const { JAPAN_PACKING_TASKS } = createRequire(import.meta.url)('../scripts/japan-packing-tasks.cjs')
  const page = PAGES.find((p) => p.key === 'japan-packing')
  for (const t of JAPAN_PACKING_TASKS) {
    assert.ok(page.sections.some((s) => s.id === t.section), `${t.id}: #${t.section} is not a /japan-packing section`)
    assert.match(t.due, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
    assert.ok(['Tommy', 'Alison'].includes(t.assignee))
  }
})
