// Routing tests for the /menu additions in src/App.jsx: the route switch
// serves the menu page, and the new toolbar buttons on the chores and grocery
// pages navigate to it (and back). Storage is mocked, so the pages render
// their loaded-empty states without any API — except the menu, which is served
// one meal so the page has something to show.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import App from '../../src/App'
import { MEALS } from '../../scripts/meals-data.cjs'
import { loadTasks, loadMeals } from '../../src/storage'

vi.mock('../../src/storage', () => ({
  loadTasks: vi.fn(),
  loadMeals: vi.fn(),
  addTask: vi.fn().mockResolvedValue(undefined),
  saveTasks: vi.fn().mockResolvedValue(undefined),
  getMeta: vi.fn().mockResolvedValue(null),
  setMeta: vi.fn().mockResolvedValue(undefined),
  bump: vi.fn().mockResolvedValue(undefined),
}))

// Put the app on a route the way a real visit would: URL path + render.
function renderAt(path) {
  window.history.pushState({}, '', path)
  render(<App />)
}

beforeEach(() => {
  vi.clearAllMocks()
  loadTasks.mockResolvedValue([])
  loadMeals.mockResolvedValue([MEALS.find((m) => m.id === 'meal-pad-thai')])
})

describe('route switch', () => {
  it('serves the chores page at /', async () => {
    renderAt('/')
    expect(
      await screen.findByRole('heading', { name: /nala's minion todo list/i }),
    ).toBeInTheDocument()
  })

  it('serves the weekly menu at /menu (deep link / reload)', async () => {
    renderAt('/menu')
    expect(await screen.findByRole('heading', { name: /weekly menu/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Pad Thai' })).toBeInTheDocument()
  })
})

describe('toolbar navigation to the menu', () => {
  it('the chores page toolbar reaches /menu', async () => {
    renderAt('/')
    await userEvent.click(await screen.findByRole('button', { name: /weekly menu/i }))
    expect(await screen.findByRole('heading', { name: 'Pad Thai' })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/menu')
  })

  it('the grocery page toolbar reaches /menu', async () => {
    renderAt('/grocery')
    expect(await screen.findByRole('heading', { name: /grocery list/i })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /weekly menu/i }))
    expect(await screen.findByRole('heading', { name: 'Pad Thai' })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/menu')
  })

  it('the menu page goes back to chores and over to the grocery list', async () => {
    renderAt('/menu')
    await userEvent.click(await screen.findByRole('button', { name: /grocery list/i }))
    expect(window.location.pathname).toBe('/grocery')

    await userEvent.click(await screen.findByRole('button', { name: /weekly menu/i }))
    await userEvent.click(await screen.findByRole('button', { name: /back to chores/i }))
    expect(window.location.pathname).toBe('/')
    expect(
      await screen.findByRole('heading', { name: /nala's minion todo list/i }),
    ).toBeInTheDocument()
  })
})

describe('overdue chores on the Today list', () => {
  const iso = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const daysFromNow = (n) => {
    const d = new Date()
    d.setDate(d.getDate() + n)
    return `${iso(d)}T09:00`
  }

  it('keeps an unfinished chore whose due day has passed, flagged Overdue', async () => {
    loadTasks.mockResolvedValue([
      { id: '1', text: 'Return the cable box', done: false, recurrence: 'once', dueAt: daysFromNow(-2) },
      { id: '2', text: 'Book the movers', done: false, recurrence: 'once', dueAt: daysFromNow(3) },
    ])
    renderAt('/')
    expect(await screen.findByText('Return the cable box')).toBeInTheDocument()
    expect(screen.getByText('Overdue')).toBeInTheDocument()
    expect(screen.queryByText('Book the movers')).not.toBeInTheDocument()
  })

  it('drops a past-due chore once it is checked off', async () => {
    loadTasks.mockResolvedValue([
      { id: '1', text: 'Return the cable box', done: true, recurrence: 'once', dueAt: daysFromNow(-2) },
    ])
    renderAt('/')
    expect(await screen.findByText('Nothing due today')).toBeInTheDocument()
    expect(screen.queryByText('Return the cable box')).not.toBeInTheDocument()
  })
})

describe('chores linked to a public page', () => {
  it('shows a chip that opens the linked section in a new tab', async () => {
    loadTasks.mockResolvedValue([
      {
        id: '1', text: 'Get three tile bids', done: false, recurrence: 'once',
        link: { href: '/moving#bids', label: 'Moving plan · Tile bids' },
      },
    ])
    renderAt('/')
    const chip = await screen.findByRole('link', { name: 'Moving plan · Tile bids' })
    expect(chip).toHaveAttribute('href', `${window.location.origin}/moving#bids`)
    expect(chip).toHaveAttribute('target', '_blank')
  })

  it('clicking the chip does not open the edit dialog', async () => {
    loadTasks.mockResolvedValue([
      { id: '1', text: 'Get three tile bids', done: false, recurrence: 'once', link: { href: '/moving#bids', label: 'Tile bids' } },
    ])
    renderAt('/')
    const chip = await screen.findByRole('link', { name: 'Tile bids' })
    chip.addEventListener('click', (e) => e.preventDefault()) // jsdom can't navigate
    await userEvent.click(chip)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('one-time only filter', () => {
  const both = [
    { id: '1', text: 'Vacuum upstairs', done: false, recurrence: 'weekly', dueAt: '2026-01-05T09:00' },
    { id: '2', text: 'Book the movers', done: false, recurrence: 'once' },
  ]

  beforeEach(() => window.localStorage.clear())

  it('hides recurring chores while on, and brings them back when off', async () => {
    loadTasks.mockResolvedValue(both)
    renderAt('/')
    await userEvent.click(await screen.findByRole('button', { name: /all chores/i }))
    expect(await screen.findByText('Vacuum upstairs')).toBeInTheDocument()
    expect(screen.getByText('Book the movers')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /one-time chores only/i }))
    expect(screen.queryByText('Vacuum upstairs')).not.toBeInTheDocument()
    expect(screen.getByText('Book the movers')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /one-time chores only/i }))
    expect(screen.getByText('Vacuum upstairs')).toBeInTheDocument()
  })

  it('is remembered across visits', async () => {
    window.localStorage.setItem('chores.oneTimeOnly', '1')
    loadTasks.mockResolvedValue(both)
    renderAt('/')
    await userEvent.click(await screen.findByRole('button', { name: /all chores/i }))
    expect(await screen.findByText('Book the movers')).toBeInTheDocument()
    expect(screen.queryByText('Vacuum upstairs')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /one-time chores only/i })).toHaveAttribute('aria-pressed', 'true')
  })

  it('explains an empty list caused by the filter', async () => {
    loadTasks.mockResolvedValue([both[0]])
    renderAt('/')
    await userEvent.click(await screen.findByRole('button', { name: /one-time chores only/i }))
    expect(await screen.findByText('No one-time chores')).toBeInTheDocument()
  })
})
