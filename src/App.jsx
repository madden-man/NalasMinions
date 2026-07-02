import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AppBar, Toolbar, Typography, Container, Box, Paper, List, ListItem,
  ListItemButton, ListItemIcon, ListItemText, Checkbox, IconButton,
  Button, LinearProgress, Chip, Stack, Tooltip, ToggleButton, ToggleButtonGroup,
  useMediaQuery,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import AddIcon from '@mui/icons-material/Add'
import RepeatIcon from '@mui/icons-material/Repeat'
import PersonIcon from '@mui/icons-material/Person'
import ScheduleIcon from '@mui/icons-material/Schedule'
import TodayIcon from '@mui/icons-material/Today'
import ViewListIcon from '@mui/icons-material/ViewList'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import CleaningServicesIcon from '@mui/icons-material/CleaningServices'
import PetsIcon from '@mui/icons-material/Pets'
import CampaignIcon from '@mui/icons-material/Campaign'
import { loadTasks, addTask as addStoredTask, saveTasks, getMeta, setMeta, bump } from './storage'
import AddTaskDialog, { RECURRENCE_OPTIONS } from './AddTaskDialog'
import MonthCalendar from './MonthCalendar'

const RESET_KEY = 'nalas-minion-reset-date'

// Electron uses a frameless title bar (titleBarStyle: 'hiddenInset'), so the
// top bar doubles as the OS drag handle there. The preload bridge only exists
// in Electron, so its presence tells the two builds apart.
const isElectron = typeof window !== 'undefined' && Boolean(window.todoStore)

// Local calendar day, e.g. "2026-06-12". Used to detect a midnight rollover.
function todayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`
}

// Human-readable label for a recurrence value, e.g. 'daily' -> 'Daily'.
const recurrenceLabel = (value) =>
  RECURRENCE_OPTIONS.find((o) => o.value === value)?.label ?? 'Once'

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1)
const sameDay = (a, b) => startOfDay(a).getTime() === startOfDay(b).getTime()
const weeksBetween = (a, b) =>
  Math.floor(Math.abs(startOfDay(b) - startOfDay(a)) / (7 * 24 * 60 * 60 * 1000))

// The date a task's schedule is anchored to: its explicit due date if set,
// otherwise the creation time encoded in its numeric id. null when neither is
// available (e.g. the legacy seed tasks), which callers treat as "always due".
function taskAnchor(task) {
  if (task.dueAt) {
    const d = new Date(task.dueAt)
    if (!Number.isNaN(d.getTime())) return d
  }
  const n = Number(task.id)
  if (Number.isFinite(n) && n > 1e12) return new Date(n)
  return null
}

// Whether a task belongs on a given day's list. Daily chores always do; the
// other cadences match the weekday / day-of-month of the task's anchor date; a
// one-off shows only on its due day (or always, if it never got a due date).
function isDueOn(task, date = new Date()) {
  const rec = task.recurrence || 'once'
  if (rec === 'daily') return true
  const anchor = taskAnchor(task)
  if (!anchor) return true
  switch (rec) {
    case 'weekly':
      return anchor.getDay() === date.getDay()
    case 'biweekly':
      return anchor.getDay() === date.getDay() && weeksBetween(anchor, date) % 2 === 0
    case 'monthly':
      return anchor.getDate() === date.getDate()
    case 'once':
    default:
      return task.dueAt ? sameDay(anchor, date) : true
  }
}

// Compact label for a due date stored as a "YYYY-MM-DDTHH:mm" string, e.g.
// "Today 2:30 PM" or "Jun 14, 9:00 AM". Returns null for missing/invalid input.
function dueLabel(dueAt) {
  if (!dueAt) return null
  const d = new Date(dueAt)
  if (Number.isNaN(d.getTime())) return null
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  const day =
    todayKey(d) === todayKey()
      ? 'Today'
      : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  return `${day}, ${time}`
}

// One chore row: a checkbox + name with assignee / recurrence / due chips, plus
// a delete action. Shared by the single-column lists and the monthly day list.
function TaskRow({ task, onToggle, onRemove }) {
  return (
    <ListItem
      disablePadding
      divider
      secondaryAction={
        <Tooltip title="Delete">
          <IconButton edge="end" aria-label="delete" onClick={() => onRemove(task.id)}>
            <DeleteOutlineIcon />
          </IconButton>
        </Tooltip>
      }
    >
      <ListItemButton onClick={() => onToggle(task.id)} sx={{ py: 1.25 }}>
        <ListItemIcon sx={{ minWidth: 44 }}>
          <Checkbox
            edge="start"
            checked={task.done}
            tabIndex={-1}
            disableRipple
            inputProps={{ 'aria-label': task.text }}
          />
        </ListItemIcon>
        <ListItemText
          primary={task.text}
          primaryTypographyProps={{
            sx: {
              textDecoration: task.done ? 'line-through' : 'none',
              color: task.done ? 'text.disabled' : 'text.primary',
            },
          }}
          secondaryTypographyProps={{ component: 'div' }}
          secondary={
            <Stack direction="row" spacing={0.75} sx={{ mt: 0.5 }} useFlexGap flexWrap="wrap">
              {task.assignee && (
                <Chip size="small" variant="outlined" icon={<PersonIcon />} label={task.assignee} />
              )}
              {task.recurrence && task.recurrence !== 'once' && (
                <Chip
                  size="small"
                  variant="outlined"
                  icon={<RepeatIcon />}
                  label={recurrenceLabel(task.recurrence)}
                />
              )}
              {dueLabel(task.dueAt) && (
                <Chip
                  size="small"
                  variant="outlined"
                  icon={<ScheduleIcon />}
                  label={dueLabel(task.dueAt)}
                  // Flag overdue, but not once the chore is checked off.
                  color={!task.done && new Date(task.dueAt) < new Date() ? 'error' : 'default'}
                />
              )}
            </Stack>
          }
        />
      </ListItemButton>
    </ListItem>
  )
}

export default function App() {
  const theme = useTheme()
  // The calendar needs room for a 7-column grid beside the list; only offer the
  // monthly view once there's enough width to render it well.
  const wide = useMediaQuery(theme.breakpoints.up('md'))
  const [tasks, setTasks] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  // View mode: 'today' = chores due today, 'all' = every task as a flat list,
  // 'monthly' = the calendar grid beside the all-tasks list (wide screens only).
  const [view, setView] = useState('today')
  // The month shown by the calendar (anchored to its 1st), and the day picked
  // within it — when set, the monthly list narrows to that day's chores.
  const [calMonth, setCalMonth] = useState(() => startOfMonth(new Date()))
  const [selectedDay, setSelectedDay] = useState(null)
  // Set when a change was already persisted by a targeted op (e.g. an insert),
  // so the bulk array-sync effect skips that one render and doesn't write twice.
  const skipNextSave = useRef(false)

  // Pull the task list from MongoDB on mount. Start empty when nothing is
  // stored — chores are added by the user via the + button. Then apply the
  // daily reset so checkmarks clear once the calendar day has rolled over.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        let initial = (await loadTasks()) ?? []

        if ((await getMeta(RESET_KEY)) !== todayKey()) {
          initial = initial.map((t) => ({ ...t, done: false }))
          await setMeta(RESET_KEY, todayKey())
        }
        if (!cancelled) setTasks(initial)
      } catch (err) {
        // No localStorage fallback by design: show an empty list and make the
        // failure visible rather than silently diverging from the database.
        console.error('Failed to load tasks from MongoDB:', err)
      } finally {
        if (!cancelled) setLoaded(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Persist on every change, but only after the initial load has populated
  // state — otherwise the empty starting array would overwrite stored tasks.
  // Skip the change that a targeted op (an add) already persisted on its own.
  useEffect(() => {
    if (!loaded) return
    if (skipNextSave.current) {
      skipNextSave.current = false
      return
    }
    saveTasks(tasks).catch((err) => console.error('Failed to save tasks to MongoDB:', err))
  }, [tasks, loaded])

  // Reset checkmarks at midnight while the app stays open. Schedule a timer for
  // the next local midnight, and also re-check whenever the tab regains focus
  // (covers the machine sleeping through midnight, where a timer would drift).
  useEffect(() => {
    let timeoutId

    const resetIfNewDay = async () => {
      if ((await getMeta(RESET_KEY)) !== todayKey()) {
        await setMeta(RESET_KEY, todayKey())
        setTasks((prev) => prev.map((t) => ({ ...t, done: false })))
      }
    }

    const scheduleMidnight = () => {
      const now = new Date()
      const nextMidnight = new Date(
        now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0,
      )
      timeoutId = setTimeout(() => {
        resetIfNewDay()
        scheduleMidnight()
      }, nextMidnight - now + 1000)
    }

    const onVisible = () => {
      if (document.visibilityState === 'visible') resetIfNewDay()
    }

    scheduleMidnight()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  // Active view ('today' | 'all' | 'monthly'). Monthly is available at any
  // width; on narrow screens its calendar and list just stack vertically.
  // Aliased so the branches below read clearly.
  const effectiveView = view

  // The tasks shown in the list area for the active view. Counts and progress
  // below track this set, so the header reflects what the user is looking at.
  const visibleTasks = useMemo(() => {
    if (effectiveView === 'today') return tasks.filter((t) => isDueOn(t))
    if (effectiveView === 'monthly' && selectedDay)
      return tasks.filter((t) => isDueOn(t, selectedDay))
    return tasks
  }, [tasks, effectiveView, selectedDay])

  const remaining = useMemo(() => visibleTasks.filter((t) => !t.done).length, [visibleTasks])
  const progress = visibleTasks.length
    ? ((visibleTasks.length - remaining) / visibleTasks.length) * 100
    : 0

  // Toggle a calendar day: clicking the active day clears it (back to all tasks).
  const pickDay = (date) =>
    setSelectedDay((prev) => (prev && sameDay(prev, date) ? null : date))

  const toggle = (id) =>
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))
  const remove = (id) => setTasks((prev) => prev.filter((t) => t.id !== id))

  const addTask = ({ text, recurrence, assignee, dueAt }) => {
    const task = { id: `${Date.now()}`, text, done: false, recurrence, assignee, dueAt }
    // Persist just this new task (insert into tommy-data.nalas-minions), and
    // tell the bulk-sync effect to skip the resulting state change so the same
    // chore isn't written a second time.
    skipNextSave.current = true
    setTasks((prev) => [task, ...prev])
    addStoredTask(task).catch((err) =>
      console.error('Failed to upsert task to MongoDB:', err),
    )
  }

  // Fire the bump push notification (ntfy, via the server). Fire-and-forget: a
  // failed notify shouldn't throw in the click handler.
  const handleBump = () => {
    bump().catch((err) => console.error('Failed to send bump notification:', err))
  }

  // Empty-state copy depends on why the list is empty (no tasks at all, nothing
  // today, or nothing on the picked calendar day).
  const dayPicked = effectiveView === 'monthly' && selectedDay
  const empty = !tasks.length
    ? { primary: 'No chores yet', secondary: 'Tap + in the top right to add the first one.' }
    : dayPicked
    ? {
        primary: `Nothing on ${selectedDay.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}`,
        secondary: 'Pick another day, or tap the day again to see all tasks.',
      }
    : effectiveView === 'today'
    ? {
        primary: 'Nothing due today',
        secondary: 'Switch to All tasks to see everything, or tap + to add one.',
      }
    : { primary: 'No chores yet', secondary: 'Tap + in the top right to add the first one.' }

  const taskList = (
    <Paper elevation={1} sx={{ overflow: 'hidden' }}>
      <List disablePadding>
        {visibleTasks.length === 0 ? (
          <ListItem>
            <ListItemText primary={empty.primary} secondary={empty.secondary} />
          </ListItem>
        ) : (
          visibleTasks.map((task) => (
            <TaskRow key={task.id} task={task} onToggle={toggle} onRemove={remove} />
          ))
        )}
      </List>
    </Paper>
  )

  return (
    <Box sx={{ minHeight: '100vh', pb: 6 }}>
      <AppBar position="sticky" elevation={2} sx={{ pt: 'env(safe-area-inset-top)' }}>
        {/* In Electron the toolbar is the window's drag region; interactive
            controls inside opt out with WebkitAppRegion: 'no-drag'. Leave room
            on the left for the macOS traffic lights. */}
        <Toolbar
          sx={{
            WebkitAppRegion: isElectron ? 'drag' : undefined,
            pl: isElectron ? '78px' : undefined,
          }}
        >
          <PetsIcon sx={{ mr: 1.5 }} />
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }} noWrap>
            Nala&apos;s Minion Todo List
          </Typography>
          <Chip
            icon={<CleaningServicesIcon />}
            label={remaining === 0 ? 'All done!' : `${remaining} left`}
            color={remaining === 0 ? 'success' : 'default'}
            sx={{ bgcolor: 'rgba(255,255,255,0.18)', color: 'inherit', '& .MuiChip-icon': { color: 'inherit' } }}
          />
          <Tooltip title="Bump housework">
            <Button
              variant="contained"
              color="secondary"
              startIcon={<CampaignIcon />}
              onClick={handleBump}
              sx={{ ml: 1, fontWeight: 700, WebkitAppRegion: 'no-drag' }}
            >
              Bump
            </Button>
          </Tooltip>
          <Tooltip title="Add chore">
            <IconButton
              edge="end"
              color="inherit"
              aria-label="add chore"
              onClick={() => setDialogOpen(true)}
              sx={{ ml: 1, WebkitAppRegion: 'no-drag' }}
            >
              <AddIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
        <LinearProgress
          variant="determinate"
          value={progress}
          color="secondary"
          sx={{ height: 6 }}
        />
      </AppBar>

      <Container
        maxWidth={effectiveView === 'monthly' ? false : 'sm'}
        sx={{ mt: { xs: 2, sm: 4 } }}
      >
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Chores to keep the house running for Nala. Tap a checkbox when a minion finishes a task.
        </Typography>

        <Box sx={{ mb: 2 }}>
          <ToggleButtonGroup
            exclusive
            size="small"
            color="primary"
            value={effectiveView}
            onChange={(_, v) => v && setView(v)}
            aria-label="task view"
          >
            <ToggleButton value="today" aria-label="today's chores">
              <TodayIcon fontSize="small" sx={{ mr: 0.75 }} />
              Today
            </ToggleButton>
            <ToggleButton value="all" aria-label="all chores">
              <ViewListIcon fontSize="small" sx={{ mr: 0.75 }} />
              All tasks
            </ToggleButton>
            <ToggleButton value="monthly" aria-label="monthly calendar">
              <CalendarMonthIcon fontSize="small" sx={{ mr: 0.75 }} />
              Monthly
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Task list — calendar + all-tasks list side by side in monthly view,
            a single list otherwise. */}
        {effectiveView === 'monthly' ? (
          <Stack
            direction={wide ? 'row' : 'column'}
            spacing={2}
            alignItems={wide ? 'flex-start' : 'stretch'}
          >
            <Box sx={{ width: wide ? 360 : '100%', flexShrink: 0 }}>
              <MonthCalendar
                month={calMonth}
                onPrevMonth={() => setCalMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
                onNextMonth={() => setCalMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
                getCount={(date) => tasks.filter((t) => isDueOn(t, date)).length}
                dayKey={todayKey}
                todayKey={todayKey()}
                selectedKey={selectedDay ? todayKey(selectedDay) : null}
                onSelectDay={pickDay}
              />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ mb: 1, minHeight: 32 }}
              >
                <Typography variant="subtitle2" color="text.secondary">
                  {selectedDay
                    ? selectedDay.toLocaleDateString(undefined, {
                        weekday: 'long',
                        month: 'short',
                        day: 'numeric',
                      })
                    : 'All tasks'}
                </Typography>
                {selectedDay && (
                  <Button size="small" color="inherit" onClick={() => setSelectedDay(null)}>
                    Show all
                  </Button>
                )}
              </Stack>
              {taskList}
            </Box>
          </Stack>
        ) : (
          taskList
        )}

        <Stack direction="row" justifyContent="space-between" sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary">
            {effectiveView === 'today' ? 'Today: ' : dayPicked ? 'Selected: ' : 'All: '}
            {visibleTasks.length} task{visibleTasks.length === 1 ? '' : 's'} · {remaining} remaining
          </Typography>
          <Button
            size="small"
            color="inherit"
            onClick={() => setTasks((prev) => prev.filter((t) => !t.done))}
            disabled={remaining === tasks.length}
          >
            Clear completed
          </Button>
        </Stack>
      </Container>

      <AddTaskDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onAdd={addTask}
      />
    </Box>
  )
}
