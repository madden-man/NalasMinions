import { useEffect, useState } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Stack,
  Box, Typography, FormHelperText,
} from '@mui/material'
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined'
import { fileToThumbnail, dataUriBytes } from './image'

// Add or edit a grocery item, mirroring AddTaskDialog's contract. `kind`
// picks the form: 'staple' shows brand photo + duration fields, 'oneoff' is
// just a name. Pass `item` to edit (prefills and switches the title/button);
// omit it to add. `onSubmit` receives the field values; the parent decides
// whether that's an insert or an update.
export default function GroceryItemDialog({ open, onClose, onSubmit, kind, item = null }) {
  const isEdit = Boolean(item)
  const isStaple = kind === 'staple'
  const [name, setName] = useState('')
  // Compressed brand photo as a data URI (stored on the item), or null.
  const [imageData, setImageData] = useState(null)
  const [imgError, setImgError] = useState(null)
  const [imgBusy, setImgBusy] = useState(false)
  // Kept as the raw input string so the field can be cleared while typing;
  // validated/coerced on submit.
  const [duration, setDuration] = useState('7')

  // Seed the form each time the dialog opens: from the edited item, or blank
  // defaults for a new one. Never shows stale input.
  useEffect(() => {
    if (!open) return
    setName(item?.text ?? '')
    setImageData(item?.imageData ?? null)
    setImgError(null)
    setDuration(item?.durationDays != null ? String(item.durationDays) : '7')
  }, [open, item])

  // Compress the picked file down to a thumbnail-sized data URI before it
  // ever touches state, so a full-res photo can't land in the document.
  const pickImage = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-picking the same file
    if (!file) return
    setImgBusy(true)
    setImgError(null)
    try {
      setImageData(await fileToThumbnail(file))
    } catch (err) {
      setImgError(err.message)
    } finally {
      setImgBusy(false)
    }
  }

  const trimmed = name.trim()
  const days = Math.floor(Number(duration))
  const validDays = Number.isFinite(days) && days >= 1
  const canSubmit = trimmed && !imgBusy && (!isStaple || validDays)

  const submit = (e) => {
    e.preventDefault()
    if (!canSubmit) return
    onSubmit(
      isStaple
        ? { text: trimmed, imageData: imageData || null, durationDays: days }
        : { text: trimmed },
    )
    onClose()
  }

  const pickerButton = (label) => (
    <Button size="small" component="label" variant="outlined" disabled={imgBusy}>
      {imgBusy ? 'Compressing…' : label}
      <input hidden type="file" accept="image/*" onChange={pickImage} />
    </Button>
  )

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      PaperProps={{ component: 'form', onSubmit: submit }}
    >
      <DialogTitle sx={{ fontWeight: 700 }}>
        {isEdit
          ? `Edit ${isStaple ? 'staple' : 'item'}`
          : `New ${isStaple ? 'staple' : 'item'}`}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <TextField
            autoFocus
            fullWidth
            label="Item"
            placeholder="e.g. Coffee beans"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          {isStaple && (
            <>
              <Box>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Brand photo
                </Typography>
                {imageData ? (
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Box
                      component="img"
                      src={imageData}
                      alt={`${trimmed || 'brand'} preview`}
                      sx={{
                        width: 96,
                        height: 96,
                        objectFit: 'cover',
                        borderRadius: 1,
                        border: 1,
                        borderColor: 'divider',
                      }}
                    />
                    <Stack spacing={0.5} alignItems="flex-start">
                      <Typography variant="caption" color="text.secondary">
                        {Math.max(1, Math.round(dataUriBytes(imageData) / 1024))} KB stored
                      </Typography>
                      {pickerButton('Replace')}
                      <Button size="small" color="inherit" onClick={() => setImageData(null)}>
                        Remove
                      </Button>
                    </Stack>
                  </Stack>
                ) : (
                  <Button
                    component="label"
                    variant="outlined"
                    startIcon={<AddPhotoAlternateOutlinedIcon />}
                    disabled={imgBusy}
                  >
                    {imgBusy ? 'Compressing…' : 'Choose image'}
                    <input hidden type="file" accept="image/*" onChange={pickImage} />
                  </Button>
                )}
                <FormHelperText error={Boolean(imgError)}>
                  {imgError ??
                    'Optional — a photo of the brand to buy. Compressed to a small thumbnail before saving.'}
                </FormHelperText>
              </Box>
              <TextField
                fullWidth
                type="number"
                label="Lasts (days)"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                inputProps={{ min: 1, step: 1 }}
                error={!validDays}
                helperText="How many days a purchase lasts before it's needed again"
              />
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button type="submit" variant="contained" disabled={!canSubmit}>
          {isEdit ? 'Save changes' : 'Add'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
