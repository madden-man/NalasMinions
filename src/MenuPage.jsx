import { useEffect, useRef, useState } from 'react'
import {
  AppBar, Toolbar, Typography, Container, Box, Card, CardActionArea, CardContent,
  CardActions, IconButton, Button, Chip, Stack, Tooltip, Snackbar, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemIcon,
  ListItemText, Divider,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined'
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart'
import CircleIcon from '@mui/icons-material/Circle'
import { isElectron } from './platform'
import { loadTasks, addTask as upsertTask } from './storage'
import { isGroceryTask, createGroceryTask } from './grocery'
import { MEALS, addMealToGrocery } from './menu'

// The recipe view: a meal's ingredients (optional extras marked as such) and
// cleaned-up steps in a dialog, with its own "add to groceries" action so the
// week can be planned from here too.
function RecipeDialog({ meal, onClose, onAdd }) {
  return (
    <Dialog open={Boolean(meal)} onClose={onClose} fullWidth maxWidth="sm">
      {meal && (
        <>
          <DialogTitle sx={{ fontWeight: 700 }}>{meal.name}</DialogTitle>
          <DialogContent dividers>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Ingredients
            </Typography>
            <List dense disablePadding sx={{ mb: 2 }}>
              {meal.ingredients.map((ing) => (
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

export default function MenuPage({ navigate }) {
  // The grocery task doubles as this page's write target: picking a meal adds
  // its ingredients to the task's one-offs, exactly as if they'd been typed on
  // /grocery. Loaded (and seeded if missing) the same way GroceryPage does.
  const [grocery, setGrocery] = useState(null)
  const [error, setError] = useState(null)
  // The meal whose recipe dialog is open, or null.
  const [openMeal, setOpenMeal] = useState(null)
  // Which optional extras (toppings) are kept, per meal id. A meal with no
  // entry keeps all of its options — deselecting is the exception.
  const [toppings, setToppings] = useState({})
  // Feedback after picking a meal: how many ingredients actually landed.
  const [toast, setToast] = useState(null)
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
    const next = addMealToGrocery(grocery, meal, new Date(), selectedOptions(meal))
    const added = (next.oneOffs?.length ?? 0) - (grocery.oneOffs?.length ?? 0)
    setToast(
      added > 0
        ? { severity: 'success', text: `${meal.name}: ${added} ingredient${added === 1 ? '' : 's'} added to the grocery list` }
        : { severity: 'info', text: `${meal.name}: everything is already on the grocery list` },
    )
    if (next !== grocery) setGrocery(next)
    setOpenMeal(null)
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
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Meals that can be prepped this week. Tap a meal to add its ingredients to the
          grocery list; open the recipe for the how-to.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Couldn&apos;t load the grocery list: {error}
          </Alert>
        )}

        <Stack spacing={2}>
          {MEALS.map((meal) => (
            <Card key={meal.id} elevation={1}>
              <CardActionArea onClick={() => pickMeal(meal)} disabled={!grocery}>
                <CardContent sx={{ pb: 1 }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {meal.name}
                    </Typography>
                    {/* Counts what a pick would shop for: base ingredients
                        plus whichever optional extras are still kept. */}
                    <Chip
                      size="small"
                      variant="outlined"
                      icon={<AddShoppingCartIcon />}
                      label={`${meal.ingredients.length + selectedOptions(meal).length} ingredients`}
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

      <RecipeDialog meal={openMeal} onClose={() => setOpenMeal(null)} onAdd={pickMeal} />

      {/* Confirmation that the ingredients landed (or were already listed). */}
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
            <Button color="inherit" size="small" onClick={() => navigate('/grocery')}>
              View list
            </Button>
          }
        >
          {toast?.text}
        </Alert>
      </Snackbar>
    </Box>
  )
}
