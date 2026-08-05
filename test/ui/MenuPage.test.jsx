// Component tests for the weekly menu page (src/MenuPage.jsx): the meals
// fetched from MongoDB render, picking one writes its ingredients into the
// grocery task's one-offs (and persists via storage.addTask), the recipe dialog
// shows the instructions, and the toolbar navigates. Both the menu and the
// grocery task are mocked at the storage module — these tests never touch the
// API or MongoDB. The meal fixtures are the seed catalog the collection is
// published from (scripts/meals-data.cjs).

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import MenuPage from '../../src/MenuPage'
import { MEALS } from '../../scripts/meals-data.cjs'
import { createGroceryTask, addOneOff, GROCERY_TASK_ID } from '../../src/grocery.js'
import { loadTasks, loadMeals, addMeal, addTask, pullIngredients, saveMeal, resetMeal } from '../../src/storage'

vi.mock('../../src/storage', () => ({
  loadTasks: vi.fn(),
  loadMeals: vi.fn(),
  addMeal: vi.fn(),
  addTask: vi.fn(),
  pullIngredients: vi.fn(),
  saveMeal: vi.fn(),
  resetMeal: vi.fn(),
}))

const padThai = MEALS.find((m) => m.id === 'meal-pad-thai')
const pizza = MEALS.find((m) => m.id === 'meal-flatbread-pizza')

// Render the page with a menu (the seed catalog by default) and a stored
// grocery task (or none), then wait for both load effects to settle — the meal
// cards only exist once the menu has arrived, and they stay disabled until the
// grocery task has.
async function renderPage({
  stored = createGroceryTask(),
  meals = MEALS,
  navigate = vi.fn(),
  openMealId = null,
} = {}) {
  loadTasks.mockResolvedValue(stored ? [stored] : [])
  loadMeals.mockResolvedValue(meals)
  addTask.mockResolvedValue(undefined)
  render(<MenuPage navigate={navigate} openMealId={openMealId} />)
  // The first meal's add button is the signal that both loads have settled —
  // taken from whatever menu this render was given, not a fixed dish.
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: `add ${meals[0].name} to this week` }),
    ).toBeEnabled(),
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
    loadMeals.mockResolvedValue(MEALS)
    render(<MenuPage navigate={vi.fn()} />)
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /add pad thai to this week/i })).toBeDisabled(),
    )
    resolveLoad([createGroceryTask()])
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /add pad thai to this week/i })).toBeEnabled(),
    )
  })

  it('surfaces a load failure instead of dead buttons', async () => {
    loadTasks.mockRejectedValue(new Error('mongo down'))
    loadMeals.mockResolvedValue(MEALS)
    render(<MenuPage navigate={vi.fn()} />)
    expect(await screen.findByText(/couldn't load the grocery list/i)).toBeInTheDocument()
    expect(screen.getByText(/mongo down/)).toBeInTheDocument()
  })

  it('waits on the menu fetch before showing any meals', async () => {
    let resolveMeals
    loadTasks.mockResolvedValue([createGroceryTask()])
    loadMeals.mockReturnValue(new Promise((r) => (resolveMeals = r)))
    render(<MenuPage navigate={vi.fn()} />)

    expect(screen.getByLabelText(/loading the menu/i)).toBeInTheDocument()
    expect(screen.queryByText('Pad Thai')).not.toBeInTheDocument()

    resolveMeals(MEALS)
    expect(await screen.findByText('Pad Thai')).toBeInTheDocument()
    expect(screen.queryByLabelText(/loading the menu/i)).not.toBeInTheDocument()
  })

  it('renders whatever meals the database returns, in that order', async () => {
    const [first, second] = MEALS
    await renderPage({ meals: [second, first] })
    const names = screen.getAllByRole('heading', { level: 6 }).map((h) => h.textContent)
    expect(names).toEqual(expect.arrayContaining([second.name, first.name]))
    expect(names.indexOf(second.name)).toBeLessThan(names.indexOf(first.name))
    // Only those two — the rest of the catalog isn't hardcoded anywhere.
    expect(screen.queryByText(MEALS[2].name)).not.toBeInTheDocument()
  })

  it('surfaces a menu load failure', async () => {
    loadTasks.mockResolvedValue([createGroceryTask()])
    loadMeals.mockRejectedValue(new Error('menu unreachable'))
    render(<MenuPage navigate={vi.fn()} />)
    expect(await screen.findByText(/couldn't load the menu/i)).toBeInTheDocument()
    expect(screen.getByText(/menu unreachable/)).toBeInTheDocument()
  })

  it('says so when the menu collection is empty', async () => {
    loadTasks.mockResolvedValue([createGroceryTask()])
    loadMeals.mockResolvedValue([])
    render(<MenuPage navigate={vi.fn()} />)
    expect(await screen.findByText(/no meals in the menu yet/i)).toBeInTheDocument()
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

  it('links back to an imported recipe\'s source', async () => {
    const imported = { ...MEALS[0], sourceUrl: 'https://example.com/pad-thai' }
    await renderPage({ meals: [imported] })
    await userEvent.click(screen.getByRole('button', { name: /pad thai recipe/i }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('link', { name: /view the original recipe/i })).toHaveAttribute(
      'href',
      'https://example.com/pad-thai',
    )
  })

  it('has no source link on a recipe that came from the seed', async () => {
    await renderPage()
    await userEvent.click(screen.getByRole('button', { name: /pad thai recipe/i }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).queryByRole('link', { name: /original recipe/i })).not.toBeInTheDocument()
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

describe('the verified flag', () => {
  it('checks the recipes that have been cooked and calls out the ones that have not', async () => {
    const [tried] = MEALS
    const untried = { ...MEALS[1], verified: false }
    await renderPage({ meals: [tried, untried] })

    const triedCard = screen.getByText(tried.name).closest('.MuiCard-root')
    const untriedCard = screen.getByText(untried.name).closest('.MuiCard-root')
    expect(within(triedCard).getByLabelText(/^verified recipe$/i)).toBeInTheDocument()
    expect(within(triedCard).queryByText('Untried')).not.toBeInTheDocument()
    expect(within(untriedCard).getByText('Untried')).toBeInTheDocument()
  })

  it('carries the flag into the recipe dialog', async () => {
    const untried = { ...MEALS[0], verified: false }
    await renderPage({ meals: [untried] })
    await userEvent.click(screen.getByRole('button', { name: /pad thai recipe/i }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Untried')).toBeInTheDocument()
  })
})

describe('adding a recipe', () => {
  // Open the "Add recipe" box and paste something into it.
  async function paste(text) {
    await userEvent.click(screen.getByRole('button', { name: /add recipe/i }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.type(within(dialog).getByLabelText(/recipe link or text/i), text)
    return dialog
  }

  it('sends the pasted link to the server and shows the meal it stored', async () => {
    await renderPage({ meals: [MEALS[0]] })
    const added = {
      id: 'meal-congee',
      name: 'Congee',
      description: 'Rice porridge.',
      verified: false,
      ingredients: ['Rice'],
      steps: ['Simmer for an hour.'],
    }
    addMeal.mockResolvedValue(added)

    const dialog = await paste('https://example.com/congee')
    await userEvent.click(within(dialog).getByRole('button', { name: /add to menu/i }))

    await waitFor(() => expect(addMeal).toHaveBeenCalledWith('https://example.com/congee'))
    // The stored meal joins the list without a reload, flagged untried.
    expect(await screen.findByText('Congee')).toBeInTheDocument()
    const card = screen.getByText('Congee').closest('.MuiCard-root')
    expect(within(card).getByText('Untried')).toBeInTheDocument()
    expect(screen.getByText(/congee added to the menu/i)).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    // Only the menu grew — the grocery list wasn't touched.
    expect(addTask).not.toHaveBeenCalled()
  })

  it('sends pasted recipe text just the same', async () => {
    await renderPage({ meals: [MEALS[0]] })
    addMeal.mockResolvedValue({
      id: 'meal-toast',
      name: 'Toast',
      description: '',
      verified: false,
      ingredients: ['Bread'],
      steps: ['Toast it.'],
    })

    const text = 'Toast\nIngredients:\n- Bread\nInstructions:\n- Toast it.'
    const dialog = await paste(text)
    await userEvent.click(within(dialog).getByRole('button', { name: /add to menu/i }))
    await waitFor(() => expect(addMeal).toHaveBeenCalledWith(text))
    expect(await screen.findByText('Toast')).toBeInTheDocument()
  })

  it('keeps the box open with the reason when the paste cannot be read', async () => {
    await renderPage({ meals: [MEALS[0]] })
    addMeal.mockRejectedValue(new Error('Couldn\'t find an "Ingredients:" line'))

    const dialog = await paste('dinner thoughts')
    await userEvent.click(within(dialog).getByRole('button', { name: /add to menu/i }))

    expect(await within(dialog).findByText(/couldn't find an "ingredients:" line/i)).toBeInTheDocument()
    // Still open, and what was typed is still there to fix.
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(within(dialog).getByLabelText(/recipe link or text/i)).toHaveValue('dinner thoughts')
  })

  it('will not submit an empty box', async () => {
    await renderPage({ meals: [MEALS[0]] })
    await userEvent.click(screen.getByRole('button', { name: /add recipe/i }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('button', { name: /add to menu/i })).toBeDisabled()
    expect(addMeal).not.toHaveBeenCalled()
  })
})

describe('dishes from the shared recipe library', () => {
  // What loadMeals hands back for a tommy-data.recipes document: no steps, a
  // labelled link, produce as the ingredients, never verified.
  const libraryDish = {
    id: 'recipe-6a70f2a8ec268d4f241e9b9b',
    name: 'Chicken Katsu with Rice & Cabbage',
    description: 'Japanese — some technique',
    verified: false,
    ingredients: ['Cabbage', 'Daikon'],
    options: ['Miso Soup', 'Mochi Ice Cream'],
    steps: [],
    links: [
      { label: 'Chicken Katsu (Just One Cookbook)', url: 'https://example.com/katsu' },
      { label: 'Miso Soup', url: 'https://example.com/miso' },
    ],
    sourceUrl: 'https://example.com/katsu',
  }

  it('shows them below the meals we added, marked untried', async () => {
    await renderPage({ meals: [MEALS[0], MEALS[1], libraryDish] })
    const names = screen.getAllByRole('heading', { level: 6 }).map((h) => h.textContent)
    // The page title is an h6 too; what matters is the library dish comes last.
    expect(names.indexOf(libraryDish.name)).toBeGreaterThan(names.indexOf(MEALS[1].name))

    const card = screen.getByText(libraryDish.name).closest('.MuiCard-root')
    expect(within(card).getByText('Untried')).toBeInTheDocument()
    expect(within(card).queryByLabelText(/^verified recipe$/i)).not.toBeInTheDocument()
  })

  it('offers the linked recipes in place of steps', async () => {
    await renderPage({ meals: [libraryDish] })
    await userEvent.click(screen.getByRole('button', { name: `${libraryDish.name} recipe` }))
    const dialog = await screen.findByRole('dialog')

    expect(within(dialog).getByText(/no steps saved for this one/i)).toBeInTheDocument()
    expect(
      within(dialog).getByRole('link', { name: 'Chicken Katsu (Just One Cookbook)' }),
    ).toHaveAttribute('href', 'https://example.com/katsu')
    expect(within(dialog).getByRole('link', { name: 'Miso Soup' })).toHaveAttribute(
      'href',
      'https://example.com/miso',
    )
  })

  it('shops for its produce, with sides and dessert optional', async () => {
    await renderPage({ meals: [libraryDish] })
    // Dessert is opt-out like any other extra.
    await userEvent.click(screen.getByRole('button', { name: 'Mochi Ice Cream' }))
    await userEvent.click(
      screen.getByRole('button', { name: `add ${libraryDish.name} to this week` }),
    )

    await waitFor(() => expect(addTask).toHaveBeenCalledTimes(1))
    const texts = addTask.mock.calls[0][0].oneOffs.map((i) => i.text)
    expect(texts).toEqual(expect.arrayContaining(['Cabbage', 'Daikon', 'Miso Soup']))
    expect(texts).not.toContain('Mochi Ice Cream')
  })

  it('says so instead of shopping when a dish has no ingredients', async () => {
    const bare = { ...libraryDish, ingredients: [], options: [] }
    await renderPage({ meals: [bare] })
    await userEvent.click(
      screen.getByRole('button', { name: `add ${bare.name} to this week` }),
    )

    expect(await screen.findByText(/no ingredients saved for this one/i)).toBeInTheDocument()
    expect(addTask).not.toHaveBeenCalled()
  })
})

// A library dish as the menu now serves it: ingredients read off its recipe
// link, so it carries the recipe's own wording plus the grocery rewrite.
const katsu = {
  id: 'recipe-abc123',
  name: 'Chicken Katsu',
  description: 'Japanese — some technique',
  verified: false,
  ingredients: ['2 bell peppers (orange + red)', '½ tsp Diamond Crystal kosher salt'],
  shopping: ['2 bell peppers'],
  options: [],
  steps: [],
  links: [{ label: 'Chicken Katsu (Just One Cookbook)', url: 'https://example.com/katsu' }],
  sourceUrl: 'https://example.com/katsu',
}

// The same dish before anyone read its link: only the planner's produce note.
const unpulled = {
  ...katsu,
  id: 'recipe-def456',
  name: 'Oyakodon',
  ingredients: ['Onion', 'Mitsuba'],
  shopping: undefined,
  links: [{ label: 'Oyakodon', url: 'https://example.com/oyakodon' }],
  sourceUrl: 'https://example.com/oyakodon',
}

describe('every recipe has a link', () => {
  it("links a household meal to its own permalink, since nobody else publishes it", async () => {
    await renderPage()
    await userEvent.click(screen.getByRole('button', { name: `${padThai.name} recipe` }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Recipe')).toBeInTheDocument()
    const link = within(dialog).getByRole('link', { name: 'Link to this recipe' })
    expect(link).toHaveAttribute('href', expect.stringContaining('/menu/meal-pad-thai'))
    expect(within(dialog).getByText('This recipe lives here')).toBeInTheDocument()
  })

  it('links a library dish to the recipe it was read from', async () => {
    await renderPage({ meals: [katsu] })
    await userEvent.click(screen.getByRole('button', { name: `${katsu.name} recipe` }))
    const dialog = screen.getByRole('dialog')
    expect(
      within(dialog).getByRole('link', { name: 'Chicken Katsu (Just One Cookbook)' }),
    ).toHaveAttribute('href', 'https://example.com/katsu')
  })

  it('opens the recipe named by a permalink', async () => {
    await renderPage({ openMealId: 'meal-pad-thai' })
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())
    expect(within(screen.getByRole('dialog')).getByText(padThai.name)).toBeInTheDocument()
  })
})

describe('ingredients read off the link', () => {
  it('shows the recipe wording but shops from the grocery rewrite', async () => {
    await renderPage({ meals: [katsu] })
    await userEvent.click(screen.getByRole('button', { name: `${katsu.name} recipe` }))
    const dialog = screen.getByRole('dialog')
    // The dialog matches the page the recipe came from…
    expect(within(dialog).getByText('½ tsp Diamond Crystal kosher salt')).toBeInTheDocument()
    expect(within(dialog).getByText('from the recipe')).toBeInTheDocument()

    await userEvent.click(
      within(dialog).getByRole('button', { name: /add ingredients to grocery list/i }),
    )
    // …but the salt it assumes you have never reaches the cart.
    await waitFor(() => expect(addTask).toHaveBeenCalled())
    const saved = addTask.mock.calls.at(-1)[0]
    expect(saved.oneOffs.map((i) => i.text)).toEqual(['2 bell peppers'])
  })

  it('counts what a pick would actually buy, not the full recipe', async () => {
    await renderPage({ meals: [katsu] })
    const card = screen.getByText(katsu.name).closest('.MuiCard-root')
    expect(within(card).getByText('1 ingredients')).toBeInTheDocument()
  })

  it('offers to read the link for a dish still shopping from produce', async () => {
    pullIngredients.mockResolvedValue({
      url: unpulled.sourceUrl,
      name: 'Oyakodon',
      ingredients: ['1 onion, thinly sliced', '1 tsp salt'],
      shopping: ['1 onion'],
    })
    await renderPage({ meals: [unpulled] })
    await userEvent.click(screen.getByRole('button', { name: `${unpulled.name} recipe` }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText(/only the produce to shop for is saved/i)).toBeInTheDocument()

    await userEvent.click(within(dialog).getByRole('button', { name: 'Read it' }))
    await waitFor(() => expect(pullIngredients).toHaveBeenCalledWith(unpulled.sourceUrl))
    // The dialog swaps over to the real list, ready to shop from.
    await waitFor(() =>
      expect(within(screen.getByRole('dialog')).getByText('1 onion, thinly sliced')).toBeInTheDocument(),
    )
  })

  it('says why a link could not be read instead of failing silently', async () => {
    pullIngredients.mockRejectedValue(new Error('the site returned 403'))
    await renderPage({ meals: [unpulled] })
    await userEvent.click(screen.getByRole('button', { name: `${unpulled.name} recipe` }))
    await userEvent.click(screen.getByRole('button', { name: 'Read it' }))
    await waitFor(() =>
      expect(screen.getByText(/Oyakodon: the site returned 403/)).toBeInTheDocument(),
    )
  })
})

describe('the store indicator', () => {
  const tjOrangeChicken = MEALS.find((m) => m.id === 'meal-tj-orange-chicken')

  it("chips the store on the meals that are one shop at one place", async () => {
    await renderPage()
    const card = screen.getByText(tjOrangeChicken.name).closest('.MuiCard-root')
    expect(within(card).getByText("Trader Joe's")).toBeInTheDocument()
  })

  it('shows no chip for a meal cooked from what is in the house', async () => {
    await renderPage()
    const card = screen.getByText(padThai.name).closest('.MuiCard-root')
    expect(padThai.store).toBeUndefined()
    expect(within(card).queryByText(/Trader Joe's|King Soopers/)).not.toBeInTheDocument()
  })

  it('repeats the store in the recipe dialog, where the shop gets planned', async () => {
    await renderPage()
    await userEvent.click(
      screen.getByRole('button', { name: `${tjOrangeChicken.name} recipe` }),
    )
    expect(within(screen.getByRole('dialog')).getByText("Trader Joe's")).toBeInTheDocument()
  })

  it('chips a library dish whose shopping note resolved to one of the five', async () => {
    const libraryDish = { ...katsu, store: 'King Soopers' }
    await renderPage({ meals: [libraryDish] })
    const card = screen.getByText(libraryDish.name).closest('.MuiCard-root')
    expect(within(card).getByText('King Soopers')).toBeInTheDocument()
  })

  it('shows nothing for a library dish that needs a specialty market', async () => {
    // normalizeStore leaves those unset rather than naming the wrong shop.
    await renderPage({ meals: [{ ...katsu, store: undefined }] })
    const card = screen.getByText(katsu.name).closest('.MuiCard-root')
    expect(within(card).queryByText(/Trader Joe's|King Soopers|Costco|Safeway|Whole Foods/))
      .not.toBeInTheDocument()
  })
})

describe('editing a recipe', () => {
  const tjOrangeChicken = MEALS.find((m) => m.id === 'meal-tj-orange-chicken')

  const openEditor = async (meal) => {
    await userEvent.click(screen.getByRole('button', { name: `edit ${meal.name}` }))
    return screen.getByRole('dialog')
  }

  it('opens prefilled with what the recipe currently says', async () => {
    await renderPage({ meals: [tjOrangeChicken] })
    const dialog = await openEditor(tjOrangeChicken)
    expect(within(dialog).getByLabelText('Name')).toHaveValue(tjOrangeChicken.name)
    // Lists edit as one-per-line text.
    expect(within(dialog).getByLabelText('Ingredients')).toHaveValue(
      tjOrangeChicken.ingredients.join('\n'),
    )
    expect(within(dialog).getByLabelText('Instructions')).toHaveValue(
      tjOrangeChicken.steps.join('\n'),
    )
  })

  it('saves the edited fields and shows the result without a reload', async () => {
    const updated = { ...tjOrangeChicken, name: 'Orange Chicken, our way', edited: true }
    saveMeal.mockResolvedValue(updated)
    await renderPage({ meals: [tjOrangeChicken] })
    const dialog = await openEditor(tjOrangeChicken)

    const name = within(dialog).getByLabelText('Name')
    await userEvent.clear(name)
    await userEvent.type(name, 'Orange Chicken, our way')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(saveMeal).toHaveBeenCalledTimes(1))
    const [id, fields] = saveMeal.mock.calls[0]
    expect(id).toBe(tjOrangeChicken.id)
    expect(fields.name).toBe('Orange Chicken, our way')
    // The card picks up the new name straight away.
    expect(await screen.findByText('Orange Chicken, our way')).toBeInTheDocument()
  })

  it('turns the ingredient textarea back into a list, dropping blank lines', async () => {
    saveMeal.mockResolvedValue({ ...tjOrangeChicken, edited: true })
    await renderPage({ meals: [tjOrangeChicken] })
    const dialog = await openEditor(tjOrangeChicken)

    const box = within(dialog).getByLabelText('Ingredients')
    await userEvent.clear(box)
    await userEvent.type(box, 'Orange chicken\n\n  Broccoli  \n')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(saveMeal).toHaveBeenCalled())
    expect(saveMeal.mock.calls[0][1].ingredients).toEqual(['Orange chicken', 'Broccoli'])
  })

  it('lets the store be set, and cleared back to no particular shop', async () => {
    saveMeal.mockResolvedValue({ ...tjOrangeChicken, store: 'Costco', edited: true })
    await renderPage({ meals: [tjOrangeChicken] })
    const dialog = await openEditor(tjOrangeChicken)

    await userEvent.click(within(dialog).getByLabelText('Buy the ingredients at'))
    await userEvent.click(await screen.findByRole('option', { name: 'Costco' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(saveMeal).toHaveBeenCalled())
    expect(saveMeal.mock.calls[0][1].store).toBe('Costco')
  })

  it('offers reset only once there is an edit to undo', async () => {
    await renderPage({ meals: [tjOrangeChicken] })
    let dialog = await openEditor(tjOrangeChicken)
    expect(within(dialog).getByRole('button', { name: 'Reset' })).toBeDisabled()

    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    await renderPage({ meals: [{ ...tjOrangeChicken, edited: true }] })
    dialog = await openEditor(tjOrangeChicken)
    expect(within(dialog).getByRole('button', { name: 'Reset' })).toBeEnabled()
  })

  it('resets a recipe back to what it was published with', async () => {
    resetMeal.mockResolvedValue(tjOrangeChicken)
    await renderPage({ meals: [{ ...tjOrangeChicken, name: 'Renamed', edited: true }] })
    const dialog = await openEditor({ ...tjOrangeChicken, name: 'Renamed' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Reset' }))

    await waitFor(() => expect(resetMeal).toHaveBeenCalledWith(tjOrangeChicken.id))
    expect(await screen.findByText(tjOrangeChicken.name)).toBeInTheDocument()
  })

  it('keeps what was typed when the save fails', async () => {
    saveMeal.mockRejectedValue(new Error('mongo down'))
    await renderPage({ meals: [tjOrangeChicken] })
    const dialog = await openEditor(tjOrangeChicken)

    const name = within(dialog).getByLabelText('Name')
    await userEvent.clear(name)
    await userEvent.type(name, 'Half-typed')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))

    expect(await within(dialog).findByText(/mongo down/)).toBeInTheDocument()
    // Still open, still holding the edit.
    expect(within(dialog).getByLabelText('Name')).toHaveValue('Half-typed')
  })
})

describe('filtering by store', () => {
  const menu = [
    { ...katsu, id: 'r1', name: 'TJ One', store: "Trader Joe's" },
    { ...katsu, id: 'r2', name: 'TJ Two', store: "Trader Joe's" },
    { ...katsu, id: 'r3', name: 'KS One', store: 'King Soopers' },
    { ...katsu, id: 'r4', name: 'Storeless', store: undefined },
  ]

  it('offers only the stores something actually comes from, with counts', async () => {
    await renderPage({ meals: menu })
    const group = screen.getByRole('group', { name: /filter meals by store/i })
    expect(within(group).getByText('All (4)')).toBeInTheDocument()
    expect(within(group).getByText("Trader Joe's (2)")).toBeInTheDocument()
    expect(within(group).getByText('King Soopers (1)')).toBeInTheDocument()
    expect(within(group).getByText('No store (1)')).toBeInTheDocument()
    // Nothing comes from these, so they aren't offered.
    expect(within(group).queryByText(/Costco/)).not.toBeInTheDocument()
    expect(within(group).queryByText(/Safeway/)).not.toBeInTheDocument()
  })

  it('narrows the menu to one store', async () => {
    await renderPage({ meals: menu })
    await userEvent.click(screen.getByText("Trader Joe's (2)"))
    expect(screen.getByText('TJ One')).toBeInTheDocument()
    expect(screen.getByText('TJ Two')).toBeInTheDocument()
    expect(screen.queryByText('KS One')).not.toBeInTheDocument()
    expect(screen.queryByText('Storeless')).not.toBeInTheDocument()
  })

  it('collects the meals belonging to no particular shop', async () => {
    await renderPage({ meals: menu })
    await userEvent.click(screen.getByText('No store (1)'))
    expect(screen.getByText('Storeless')).toBeInTheDocument()
    expect(screen.queryByText('TJ One')).not.toBeInTheDocument()
  })

  it('goes back to the whole menu', async () => {
    await renderPage({ meals: menu })
    await userEvent.click(screen.getByText('King Soopers (1)'))
    expect(screen.queryByText('TJ One')).not.toBeInTheDocument()
    await userEvent.click(screen.getByText('All (4)'))
    for (const meal of menu) expect(screen.getByText(meal.name)).toBeInTheDocument()
  })

  it('shows no filter at all when there is nothing to narrow down', async () => {
    await renderPage({ meals: [{ ...katsu, store: undefined }] })
    expect(screen.queryByRole('group', { name: /filter meals by store/i })).not.toBeInTheDocument()
  })
})
