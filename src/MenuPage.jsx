import { useEffect, useRef, useState } from 'react'
import {
  AppBar, Toolbar, Typography, Container, Box, Card, CardActionArea, CardContent,
  CardActions, IconButton, Button, Chip, Stack, Tooltip, Snackbar, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemIcon,
  ListItemText, Divider, CircularProgress, TextField, Link,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined'
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart'
import CircleIcon from '@mui/icons-material/Circle'
import VerifiedIcon from '@mui/icons-material/Verified'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import AddIcon from '@mui/icons-material/Add'
import { isElectron } from './platform'
import {
  loadTasks,
  loadMeals,
  addMeal,
  pullIngredients,
  addTask as upsertTask,
} from './storage'
import { isGroceryTask, createGroceryTask } from './grocery'
import { addMealToGrocery, shoppingList } from './menu'

// "Add recipe": one box that takes either a link to a recipe page or the
// recipe pasted as text — the server figures out which and parses it, so the
// user doesn't have to fill in a form. Saving is left open (with the error
// shown in place) when a paste can't be read, so nothing typed is lost.
function AddRecipeDialog({ open, onClose, onSave }) {
  const [input, setInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const close = () => {
    if (saving) return
    setInput('')
    setError(null)
    onClose()
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      await onSave(input.trim())
      setInput('')
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 700 }}>Add a recipe</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Paste a link to a recipe, or the recipe itself with an
          &ldquo;Ingredients:&rdquo; line and an &ldquo;Instructions:&rdquo; line. It joins
          the menu as untried until someone cooks it.
        </Typography>
        <TextField
          autoFocus
          fullWidth
          multiline
          minRows={6}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={saving}
          label="Recipe link or text"
          placeholder={'https://example.com/pad-thai\n\n— or —\n\nGarlic Noodles\nIngredients:\n- 1 lb noodles\nInstructions:\n1. Boil the noodles.'}
          error={Boolean(error)}
          helperText={error || ' '}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={close} color="inherit" disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={save}
          disabled={saving || !input.trim()}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <AddIcon />}
        >
          {saving ? 'Adding…' : 'Add to menu'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// Whether a recipe has actually been cooked from these steps. Verified meals
// get a quiet check; everything else (a freshly added recipe, say) is called
// out as untried so nobody follows steps that haven't been through the kitchen.
function VerifiedBadge({ verified }) {
  return verified ? (
    <Tooltip title="Cooked from these steps and confirmed">
      <VerifiedIcon fontSize="small" color="success" aria-label="verified recipe" />
    </Tooltip>
  ) : (
    <Chip
      size="small"
      variant="outlined"
      color="warning"
      icon={<HelpOutlineIcon />}
      label="Untried"
      aria-label="unverified recipe"
    />
  )
}

// Where to read the actual recipe. Every meal has somewhere to point:
//
//   * a library dish carries its own labelled links (the replacement link
//     first, when its original couldn't be read — scripts/recipe-links.cjs),
//   * an imported recipe carries the single source it was read from,
//   * and a household meal is its own source: nobody else publishes Kevin's
//     chicken, and the steps are right there in this dialog, so it links to
//     its permalink on this page.
//
// The permalink is a real URL in the browser (/menu/meal-pad-thai) and the hash
// route in Electron, matching useRoute. Electron loads the app from file://,
// where `location.origin` isn't dependable, so the current href (minus any hash
// already on it) is what the hash route gets appended to.
function mealPermalink(meal) {
  const path = `/menu/${meal.id}`
  if (isElectron) return `${window.location.href.split('#')[0]}#${path}`
  return `${window.location.origin}${path}`
}

function recipeLinks(meal) {
  if (meal.links?.length) return meal.links
  if (meal.sourceUrl) return [{ label: 'View the original recipe', url: meal.sourceUrl }]
  return [{ label: 'Link to this recipe', url: mealPermalink(meal), self: true }]
}

// The recipe view: a meal's ingredients (optional extras marked as such) and
// cleaned-up steps in a dialog, with its own "add to groceries" action so the
// week can be planned from here too.
//
// The ingredients listed here are the recipe's own, exactly as published — the
// grocery list gets the tidied version instead (shoppingList), so what's on the
// counter matches the page and what's in the cart reads like a shopping list.
function RecipeDialog({ meal, onClose, onAdd, onPull, pulling }) {
  const links = meal ? recipeLinks(meal) : []
  // A library dish still shopping from `produce`: its link hasn't been read
  // yet (or the site was down when the backfill ran), so offer the retry.
  const canPull = Boolean(meal && !meal.shopping && !meal.steps?.length && meal.sourceUrl)

  return (
    <Dialog open={Boolean(meal)} onClose={onClose} fullWidth maxWidth="sm">
      {meal && (
        <>
          <DialogTitle sx={{ fontWeight: 700 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <span>{meal.name}</span>
              <VerifiedBadge verified={meal.verified} />
            </Stack>
          </DialogTitle>
          <DialogContent dividers>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ mb: 1 }}
            >
              <Typography variant="subtitle2" color="text.secondary">
                Ingredients
              </Typography>
              {meal.shopping && (
                <Tooltip title="Read from the linked recipe">
                  <Chip size="small" variant="outlined" label="from the recipe" />
                </Tooltip>
              )}
            </Stack>
            {canPull && (
              <Alert
                severity="info"
                sx={{ mb: 2 }}
                action={
                  <Button
                    color="inherit"
                    size="small"
                    disabled={pulling}
                    onClick={() => onPull(meal)}
                  >
                    {pulling ? 'Reading…' : 'Read it'}
                  </Button>
                }
              >
                Only the produce to shop for is saved here — the full ingredient list is
                at the linked recipe.
              </Alert>
            )}
            <List dense disablePadding sx={{ mb: 2 }}>
              {(meal.ingredients || []).map((ing) => (
                <ListItem key={ing} disableGutters sx={{ py: 0.25 }}>
                  <ListItemIcon sx={{ minWidth: 24 }}>
                    <CircleIcon sx={{ fontSize: 8 }} color="disabled" />
                  </ListItemIcon>
                  <ListItemText primary={ing} />
                </ListItem>
              ))}
              {(meal.options || []).map((ing) => (
                <ListItem key={ing} disableGutters sx={{ py: 0.25 }}>
                  <ListItemIcon sx={{ minWidth: 24 }}>
                    <CircleIcon sx={{ fontSize: 8 }} color="disabled" />
                  </ListItemIcon>
                  <ListItemText primary={ing} secondary="optional" />
                </ListItem>
              ))}
            </List>
            <Divider sx={{ mb: 2 }} />
            {(meal.steps || []).length > 0 ? (
              <>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Instructions
                </Typography>
                <List dense disablePadding component="ol" sx={{ listStyle: 'none' }}>
                  {meal.steps.map((step, i) => (
                    <ListItem key={step} disableGutters alignItems="flex-start" sx={{ py: 0.5 }}>
                      <ListItemIcon sx={{ minWidth: 32, mt: 0.25 }}>
                        <Chip size="small" label={i + 1} />
                      </ListItemIcon>
                      <ListItemText primary={step} />
                    </ListItem>
                  ))}
                </List>
              </>
            ) : (
              // Dishes from the shared recipe library have no steps of their
              // own — the method lives at the link, which is always there.
              <Typography variant="body2" color="text.secondary">
                No steps saved for this one — the recipe is linked below.
              </Typography>
            )}
            {/* Every recipe has a link: the site it came from, or — for the
                household's own meals, which nobody else publishes — a
                permalink back to this page. */}
            <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2, mb: 1 }}>
              Recipe
            </Typography>
            <List dense disablePadding>
              {links.map(({ label, url, self }) => (
                <ListItem key={url} disableGutters sx={{ py: 0.25 }}>
                  <ListItemIcon sx={{ minWidth: 24 }}>
                    <MenuBookIcon sx={{ fontSize: 16 }} color="disabled" />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Link href={url} target="_blank" rel="noopener noreferrer">
                        {label}
                      </Link>
                    }
                    secondary={self ? 'This recipe lives here' : undefined}
                  />
                </ListItem>
              ))}
            </List>
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose} color="inherit">
              Close
            </Button>
            <Button
              variant="contained"
              startIcon={<AddShoppingCartIcon />}
              onClick={() => onAdd(meal)}
            >
              Add ingredients to grocery list
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  )
}

export default function MenuPage({ navigate, openMealId = null }) {
  // The grocery task doubles as this page's write target: picking a meal adds
  // its ingredients to the task's one-offs, exactly as if they'd been typed on
  // /grocery. Loaded (and seeded if missing) the same way GroceryPage does.
  const [grocery, setGrocery] = useState(null)
  const [error, setError] = useState(null)
  // The meal catalog, straight from tommy-data.nalas-menu — null until the
  // fetch settles, so the page can tell "still loading" from "no meals".
  const [meals, setMeals] = useState(null)
  const [mealsError, setMealsError] = useState(null)
  // The meal whose recipe dialog is open, or null.
  const [openMeal, setOpenMeal] = useState(null)
  // Whether the "add a recipe" box is open.
  const [adding, setAdding] = useState(false)
  // Which optional extras (toppings) are kept, per meal id. A meal with no
  // entry keeps all of its options — deselecting is the exception.
  const [toppings, setToppings] = useState({})
  // Feedback after picking a meal: how many ingredients actually landed.
  const [toast, setToast] = useState(null)
  // The meal whose recipe link is being read right now, or null.
  const [pulling, setPulling] = useState(null)
  const skipNextSave = useRef(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const tasks = (await loadTasks()) ?? []
        const stored = tasks.find(isGroceryTask)
        if (cancelled) return
        // A first-ever visit seeds the grocery task so ingredients have a
        // document to land in; that seed must be persisted, so don't skip.
        skipNextSave.current = Boolean(stored)
        setGrocery(stored ?? createGroceryTask())
      } catch (err) {
        console.error('Failed to load grocery list from MongoDB:', err)
        if (!cancelled) setError(err.message)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // The meals themselves come from MongoDB, so the recipes can be edited in the
  // database (see scripts/seed-meals.cjs) without shipping a new build.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const stored = await loadMeals()
        if (!cancelled) setMeals(stored)
      } catch (err) {
        console.error('Failed to load the menu from MongoDB:', err)
        if (!cancelled) {
          setMealsError(err.message)
          setMeals([])
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Landing on a recipe's permalink (/menu/meal-pad-thai) opens that recipe as
  // soon as the catalog arrives — and following another one swaps the dialog
  // over rather than leaving the first open.
  useEffect(() => {
    if (!openMealId || !meals) return
    const wanted = meals.find((m) => m.id === openMealId)
    if (wanted) setOpenMeal(wanted)
  }, [openMealId, meals])

  // Persist the grocery task whenever a meal changes it (single-document
  // upsert, same as GroceryPage — the chores are never touched from here).
  useEffect(() => {
    if (!grocery) return
    if (skipNextSave.current) {
      skipNextSave.current = false
      return
    }
    upsertTask(grocery).catch((err) =>
      console.error('Failed to save grocery list to MongoDB:', err),
    )
  }, [grocery])

  // Send a pasted link or recipe text to the server, which parses it into a
  // meal and stores it in the menu collection. The stored meal comes back, so
  // append it rather than refetching. A parse failure rejects and the dialog
  // shows why (and keeps what was typed).
  const saveRecipe = async (input) => {
    const meal = await addMeal(input)
    setMeals((prev) => [...(prev ?? []), meal])
    setMealsError(null)
    setToast({ severity: 'success', text: `${meal.name} added to the menu` })
  }

  // Closing the dialog drops the permalink too, so the URL keeps matching what
  // is on screen and the effect above doesn't reopen what was just closed.
  const closeRecipe = () => {
    setOpenMeal(null)
    if (openMealId) navigate('/menu')
  }

  // Read a library dish's ingredients off its recipe link, then swap the richer
  // meal into the catalog (and into the open dialog) so the grocery add that
  // follows shops from the real list rather than the produce note.
  const pullFor = async (meal) => {
    setPulling(meal.id)
    try {
      const { ingredients, shopping } = await pullIngredients(meal.sourceUrl)
      const next = { ...meal, ingredients, shopping }
      setMeals((prev) => (prev ?? []).map((m) => (m.id === meal.id ? next : m)))
      setOpenMeal((current) => (current?.id === meal.id ? next : current))
      setToast({
        severity: 'success',
        text: `${meal.name}: ${shopping.length} ingredient${shopping.length === 1 ? '' : 's'} read from the recipe`,
      })
    } catch (err) {
      setToast({ severity: 'error', text: `${meal.name}: ${err.message}` })
    } finally {
      setPulling(null)
    }
  }

  const selectedOptions = (meal) => toppings[meal.id] ?? meal.options ?? []
  const toggleTopping = (meal, name) =>
    setToppings((prev) => {
      const current = new Set(prev[meal.id] ?? meal.options ?? [])
      if (current.has(name)) current.delete(name)
      else current.add(name)
      // Keep the meal's own option order regardless of toggle order.
      return { ...prev, [meal.id]: (meal.options || []).filter((o) => current.has(o)) }
    })

  // Put the meal's ingredients (and kept toppings) on the grocery list.
  // addMealToGrocery skips ingredients already listed (and returns the same
  // reference when nothing was added, so no state change and no save), and the
  // toast reports what actually landed.
  const pickMeal = (meal) => {
    if (!grocery) return
    // A library dish may carry no shopping list at all — say so rather than
    // claiming everything is already on the list.
    if (shoppingList(meal).length + selectedOptions(meal).length === 0) {
      setToast({ severity: 'info', text: `${meal.name}: no ingredients saved for this one` })
      closeRecipe()
      return
    }
    const next = addMealToGrocery(grocery, meal, new Date(), selectedOptions(meal))
    const added = (next.oneOffs?.length ?? 0) - (grocery.oneOffs?.length ?? 0)
    // `list: true` puts the "View list" shortcut on the toast — it only makes
    // sense for a toast about the grocery list.
    setToast(
      added > 0
        ? { severity: 'success', list: true, text: `${meal.name}: ${added} ingredient${added === 1 ? '' : 's'} added to the grocery list` }
        : { severity: 'info', list: true, text: `${meal.name}: everything is already on the grocery list` },
    )
    if (next !== grocery) setGrocery(next)
    closeRecipe()
  }

  return (
    <Box sx={{ minHeight: '100vh', pb: 6 }}>
      <AppBar position="sticky" elevation={2} sx={{ pt: 'env(safe-area-inset-top)' }}>
        {/* Same Electron drag-region treatment as the other pages. */}
        <Toolbar
          sx={{
            WebkitAppRegion: isElectron ? 'drag' : undefined,
            pl: isElectron ? '78px' : undefined,
          }}
        >
          <Tooltip title="Back to chores">
            <IconButton
              edge="start"
              color="inherit"
              aria-label="back to chores"
              onClick={() => navigate('/')}
              sx={{ mr: 1, WebkitAppRegion: 'no-drag' }}
            >
              <ArrowBackIcon />
            </IconButton>
          </Tooltip>
          <RestaurantMenuIcon sx={{ mr: 1.5 }} />
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }} noWrap>
            Weekly Menu
          </Typography>
          <Tooltip title="Add a recipe">
            <IconButton
              color="inherit"
              aria-label="add new recipe"
              onClick={() => setAdding(true)}
              sx={{ WebkitAppRegion: 'no-drag' }}
            >
              <AddIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Grocery list">
            <IconButton
              color="inherit"
              aria-label="grocery list"
              onClick={() => navigate('/grocery')}
              sx={{ WebkitAppRegion: 'no-drag' }}
            >
              <ShoppingCartOutlinedIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Container maxWidth="sm" sx={{ mt: { xs: 2, sm: 4 } }}>
        <Stack
          direction="row"
          spacing={1}
          alignItems="flex-start"
          justifyContent="space-between"
          sx={{ mb: 2 }}
        >
          <Typography variant="body2" color="text.secondary">
            Meals that can be prepped this week. Tap a meal to add its ingredients to the
            grocery list; open the recipe for the how-to.
          </Typography>
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setAdding(true)}
            sx={{ flexShrink: 0 }}
          >
            Add recipe
          </Button>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Couldn&apos;t load the grocery list: {error}
          </Alert>
        )}

        {mealsError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Couldn&apos;t load the menu: {mealsError}
          </Alert>
        )}

        {/* The catalog is a fetch now, so the list has a waiting state — and an
            empty one for a database that hasn't been seeded yet. */}
        {meals === null && (
          <Stack alignItems="center" sx={{ py: 6 }}>
            <CircularProgress aria-label="loading the menu" />
          </Stack>
        )}

        {meals?.length === 0 && !mealsError && (
          <Alert severity="info" sx={{ mb: 2 }}>
            No meals in the menu yet — add a recipe above, or seed the household ones with{' '}
            <code>npm run seed:meals</code>.
          </Alert>
        )}

        <Stack spacing={2}>
          {(meals ?? []).map((meal) => (
            <Card key={meal.id} elevation={1}>
              <CardActionArea onClick={() => pickMeal(meal)} disabled={!grocery}>
                <CardContent sx={{ pb: 1 }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {meal.name}
                      </Typography>
                      <VerifiedBadge verified={meal.verified} />
                    </Stack>
                    {/* Counts what a pick would shop for: base ingredients
                        plus whichever optional extras are still kept. */}
                    <Chip
                      size="small"
                      variant="outlined"
                      icon={<AddShoppingCartIcon />}
                      label={`${shoppingList(meal).length + selectedOptions(meal).length} ingredients`}
                    />
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {meal.description}
                  </Typography>
                </CardContent>
              </CardActionArea>
              {/* Optional extras (toppings): toggle a chip off to shop without
                  it. Lives outside the CardActionArea so a toggle doesn't also
                  pick the meal. */}
              {(meal.options || []).length > 0 && (
                <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ px: 2, pb: 1 }}>
                  {meal.options.map((name) => {
                    const kept = selectedOptions(meal).includes(name)
                    return (
                      <Chip
                        key={name}
                        size="small"
                        label={name}
                        clickable
                        color={kept ? 'primary' : 'default'}
                        variant={kept ? 'filled' : 'outlined'}
                        onClick={() => toggleTopping(meal, name)}
                        aria-pressed={kept}
                      />
                    )
                  })}
                </Stack>
              )}
              <CardActions sx={{ px: 2, pt: 0 }}>
                <Button
                  size="small"
                  startIcon={<MenuBookIcon />}
                  aria-label={`${meal.name} recipe`}
                  onClick={() => setOpenMeal(meal)}
                >
                  Recipe
                </Button>
                <Button
                  size="small"
                  startIcon={<AddShoppingCartIcon />}
                  disabled={!grocery}
                  aria-label={`add ${meal.name} to this week`}
                  onClick={() => pickMeal(meal)}
                >
                  Add to this week
                </Button>
              </CardActions>
            </Card>
          ))}
        </Stack>
      </Container>

      <RecipeDialog
        meal={openMeal}
        onClose={closeRecipe}
        onAdd={pickMeal}
        onPull={pullFor}
        pulling={Boolean(pulling)}
      />

      <AddRecipeDialog open={adding} onClose={() => setAdding(false)} onSave={saveRecipe} />

      {/* Confirmation that the ingredients landed (or were already listed), or
          that a pasted recipe joined the menu. */}
      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={toast?.severity ?? 'success'}
          variant="filled"
          onClose={() => setToast(null)}
          action={
            toast?.list ? (
              <Button color="inherit" size="small" onClick={() => navigate('/grocery')}>
                View list
              </Button>
            ) : null
          }
        >
          {toast?.text}
        </Alert>
      </Snackbar>
    </Box>
  )
}
