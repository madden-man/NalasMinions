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
is fixed to `tommy-data` in code, so it doesn't need to be in the URI. The app uses
four collections: `nalas-minions` (one document per chore), `nalas-menu` (one document
per meal — ingredients, recipe steps, and whether it's verified), `nalas-menu-ingredients`
(ingredients read off recipe links, cached by URL), and `meta` (the daily-reset date).
Without a `.env`, the app falls back to a local cache.

Publish the household recipes into `nalas-menu` once:

```bash
npm run seed:meals
```

That upserts every meal in `scripts/meals-data.cjs` — edit a recipe there and re-run it.
It never deletes, so recipes added from the app's **Add recipe** button (paste a link or
the recipe text on `/menu`) survive a re-seed. Seeded recipes are marked `verified`;
imported ones show as **Untried** until somebody cooks from the steps.

`/menu` also reads the meal-planner project's `recipes` collection in the same database
(read-only — this app never writes to it). Those dinners list after everything in
`nalas-menu` and always show as **Untried**: they link to the real recipe but carry no
steps of their own. The mapping lives in `server/recipe-library.cjs`.

### Every recipe has a link, and shops from it
A library dinner used to shop from `produce` — three or four items, and empty for most
dishes — so picking one often added nothing. Instead the menu reads the ingredients off
the dish's own recipe link, through the same schema.org metadata the importer uses, and
keeps two lists: `ingredients` exactly as the recipe publishes them (what the recipe
dialog shows) and `shopping`, the same lines rewritten for a grocery run with cooking
notes dropped and pantry staples skipped (`server/ingredients.cjs`).

Fetching 100+ pages per render would be absurd, so pulls are cached by URL in
`tommy-data.nalas-menu-ingredients` — this app's own collection. Fill it with:

```bash
npm run pull:ingredients            # read whatever isn't cached yet
npm run pull:ingredients -- --force # re-read everything
```

Dishes not yet pulled fall back to `produce`, and the recipe dialog offers a **Read it**
button to pull one on demand.

Some dishes couldn't be read at all: the library had no link, or linked somewhere this
app can't reach — Serious Eats, Simply Recipes, The Spruce Eats and Maangchi all answer
403 to a server-side request, some pages publish no recipe metadata, and some URLs have
gone dead. Those get a curated replacement in `scripts/recipe-links.cjs`, each one
checked to parse into a real ingredient list. Re-check them any time with:

```bash
npm run check:links
```

It exits non-zero when a link stops parsing, which is the cue to pick another. A link
that merely refuses this app (403) still opens fine in a browser, so it stays listed
under the replacement; only genuinely dead ones are dropped.

The household's own meals in `nalas-menu` keep their hand-written ingredient lists —
already phrased the way you'd shop, with salt and water deliberately left off — and link
to their permalink on `/menu` (`/menu/meal-pad-thai`), since nobody else publishes
Kevin's chicken.

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
