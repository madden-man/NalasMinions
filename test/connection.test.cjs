// Runtime connectivity test for MongoDB Atlas.
//
// This is the test that catches "the code is fine but the runtime can't talk to
// Atlas" bugs — exactly the Electron-26 failure where the bundled TLS stack
// (BoringSSL 1.1.1) couldn't complete Atlas's handshake and every /api call died
// with `TLSV1_ALERT_INTERNAL_ERROR` (SSL alert 80).
//
// The catch: under plain `node` (system OpenSSL) this ALWAYS passes, even when
// the shipped Electron runtime is broken. So the value comes from running it
// under the SAME runtime the app ships — see `npm run test:electron`, which runs
// this file via Electron's bundled Node (ELECTRON_RUN_AS_NODE). Run it both ways
// in CI and a future Electron up/downgrade with an incompatible TLS stack fails
// here instead of in the user's app.

const test = require('node:test')
const assert = require('node:assert/strict')
const path = require('path')

require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const { MongoClient } = require('mongodb')

const uri = process.env.MONGODB_URI

test(
  'connects to MongoDB Atlas and pings from this runtime',
  { skip: uri ? false : 'MONGODB_URI not set — copy .env.example to .env' },
  async () => {
    // Mirror the real connection options from electron/mongo.cjs so this test
    // exercises the same handshake the app performs.
    const client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 8000,
      appName: 'nalas-minion-todo-test',
    })
    try {
      await client.connect()
      const res = await client.db('tommy-data').command({ ping: 1 })
      assert.equal(res.ok, 1)
    } finally {
      await client.close()
    }
  },
)
