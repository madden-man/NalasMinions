// Netlify Function backing the web app's HTTP API in the cloud.
//
// Netlify is a static host and can't run the persistent server in
// server/index.cjs, so this mirrors its /api routes as a serverless function,
// reusing the same MongoDB layer (electron/mongo.cjs) and push helper
// (server/notify.cjs). netlify.toml rewrites /api/* to this function, so the
// client (src/storage.js) needs no changes.
//
// Env vars are configured in the Netlify dashboard (Site settings → Environment
// variables), not from .env: MONGODB_URI (required for tasks), NTFY_TOPIC
// (required for bump + reminders), and optionally NTFY_SERVER / REMINDER_TZ.

const mongo = require('../../electron/mongo.cjs')
const { notify, cancelScheduled } = require('../../server/notify.cjs')
const { ensureReminderScheduled } = require('../../server/schedule.cjs')
const { mealFromInput } = require('../../server/recipe.cjs')
const { pullIngredients } = require('../../server/ingredients.cjs')

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify(body),
})

// Reminder markers live in the `meta` collection so client task saves can't
// clobber them.
const getMarker = (taskId) => mongo.getMeta(`reminder:${taskId}`)
const setMarker = (taskId, value) => mongo.setMeta(`reminder:${taskId}`, value)

// Keep a chore's ntfy reminder in sync. Best-effort: a notify failure must not
// fail the underlying task write.
async function scheduleReminder(task) {
  if (!task || !task.id) return
  try {
    await ensureReminderScheduled(task, { notify, cancelScheduled, getMarker, setMarker })
  } catch (err) {
    console.error('[fn api] reminder sync failed:', err.message)
  }
}

exports.handler = async (event) => {
  // Normalize the path whether Netlify passes the original request path
  // (/api/tasks) or the rewritten target (/.netlify/functions/api/tasks).
  const sub =
    (event.path || '')
      .replace(/^\/\.netlify\/functions\/api/, '')
      .replace(/^\/api/, '') || '/'
  const method = event.httpMethod

  const parseBody = () => {
    try {
      return event.body ? JSON.parse(event.body) : null
    } catch {
      return null
    }
  }

  try {
    // Bump works without a database, so handle it before the Mongo gate.
    if (sub === '/bump' && method === 'POST') {
      await notify(parseBody() || {})
      return json(200, { ok: true })
    }

    if (!mongo.isEnabled()) {
      return json(503, { error: 'MONGODB_URI is not set in the Netlify environment' })
    }

    if (sub === '/tasks' && method === 'GET') return json(200, { tasks: await mongo.loadTasks() })
    if (sub === '/tasks' && method === 'POST') {
      const task = parseBody()
      await mongo.addTask(task)
      // Queue a reminder right away so a chore due soon doesn't wait for the
      // hourly sweep. Best-effort: a notify failure shouldn't fail the add.
      await scheduleReminder(task)
      return json(201, { ok: true })
    }
    if (sub === '/tasks' && method === 'PUT') {
      const tasks = parseBody()
      await mongo.saveTasks(tasks)
      // Re-sync reminders so an edited due time / recurrence (or a completed
      // one-off) reschedules or cancels its push without waiting for the sweep.
      if (Array.isArray(tasks)) for (const t of tasks) await scheduleReminder(t)
      return json(200, { ok: true })
    }

    // The weekly menu's meal catalog.
    if (sub === '/meals' && method === 'GET') return json(200, { meals: await mongo.loadMeals() })
    // Add a recipe from a link or pasted text. Parsing happens here (the
    // browser can't fetch another site), and a bad paste is the user's problem
    // to fix, so those errors come back as 400 with the reason.
    if (sub === '/meals' && method === 'POST') {
      let meal
      try {
        const body = parseBody()
        meal = await mealFromInput(body && body.input)
      } catch (err) {
        return json(400, { error: err.message })
      }
      return json(201, { meal: await mongo.addMeal(meal) })
    }

    // Read a recipe link's ingredients now, and cache them. The backfill
    // script (npm run pull:ingredients) fills this in bulk; this is the retry
    // for a dish whose page was down when it ran.
    if (sub === '/ingredients' && method === 'POST') {
      const body = parseBody()
      const url = body && body.url
      if (!url) return json(400, { error: 'Give a recipe url to read.' })
      let pulled
      try {
        pulled = await pullIngredients(url)
      } catch (err) {
        // The site being unreadable is the caller's answer, not a crash.
        return json(400, { error: err.message })
      }
      return json(200, { ingredients: await mongo.saveIngredients(pulled) })
    }

    if (sub.startsWith('/meta/')) {
      const key = decodeURIComponent(sub.slice('/meta/'.length))
      if (method === 'GET') return json(200, { value: await mongo.getMeta(key) })
      if (method === 'PUT') {
        const body = parseBody()
        await mongo.setMeta(key, body ? body.value : null)
        return json(200, { ok: true })
      }
    }

    return json(404, { error: 'unknown endpoint' })
  } catch (err) {
    console.error('[fn api] error:', err.message)
    return json(500, { error: err.message })
  }
}
