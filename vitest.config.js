import { defineConfig } from 'vitest/config'

// Component-test config, separate from vite.config.js on purpose: vitest ships
// its own (newer) vite, and the app's build config must keep building with the
// project's pinned vite. Pure-logic tests stay on `node --test` (npm test);
// these cover the React pages (npm run test:ui).
export default defineConfig({
  // esbuild's automatic JSX runtime stands in for @vitejs/plugin-react, whose
  // peer range doesn't span vitest's bundled vite. Tests don't need HMR or
  // fast-refresh, so the plain transform is enough.
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'jsdom',
    // Globals give testing-library the afterEach it needs to auto-clean the
    // DOM between tests; without it every render piles onto the last one.
    globals: true,
    setupFiles: ['./test/ui/setup.js'],
    include: ['test/ui/**/*.test.jsx'],
  },
})
