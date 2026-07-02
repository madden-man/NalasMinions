import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' so the built files load correctly from Electron's file:// protocol
export default defineConfig({
  plugins: [react()],
  base: './',
  // Proxy /api to the backend (server/index.cjs) so the browser dev build can
  // reach MongoDB through it on the same origin (no CORS).
  server: {
    port: 5173,
    strictPort: true,
    proxy: { '/api': 'http://localhost:3001' },
  },
})
