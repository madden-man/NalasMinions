import { useMemo } from 'react'
import { Box, Paper, Typography, IconButton, Stack } from '@mui/material'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

// Build the calendar grid for the month containing `monthDate`: leading blanks
// to line the 1st up under its weekday, then one cell per day, padded out to a
// whole number of weeks. Nulls are rendered as empty cells.
function buildCells(monthDate) {
  const year = monthDate.getFullYear()
  const m = monthDate.getMonth()
  const startOffset = new Date(year, m, 1).getDay()
  const daysInMonth = new Date(year, m + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, m, d))
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

// A month grid with up to three dots per day indicating how many chores fall on
// it. Today is outlined; the selected day is filled. Clicking a day calls
// onSelectDay so the caller can filter its list to that date.
export default function MonthCalendar({
  month, onPrevMonth, onNextMonth, getCount, dayKey, todayKey, selectedKey, onSelectDay,
}) {
  const cells = useMemo(() => buildCells(month), [month])
  const title = month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  return (
    <Paper elevation={1} sx={{ p: 2 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <IconButton size="small" onClick={onPrevMonth} aria-label="previous month">
          <ChevronLeftIcon />
        </IconButton>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        <IconButton size="small" onClick={onNextMonth} aria-label="next month">
          <ChevronRightIcon />
        </IconButton>
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5 }}>
        {WEEKDAYS.map((w) => (
          <Typography
            key={w}
            variant="caption"
            align="center"
            color="text.secondary"
            sx={{ fontWeight: 600 }}
          >
            {w}
          </Typography>
        ))}

        {cells.map((date, i) => {
          if (!date) return <Box key={`empty-${i}`} />
          const key = dayKey(date)
          const count = getCount(date)
          const isToday = key === todayKey
          const isSelected = key === selectedKey
          return (
            <Box
              key={key}
              role="button"
              tabIndex={0}
              aria-label={`${date.toDateString()}, ${count} chore${count === 1 ? '' : 's'}`}
              aria-pressed={isSelected}
              onClick={() => onSelectDay(date)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSelectDay(date)
                }
              }}
              sx={{
                cursor: 'pointer',
                userSelect: 'none',
                aspectRatio: '1 / 1',
                borderRadius: 1.5,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid',
                borderColor: isToday && !isSelected ? 'primary.main' : 'transparent',
                bgcolor: isSelected ? 'primary.main' : 'transparent',
                color: isSelected ? 'primary.contrastText' : 'text.primary',
                '&:hover': { bgcolor: isSelected ? 'primary.dark' : 'action.hover' },
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: isToday ? 700 : 400, lineHeight: 1 }}>
                {date.getDate()}
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.25, mt: 0.5, height: 5 }}>
                {Array.from({ length: Math.min(count, 3) }).map((_, di) => (
                  <Box
                    key={di}
                    sx={{
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      bgcolor: isSelected ? 'primary.contrastText' : 'secondary.main',
                    }}
                  />
                ))}
              </Box>
            </Box>
          )
        })}
      </Box>
    </Paper>
  )
}
