# Nala's Minions — working notes for Claude

## Public pages

Standalone HTML pages (`public/moving.html` → `/moving`, `public/japan.html` → `/japan`) sit
beside the React app and hold the long-form context for a set of chores. Chores connect to
them by `project: '<key>'` and `link: { href: '/<key>#<section>', label }`. The app then
offers those sections as link picks in the chore dialog, shows a link chip on each row, and
gives every page its own filter button next to Today / All / Monthly.

**Rule: every new page is wired up exactly the same way.** `test/pages.test.mjs` fails until
all of these are done:

1. **The page**: `public/<key>.html`, self-contained (inline CSS/JS, no build step). Give each
   section a stable `id` and, if the nav is sticky, `[id]{scroll-margin-top:…}` so anchored
   jumps land below it. The page should link back to the relevant chores' context, the way
   `/moving` links each task to its section.
2. **The route**: a `netlify.toml` rewrite `from = "/<key>"` → `to = "/<key>.html"`, placed
   *before* the `/*` SPA fallback.
3. **The registry**: an entry in `PAGES` in `src/links.js` with `key`, `name`, `file`, and
   its linkable `sections` (`{ id, label }`). `key` is the URL path and the chore `project`
   value. Nothing else in the app needs editing — the filter button, link picks, labels,
   and `pageForTask` all read the registry.
4. **The chores**: a script in `scripts/` that stamps `project` and `link` on the page's
   chores and is safe to re-run, following `seed-moving-todos.cjs` (chores defined in a
   data file and upserted by stable id) or `link-japan-todos.cjs` (existing hand-made chores
   matched by id). Add an npm script for it. Link to the most specific anchor that exists
   (a section, or an item id like `/japan#item-ghibli-tickets`); label with the section's
   label from `sectionFor(...)`.

Push-up rule for this repo: each requested change is committed on a branch from
`origin/main`, opened as a PR, and merged so Netlify deploys it. Run `npm test` and
`npm run test:ui` first.
