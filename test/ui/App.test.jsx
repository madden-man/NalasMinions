// Routing tests for the /menu additions in src/App.jsx: the route switch
// serves the menu page, and the new toolbar buttons on the chores and grocery
// pages navigate to it (and back). Storage is mocked, so the pages render
// their loaded-empty states without any API.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import App from '../../src/App'
import { loadTasks } from '../../src/storage'

vi.mock('../../src/storage', () => ({
  loadTasks: vi.fn(),
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
