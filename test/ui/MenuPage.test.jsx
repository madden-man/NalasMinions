// Component tests for the weekly menu page (src/MenuPage.jsx): meals render,
// picking one writes its ingredients into the grocery task's one-offs (and
// persists via storage.addTask), the recipe dialog shows the instructions, and
// the toolbar navigates. Persistence is mocked at the storage module — these
// tests never touch the API or MongoDB.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import MenuPage from '../../src/MenuPage'
import { MEALS } from '../../src/menu.js'
import { createGroceryTask, addOneOff, GROCERY_TASK_ID } from '../../src/grocery.js'
import { loadTasks, addTask } from '../../src/storage'

vi.mock('../../src/storage', () => ({
  loadTasks: vi.fn(),
  addTask: vi.fn(),
}))

const padThai = MEALS.find((m) => m.id === 'meal-pad-thai')
const pizza = MEALS.find((m) => m.id === 'meal-flatbread-pizza')

// Render the page with a stored grocery task (or none) and wait for the load
// effect to enable the meal cards.
async function renderPage({ stored = createGroceryTask(), navigate = vi.fn() } = {}) {
  loadTasks.mockResolvedValue(stored ? [stored] : [])
  addTask.mockResolvedValue(undefined)
  render(<MenuPage navigate={navigate} />)
  await waitFor(() =>
    expect(screen.getByRole('button', { name: /add pad thai to this week/i })).toBeEnabled(),
  )
  return navigate
}

beforeEach(() => vi.clearAllMocks())

describe('rendering', () => {
  it('shows every meal with its description and ingredient count', async () => {
    await renderPage()
    for (const meal of MEALS) {
      expect(screen.getByText(meal.name)).toBeInTheDocument()
      expect(screen.getByText(meal.description)).toBeInTheDocument()
      // The count reflects a pick: base ingredients plus kept options.
      const count = meal.ingredients.length + (meal.options?.length ?? 0)
      expect(
        within(screen.getByText(meal.name).closest('.MuiCard-root')).getByText(
          `${count} ingredients`,
        ),
      ).toBeInTheDocument()
    }
  })

  it('disables adding until the grocery task has loaded', async () => {
    let resolveLoad
    loadTasks.mockReturnValue(new Promise((r) => (resolveLoad = r)))
    render(<MenuPage navigate={vi.fn()} />)
    expect(screen.getByRole('button', { name: /add pad thai to this week/i })).toBeDisabled()
    resolveLoad([createGroceryTask()])
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /add pad thai to this week/i })).toBeEnabled(),
    )
  })

  it('surfaces a load failure instead of dead buttons', async () => {
    loadTasks.mockRejectedValue(new Error('mongo down'))
    render(<MenuPage navigate={vi.fn()} />)
    expect(await screen.findByText(/couldn't load the grocery list/i)).toBeInTheDocument()
    expect(screen.getByText(/mongo down/)).toBeInTheDocument()
  })
})

describe('picking a meal', () => {
  it('adds the ingredients to the grocery task and persists it', async () => {
    await renderPage()
    await userEvent.click(screen.getByRole('button', { name: /add pad thai to this week/i }))

    await waitFor(() => expect(addTask).toHaveBeenCalledTimes(1))
    const saved = addTask.mock.calls[0][0]
    expect(saved.id).toBe(GROCERY_TASK_ID)
    expect(saved.oneOffs.map((i) => i.text)).toEqual(expect.arrayContaining(padThai.ingredients))
    // Staples are untouched — only the one-offs grew.
    expect(saved.items).toEqual(createGroceryTask().items)

    expect(
      screen.getByText(`${padThai.name}: ${padThai.ingredients.length} ingredients added to the grocery list`),
    ).toBeInTheDocument()
  })

  it('does not duplicate or re-save when everything is already listed', async () => {
    let stored = createGroceryTask()
    for (const ing of padThai.ingredients) stored = addOneOff(stored, ing)
    await renderPage({ stored })

    await userEvent.click(screen.getByRole('button', { name: /add pad thai to this week/i }))
    expect(
      screen.getByText(`${padThai.name}: everything is already on the grocery list`),
    ).toBeInTheDocument()
    expect(addTask).not.toHaveBeenCalled()
  })

  it('seeds the grocery task on a first-ever visit, then adds to that seed', async () => {
    await renderPage({ stored: null })
    // The seed itself is persisted by the load effect…
    await waitFor(() => expect(addTask).toHaveBeenCalledTimes(1))
    expect(addTask.mock.calls[0][0].id).toBe(GROCERY_TASK_ID)

    // …and picking a meal upserts again, now with the ingredients aboard.
    await userEvent.click(screen.getByRole('button', { name: /add pad thai to this week/i }))
    await waitFor(() => expect(addTask).toHaveBeenCalledTimes(2))
    expect(addTask.mock.calls[1][0].oneOffs.map((i) => i.text)).toEqual(
      expect.arrayContaining(padThai.ingredients),
    )
  })

  it('keeps all optional toppings by default', async () => {
    await renderPage()
    await userEvent.click(
      screen.getByRole('button', { name: /add flatbread pizzas to this week/i }),
    )
    await waitFor(() => expect(addTask).toHaveBeenCalledTimes(1))
    const texts = addTask.mock.calls[0][0].oneOffs.map((i) => i.text)
    expect(texts).toEqual(expect.arrayContaining([...pizza.ingredients, ...pizza.options]))
  })

  it('leaves a toggled-off topping out of the grocery list', async () => {
    await renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Sausage' }))
    await userEvent.click(
      screen.getByRole('button', { name: /add flatbread pizzas to this week/i }),
    )

    await waitFor(() => expect(addTask).toHaveBeenCalledTimes(1))
    const texts = addTask.mock.calls[0][0].oneOffs.map((i) => i.text)
    expect(texts).toEqual(expect.arrayContaining(['Mozzarella cheese', 'Pepperoni']))
    expect(texts).not.toContain('Sausage')
    expect(
      screen.getByText(
        `${pizza.name}: ${pizza.ingredients.length + 2} ingredients added to the grocery list`,
      ),
    ).toBeInTheDocument()
  })

  it('the toast links straight to the grocery list', async () => {
    const navigate = await renderPage()
    await userEvent.click(screen.getByRole('button', { name: /add pad thai to this week/i }))
    await userEvent.click(screen.getByRole('button', { name: /view list/i }))
    expect(navigate).toHaveBeenCalledWith('/grocery')
  })
})

describe('recipe dialog', () => {
  it('shows the ingredients and the cleaned-up instructions', async () => {
    await renderPage()
    await userEvent.click(screen.getByRole('button', { name: /pad thai recipe/i }))

    const dialog = await screen.findByRole('dialog')
    for (const ing of padThai.ingredients) {
      expect(within(dialog).getByText(ing)).toBeInTheDocument()
    }
    for (const step of padThai.steps) {
      expect(within(dialog).getByText(step)).toBeInTheDocument()
    }
  })

  it('marks optional extras in the ingredient list', async () => {
    await renderPage()
    await userEvent.click(screen.getByRole('button', { name: /flatbread pizzas recipe/i }))
    const dialog = await screen.findByRole('dialog')
    for (const opt of pizza.options) {
      expect(within(dialog).getByText(opt)).toBeInTheDocument()
    }
    expect(within(dialog).getAllByText('optional')).toHaveLength(pizza.options.length)
  })

  it('can add the ingredients from inside the recipe, then closes', async () => {
    await renderPage()
    await userEvent.click(screen.getByRole('button', { name: /pad thai recipe/i }))
    await userEvent.click(
      screen.getByRole('button', { name: /add ingredients to grocery list/i }),
    )

    await waitFor(() => expect(addTask).toHaveBeenCalledTimes(1))
    expect(addTask.mock.calls[0][0].oneOffs.map((i) => i.text)).toEqual(
      expect.arrayContaining(padThai.ingredients),
    )
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})

describe('toolbar navigation', () => {
  it('goes back to chores and over to the grocery list', async () => {
    const navigate = await renderPage()
    await userEvent.click(screen.getByRole('button', { name: /back to chores/i }))
    expect(navigate).toHaveBeenCalledWith('/')
    await userEvent.click(screen.getByRole('button', { name: /grocery list/i }))
    expect(navigate).toHaveBeenCalledWith('/grocery')
  })
})
