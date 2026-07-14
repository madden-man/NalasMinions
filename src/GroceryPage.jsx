import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AppBar, Toolbar, Typography, Container, Box, Paper, List, ListItem,
  ListItemButton, ListItemIcon, ListItemText, Checkbox, IconButton, Button,
  Chip, Stack, TextField, Tooltip,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import AddIcon from '@mui/icons-material/Add'
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined'
import RepeatIcon from '@mui/icons-material/Repeat'
import LaunchIcon from '@mui/icons-material/Launch'
import ScheduleIcon from '@mui/icons-material/Schedule'
import { isElectron } from './platform'
import { loadTasks, addTask as upsertTask } from './storage'
import {
  isGroceryTask, createGroceryTask, renewGroceryItems, toggleGroceryItem, restockDate,
  addOneOff, toggleOneOff, removeOneOff, clearBoughtOneOffs,
} from './grocery'

// Short label for a brand link chip, e.g. "organicvalley.coop".
const brandLabel = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return 'Brand'
  }
}

// One staple row from the recurring grocery task: checkbox = bought, with a
// chip linking to the desired brand and one showing the restock cadence. When
// bought, a third chip says when the item comes back onto the list.
function StapleRow({ item, onToggle }) {
  const bought = Boolean(item.purchasedAt)
  const back = restockDate(item)
  return (
    <ListItem disablePadding divider>
      <ListItemButton onClick={() => onToggle(item.id)} sx={{ py: 1.25 }}>
        <ListItemIcon sx={{ minWidth: 44 }}>
          <Checkbox
            edge="start"
            checked={bought}
            tabIndex={-1}
            disableRipple
            inputProps={{ 'aria-label': `Mark ${item.text} bought` }}
          />
        </ListItemIcon>
        <ListItemText
          primary={item.text}
          primaryTypographyProps={{
            sx: {
              textDecoration: bought ? 'line-through' : 'none',
              color: bought ? 'text.disabled' : 'text.primary',
            },
          }}
          secondaryTypographyProps={{ component: 'div' }}
          secondary={
            <Stack direction="row" spacing={0.75} sx={{ mt: 0.5 }} useFlexGap flexWrap="wrap">
              {/* The brand chip is a real link; stop the click so following it
                  doesn't also toggle the row. */}
              <Chip
                size="small"
                variant="outlined"
                icon={<LaunchIcon />}
                label={brandLabel(item.brandUrl)}
                component="a"
                href={item.brandUrl}
                target="_blank"
                rel="noopener noreferrer"
                clickable
                onClick={(e) => e.stopPropagation()}
              />
              <Chip
                size="small"
                variant="outlined"
                icon={<RepeatIcon />}
                label={`Every ${item.durationDays} days`}
              />
              {bought && back && (
                <Chip
                  size="small"
                  color="info"
                  variant="outlined"
                  icon={<ScheduleIcon />}
                  label={`Back ${back.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
                />
              )}
            </Stack>
          }
        />
      </ListItemButton>
    </ListItem>
  )
}

export default function GroceryPage({ navigate }) {
  // The special recurring grocery task (kind: 'grocery'). It lives in
  // tommy-data.nalas-minions with the chores but only this page shows it.
  // null until loaded; seeded on first visit if the collection has none.
  const [grocery, setGrocery] = useState(null)
  const [stapleError, setStapleError] = useState(null)
  const [draft, setDraft] = useState('')
  // The load effect persists its own changes (seed/renewal), so the save
  // effect below skips the state set that load performs.
  const skipNextSave = useRef(true)

  // Fetch the grocery task on mount. If it doesn't exist yet, seed it with the
  // default staples; if it does, renew any bought items whose duration has
  // elapsed. Either change is persisted by the save effect below.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const tasks = (await loadTasks()) ?? []
        const stored = tasks.find(isGroceryTask)
        const fresh = renewGroceryItems(stored ?? createGroceryTask())
        if (cancelled) return
        // Persist only when load actually changed something (first-time seed
        // or a renewal) — otherwise skip the save for this state set.
        skipNextSave.current = fresh === stored
        setGrocery(fresh)
      } catch (err) {
        console.error('Failed to load grocery staples from MongoDB:', err)
        if (!cancelled) setStapleError(err.message)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Persist the grocery task whenever it changes. This upserts just the one
  // document (storage.addTask), so the chores are never touched from here.
  useEffect(() => {
    if (!grocery) return
    if (skipNextSave.current) {
      skipNextSave.current = false
      return
    }
    upsertTask(grocery).catch((err) =>
      console.error('Failed to save grocery staples to MongoDB:', err),
    )
  }, [grocery])

  // Renew staples when the tab regains focus, so an item bought days ago
  // reappears without a reload. renewGroceryItems returns the same reference
  // when nothing elapsed, making this a no-op (no re-render, no save).
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible')
        setGrocery((prev) => (prev ? renewGroceryItems(prev) : prev))
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  const toggleStaple = (itemId) =>
    setGrocery((prev) => (prev ? toggleGroceryItem(prev, itemId) : prev))

  // Unbought staples first, mirroring the one-off list's ordering.
  const staples = useMemo(
    () =>
      grocery
        ? [...grocery.items].sort(
            (a, b) => Number(Boolean(a.purchasedAt)) - Number(Boolean(b.purchasedAt)),
          )
        : [],
    [grocery],
  )
  const staplesToBuy = staples.filter((i) => !i.purchasedAt).length

  // One-off items live inside the grocery task document (task.oneOffs), so
  // every change below goes through setGrocery and the save effect upserts the
  // task to tommy-data.nalas-minions. Older documents may lack the field.
  const items = grocery?.oneOffs ?? []

  // Unchecked items first so the still-to-buy part of the list stays on top
  // while shopping; checked ones sink but stay visible until cleared.
  const sorted = useMemo(
    () => [...items].sort((a, b) => Number(a.done) - Number(b.done)),
    [items],
  )
  const remaining = items.filter((i) => !i.done).length
  const totalToBuy = remaining + staplesToBuy

  const toggle = (id) => setGrocery((prev) => (prev ? toggleOneOff(prev, id) : prev))
  const remove = (id) => setGrocery((prev) => (prev ? removeOneOff(prev, id) : prev))
  const clearBought = () => setGrocery((prev) => (prev ? clearBoughtOneOffs(prev) : prev))

  // Add the drafted item to the top of the list. Runs as the form's submit so
  // the Enter key works as well as the Add button.
  const addItem = (e) => {
    e.preventDefault()
    const text = draft.trim()
    if (!text || !grocery) return
    setGrocery((prev) => (prev ? addOneOff(prev, text) : prev))
    setDraft('')
  }

  return (
    <Box sx={{ minHeight: '100vh', pb: 6 }}>
      <AppBar position="sticky" elevation={2} sx={{ pt: 'env(safe-area-inset-top)' }}>
        {/* Same Electron drag-region treatment as the chores page. */}
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
          <ShoppingCartOutlinedIcon sx={{ mr: 1.5 }} />
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }} noWrap>
            Grocery List
          </Typography>
          <Chip
            label={totalToBuy === 0 ? 'All bought!' : `${totalToBuy} to buy`}
            color={totalToBuy === 0 ? 'success' : 'default'}
            sx={{ bgcolor: 'rgba(255,255,255,0.18)', color: 'inherit' }}
          />
        </Toolbar>
      </AppBar>

      <Container maxWidth="sm" sx={{ mt: { xs: 2, sm: 4 } }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          The household grocery list. Check items off as they land in the cart.
        </Typography>

        {/* Staples — the recurring grocery task. Each item links to the brand
            we buy and reappears automatically once its duration runs out. */}
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
          Staples · renew automatically
        </Typography>
        <Paper elevation={1} sx={{ overflow: 'hidden', mb: 3 }}>
          <List disablePadding>
            {stapleError ? (
              <ListItem>
                <ListItemText
                  primary="Couldn't load staples"
                  secondary={stapleError}
                />
              </ListItem>
            ) : !grocery ? (
              <ListItem>
                <ListItemText primary="Loading staples…" />
              </ListItem>
            ) : (
              staples.map((item) => (
                <StapleRow key={item.id} item={item} onToggle={toggleStaple} />
              ))
            )}
          </List>
        </Paper>

        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
          One-off items
        </Typography>
        <Stack component="form" onSubmit={addItem} direction="row" spacing={1} sx={{ mb: 2 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Add an item…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            inputProps={{ 'aria-label': 'new grocery item' }}
          />
          {/* Disabled until the task has loaded — there's nothing to attach
              the new item to (and persist it into) before then. */}
          <Button
            type="submit"
            variant="contained"
            startIcon={<AddIcon />}
            disabled={!draft.trim() || !grocery}
          >
            Add
          </Button>
        </Stack>

        <Paper elevation={1} sx={{ overflow: 'hidden' }}>
          <List disablePadding>
            {sorted.length === 0 ? (
              <ListItem>
                <ListItemText primary="Nothing on the list" secondary="Add the first item above." />
              </ListItem>
            ) : (
              sorted.map((item) => (
                <ListItem
                  key={item.id}
                  disablePadding
                  divider
                  secondaryAction={
                    <Tooltip title="Delete">
                      <IconButton edge="end" aria-label="delete" onClick={() => remove(item.id)}>
                        <DeleteOutlineIcon />
                      </IconButton>
                    </Tooltip>
                  }
                >
                  {/* Unlike chores (row opens the edit dialog), a grocery row has
                      nothing to edit — the whole row toggles the checkmark. */}
                  <ListItemButton onClick={() => toggle(item.id)} sx={{ py: 1.25 }}>
                    <ListItemIcon sx={{ minWidth: 44 }}>
                      <Checkbox
                        edge="start"
                        checked={item.done}
                        tabIndex={-1}
                        disableRipple
                        inputProps={{ 'aria-label': `Mark ${item.text} bought` }}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={item.text}
                      primaryTypographyProps={{
                        sx: {
                          textDecoration: item.done ? 'line-through' : 'none',
                          color: item.done ? 'text.disabled' : 'text.primary',
                        },
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              ))
            )}
          </List>
        </Paper>

        <Stack direction="row" justifyContent="space-between" sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary">
            {items.length} one-off item{items.length === 1 ? '' : 's'} · {remaining} to buy
          </Typography>
          <Button
            size="small"
            color="inherit"
            onClick={clearBought}
            disabled={remaining === items.length}
          >
            Clear bought
          </Button>
        </Stack>
      </Container>
    </Box>
  )
}
