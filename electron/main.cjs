const path = require('path')

// Load MONGODB_URI (and any other secrets) from a local .env file before
// anything reads process.env. Safe to call when no .env exists.
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const { app, BrowserWindow, shell } = require('electron')
const apiServer = require('../server/index.cjs')
const mongo = require('./mongo.cjs')

const isDev = process.env.ELECTRON_DEV === '1'
// The renderer reaches MongoDB through the HTTP API — the same backend the
// browser/iPad/phone use — instead of a separate IPC bridge. We start that
// server in-process here and tell the renderer where to find it.
const API_PORT = Number(process.env.PORT) || 3001
const API_BASE = `http://localhost:${API_PORT}`

function createWindow() {
  const win = new BrowserWindow({
    width: 480,
    height: 760,
    minWidth: 360,
    minHeight: 480,
    titleBarStyle: 'hiddenInset', // native-feeling Mac traffic lights
    backgroundColor: '#f5f3fb',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.cjs'),
      // Pass the API base to the preload, which exposes it to the renderer.
      additionalArguments: [`--api-base=${API_BASE}`],
    },
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }

  // Open external links in the default browser, not inside the app
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

app.whenReady().then(() => {
  // Start the shared MongoDB-backed API server, then open the window.
  apiServer.start(API_PORT)
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// Close the MongoDB connection cleanly on quit.
app.on('before-quit', () => {
  mongo.close()
})
