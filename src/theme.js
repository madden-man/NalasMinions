import { createTheme } from '@mui/material/styles'

// Material Design theme. Touch-friendly defaults so it feels native on iPad & phone.
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#7e57c2' },   // Nala purple
    secondary: { main: '#26a69a' },
    background: { default: '#f5f3fb' },
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: 'Roboto, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
    h5: { fontWeight: 700 },
  },
  components: {
    // Bigger touch targets for tablets/phones
    MuiCheckbox: { defaultProps: { size: 'medium' }, styleOverrides: { root: { padding: 10 } } },
    MuiListItemButton: { styleOverrides: { root: { borderRadius: 12 } } },
  },
})

export default theme
