// Shared setup for the component tests (vitest + jsdom).

import '@testing-library/jest-dom/vitest'

// jsdom has no matchMedia; MUI's useMediaQuery (the chores page's responsive
// calendar layout) needs one. Every query reports "no match", i.e. tests
// render the narrow single-column layout.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })
}
