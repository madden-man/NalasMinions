# Nala's Minion Todo List

A household-chores todo app built with **React + Material UI (MUI)**. It runs as a
**macOS desktop app** (via Electron) and the same responsive UI works on **iPad and
phone** through the browser (or installed as a PWA / added to the Home Screen).

## Features
- Material Design UI with a clickable checkbox on every task
- Add, complete, delete, and "clear completed" chores
- Progress bar + remaining-count chip
- Tasks sync to **MongoDB** (the `tommy-data` database) from the desktop app, with a
  local cache so it still works offline; the browser build falls back to localStorage
- Responsive layout + safe-area + touch-sized targets for iPad & phone

## Run it

```bash
npm install
```

### Configure MongoDB (desktop app)
The Electron app stores tasks in MongoDB Atlas, in the `tommy-data` database. Point it
at your cluster with a `.env` file in the project root:

```bash
cp .env.example .env
# then edit .env and paste your Atlas SRV connection string into MONGODB_URI
```

In Atlas: **Cluster → Connect → Drivers** to copy the `mongodb+srv://…` string, and
replace `<username>:<password>` with a database user's credentials. The database name
is fixed to `tommy-data` in code, so it doesn't need to be in the URI. The app creates
two collections on first write: `todos` (one document per chore) and `meta` (the
daily-reset date). Without a `.env`, the app falls back to a local cache.

> MongoDB only runs in the Electron desktop app (it needs Node). The browser build
> used on iPad/phone can't reach Mongo directly, so it persists to localStorage.

### As a Mac desktop app (Electron)
```bash
npm run electron:dev
```

### In the browser (use this for iPad / phone)
```bash
npm run dev
```
Then open the printed URL. On the same Wi-Fi, visit `http://<your-mac-ip>:5173`
from an iPad/iPhone, then **Share → Add to Home Screen** to use it like an app.

### Package a distributable .dmg
```bash
npm run electron:build   # output in ./release
```

## Stack
React 18 · MUI 5 · Vite 4 · Electron 26 · MongoDB (Atlas)
