// Electron exposes its preload bridge as window.todoStore; its presence tells
// the desktop build apart from the browser/PWA build. Shared so every page can
// apply the frameless-title-bar drag region (and useRoute can pick hash
// routing, since Electron loads from file:// where URL paths don't exist).
export const isElectron = typeof window !== 'undefined' && Boolean(window.todoStore)
