import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AppBar, Toolbar, Typography, Container, Box, Paper, List, ListItem,
  ListItemButton, ListItemIcon, ListItemText, Checkbox, IconButton, Button,
  Chip, Stack, TextField, Tooltip,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import AddIcon from '@mui/icons-material/Add'
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined'
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu'
import RepeatIcon from '@mui/icons-material/Repeat'
import LaunchIcon from '@mui/icons-material/Launch'
import ScheduleIcon from '@mui/icons-material/Schedule'
import { isElectron } from './platform'
import { loadTasks, addTask as upsertTask } from './storage'
import {
  isGroceryTask, createGroceryTask, renewGroceryItems, toggleGroceryItem, restockDate,
  addStaple, updateStaple, removeStaple,
  addOneOff, toggleOneOff, updateOneOff, removeOneOff, clearBoughtOneOffs,
} from './grocery'
import GroceryItemDialog from './GroceryItemDialog'

// Short label for a brand link chip, e.g. "organicvalley.coop".
const brandLabel = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return 'Brand'
  }
}

// Hover preview for a brand link: the site's favicon and name with the full
// URL underneath, so it's clear where the chip goes before clicking. The
// favicon comes from Google's favicon service and simply hides itself if the
// request fails (offline, blocked, no icon).
function LinkPreview({ url }) {
  return (
    <Stack spacing={0.5} sx={{ p: 0.5, maxWidth: 280 }}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Box
          component="img"
          src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(brandLabel(url))}&sz=32`}
          alt=""
          onError={(e) => {
            e.currentTarget.style.display = 'none'
          }}
          sx={{ width: 20, height: 20, borderRadius: 0.5, bgcolor: 'common.white' }}
        />
        <Typography variant="subtitle2">{brandLabel(url)}</Typography>
      </Stack>
      <Typography variant="caption" sx={{ wordBreak: 'break-all', opacity: 0.8 }}>
        {url}
      </Typography>
    </Stack>
  )
}

// Edit + delete actions shared by both lists' rows.
function RowActions({ name, onEdit, onRemove }) {
  return (
    <Stack direction="row" spacing={0}>
      <Tooltip title="Edit">
        <IconButton aria-label={`edit ${name}`} onClick={onEdit}>
          <EditOutlinedIcon />
        </IconButton>
      </Tooltip>
      <Tooltip title="Delete">
        <IconButton edge="end" aria-label={`delete ${name}`} onClick={onRemove}>
          <DeleteOutlineIcon />
        </IconButton>
      </Tooltip>
    </Stack>
  )
}

// One staple row from the recurring grocery task: checkbox = bought, a
// thumbnail of the brand to buy (hover zooms it), and a chip showing the
// restock cadence. When bought, another chip says when the item comes back
// onto the list. Items that predate photos and still carry a brandUrl fall
// back to the old link chip until a photo is set.
function StapleRow({ item, onToggle, onEdit, onRemove }) {
  const bought = Boolean(item.purchasedAt)
  const back = restockDate(item)
  return (
    <ListItem
      disablePadding
      divider
      secondaryAction={
        <RowActions name={item.text} onEdit={() => onEdit(item)} onRemove={() => onRemove(item.id)} />
      }
    >
      {/* Extra right padding clears the two secondary-action icons. */}
      <ListItemButton onClick={() => onToggle(item.id)} sx={{ py: 1.25, pr: 12 }}>
        <ListItemIcon sx={{ minWidth: 44 }}>
          <Checkbox
            edge="start"
            checked={bought}
            tabIndex={-1}
            disableRipple
            inputProps={{ 'aria-label': `Mark ${item.text} bought` }}
          />
        </ListItemIcon>
        {item.imageData && (
          <Tooltip
            arrow
            placement="right"
            title={
              <Box
                component="img"
                src={item.imageData}
                alt={item.text}
                sx={{ display: 'block', maxWidth: 220, maxHeight: 220, borderRadius: 1 }}
              />
            }
          >
            <Box
              component="img"
              src={item.imageData}
              alt=""
              sx={{
                width: 44,
                height: 44,
                objectFit: 'cover',
                borderRadius: 1,
                mr: 1.5,
                flexShrink: 0,
                opacity: bought ? 0.5 : 1,
              }}
            />
          </Tooltip>
        )}
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
              {/* Legacy brand link, shown only until a photo replaces it. It's
                  a real link; stop the click so following it doesn't also
                  toggle the row. */}
              {!item.imageData && item.brandUrl && (
                <Tooltip arrow placement="top" title={<LinkPreview url={item.brandUrl} />}>
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
                </Tooltip>
              )}
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
  // The add/edit dialog: { kind: 'staple' | 'oneoff', item: object | null }
  // (item null = adding), or null when closed.
  const [dialog, setDialog] = useState(null)
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
  const deleteStaple = (itemId) =>
    setGrocery((prev) => (prev ? removeStaple(prev, itemId) : prev))

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

  // Route the dialog's fields to the right list operation: add or update, for
  // whichever kind of item the dialog was opened on.
  const submitDialog = (fields) => {
    if (!dialog) return
    setGrocery((prev) => {
      if (!prev) return prev
      if (dialog.kind === 'staple')
        return dialog.item ? updateStaple(prev, dialog.item.id, fields) : addStaple(prev, fields)
      return dialog.item ? updateOneOff(prev, dialog.item.id, fields) : addOneOff(prev, fields.text)
    })
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
          <Tooltip title="Weekly menu">
            <IconButton
              color="inherit"
              aria-label="weekly menu"
              onClick={() => navigate('/menu')}
              sx={{ ml: 1, WebkitAppRegion: 'no-drag' }}
            >
              <RestaurantMenuIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Container maxWidth="sm" sx={{ mt: { xs: 2, sm: 4 } }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          The household grocery list. Check items off as they land in the cart.
        </Typography>

        {/* Staples — the recurring grocery task. Each item links to the brand
            we buy and reappears automatically once its duration runs out. */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Staples · renew automatically
          </Typography>
          <Button
            size="small"
            startIcon={<AddIcon />}
            disabled={!grocery}
            onClick={() => setDialog({ kind: 'staple', item: null })}
          >
            Add staple
          </Button>
        </Stack>
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
            ) : staples.length === 0 ? (
              <ListItem>
                <ListItemText primary="No staples yet" secondary="Use Add staple above." />
              </ListItem>
            ) : (
              staples.map((item) => (
                <StapleRow
                  key={item.id}
                  item={item}
                  onToggle={toggleStaple}
                  onEdit={(it) => setDialog({ kind: 'staple', item: it })}
                  onRemove={deleteStaple}
                />
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
                    <RowActions
                      name={item.text}
                      onEdit={() => setDialog({ kind: 'oneoff', item })}
                      onRemove={() => remove(item.id)}
                    />
                  }
                >
                  {/* Unlike chores (row opens the edit dialog), a grocery row
                      toggles on tap — editing is the pencil on the right. */}
                  <ListItemButton onClick={() => toggle(item.id)} sx={{ py: 1.25, pr: 12 }}>
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

      <GroceryItemDialog
        open={Boolean(dialog)}
        onClose={() => setDialog(null)}
        onSubmit={submitDialog}
        kind={dialog?.kind ?? 'oneoff'}
        item={dialog?.item ?? null}
      />
    </Box>
  )
}
