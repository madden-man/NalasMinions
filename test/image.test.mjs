// Unit test for the data-URI size estimator (src/image.js). fileToThumbnail
// itself needs a DOM (Image, canvas) so it isn't unit-tested here.

import test from 'node:test'
import assert from 'node:assert/strict'

import { dataUriBytes } from '../src/image.js'

test('dataUriBytes: decodes base64 payload length, ignoring the header', () => {
  // 'Zm9vYmFy' is "foobar" — 8 base64 chars, 6 bytes.
  assert.equal(dataUriBytes('data:image/jpeg;base64,Zm9vYmFy'), 6)
  // Longer header must not change the answer.
  assert.equal(dataUriBytes('data:image/png;charset=x;base64,Zm9vYmFy'), 6)
})
