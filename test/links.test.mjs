// Unit tests for chore -> public page links (src/links.js).

import test from 'node:test'
import assert from 'node:assert/strict'

import { PAGE_SECTIONS, sectionFor, linkLabel, linkFromInput, resolveLink, SITE_ORIGIN } from '../src/links.js'

test('known sections label themselves', () => {
  assert.equal(linkLabel('/moving#bids'), 'Moving plan · Tile bids')
  assert.equal(linkLabel('/japan#checklist'), 'Japan · Pre-trip checklist')
})

test('a deeper anchor on a known page falls back to the page name', () => {
  assert.equal(linkLabel('/japan#item-ghibli-tickets'), 'Japan')
  assert.equal(linkLabel('/moving#chk-r1'), 'Moving plan')
})

test('unknown URLs label by host, anything else by itself', () => {
  assert.equal(linkLabel('https://www.example.com/x/y'), 'www.example.com')
  assert.equal(linkLabel('/somewhere'), '/somewhere')
})

test('linkFromInput: a picked section wins while its label is in the box', () => {
  const bids = sectionFor('/moving#bids')
  const stored = { href: bids.href, label: bids.label } // stored links carry just these two
  assert.deepEqual(linkFromInput(bids, bids.label), stored)
  assert.deepEqual(linkFromInput(bids, ''), stored)
})

test('linkFromInput: typed text overrides a stale pick', () => {
  const bids = sectionFor('/moving#bids')
  assert.deepEqual(linkFromInput(bids, 'https://example.com/a'), {
    href: 'https://example.com/a',
    label: 'example.com',
  })
})

test('linkFromInput: typing a section name selects it; bare paths get a slash', () => {
  assert.deepEqual(linkFromInput(null, 'japan · flights'), { href: '/japan#flights', label: 'Japan · Flights' })
  assert.deepEqual(linkFromInput(null, 'moving#rooms'), { href: '/moving#rooms', label: 'Moving plan · Room packing order' })
})

test('linkFromInput: nothing in, null out', () => {
  assert.equal(linkFromInput(null, ''), null)
  assert.equal(linkFromInput(null, '   '), null)
})

test('resolveLink: absolute stays, relative goes to the live site outside a browser', () => {
  assert.equal(resolveLink('https://example.com/'), 'https://example.com/')
  assert.equal(resolveLink('/moving#bids'), `${SITE_ORIGIN}/moving#bids`)
})

test('every section href has a page and an anchor', () => {
  for (const s of PAGE_SECTIONS) assert.match(s.href, /^\/(moving|japan)#[a-z]+$/)
})
