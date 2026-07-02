import { useEffect, useState } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
  ToggleButton, ToggleButtonGroup, Typography, Stack, Box,
} from '@mui/material'

// Recurrence options offered in the dialog. `value` is what we persist on the
// task; `label` is what the minion sees.
export const RECURRENCE_OPTIONS = [
  { value: 'once', label: 'Once' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Biweekly' },
  { value: 'monthly', label: 'Monthly' },
]

// Who a chore can be assigned to.
export const ASSIGNEES = ['Tommy', 'Alison']

export default function AddTaskDialog({ open, onClose, onAdd }) {
  const [name, setName] = useState('')
  const [recurrence, setRecurrence] = useState('once')
  const [assignee, setAssignee] = useState(ASSIGNEES[0])
  // Local "YYYY-MM-DDTHH:mm" string from the datetime-local input, or '' for no
  // due date. Stored on the task as `dueAt`.
  const [due, setDue] = useState('')

  // Reset the form each time the dialog opens so it never shows stale input.
  useEffect(() => {
    if (open) {
      setName('')
      setRecurrence('once')
      setAssignee(ASSIGNEES[0])
      setDue('')
    }
  }, [open])

  const trimmed = name.trim()

  const submit = (e) => {
    e.preventDefault()
    if (!trimmed) return
    onAdd({ text: trimmed, recurrence, assignee, dueAt: due || null })
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      PaperProps={{ component: 'form', onSubmit: submit }}
    >
      <DialogTitle sx={{ fontWeight: 700 }}>New chore</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <TextField
            autoFocus
            fullWidth
            label="Task name"
            placeholder="e.g. Sweep the porch"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <TextField
            fullWidth
            type="datetime-local"
            label="Due date & time"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            // datetime-local always shows a placeholder, so keep the label lifted.
            InputLabelProps={{ shrink: true }}
            helperText={due ? '' : 'Optional — leave blank for no due date'}
            InputProps={{
              endAdornment: due ? (
                <Button size="small" color="inherit" onClick={() => setDue('')}>
                  Clear
                </Button>
              ) : null,
            }}
          />

          <Box>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Recurrence
            </Typography>
            <ToggleButtonGroup
              fullWidth
              exclusive
              size="small"
              color="primary"
              value={recurrence}
              onChange={(_, v) => v && setRecurrence(v)}
            >
              {RECURRENCE_OPTIONS.map((opt) => (
                <ToggleButton key={opt.value} value={opt.value}>
                  {opt.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>

          <Box>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Assign to
            </Typography>
            <ToggleButtonGroup
              fullWidth
              exclusive
              color="primary"
              value={assignee}
              onChange={(_, v) => v && setAssignee(v)}
            >
              {ASSIGNEES.map((name) => (
                <ToggleButton key={name} value={name}>
                  {name}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button type="submit" variant="contained" disabled={!trimmed}>
          Add chore
        </Button>
      </DialogActions>
    </Dialog>
  )
}
