import test from 'node:test';
import assert from 'node:assert/strict';
import db from '../db.js';

test('db exposes query and prepare APIs required by the app', async () => {
  assert.equal(typeof db.query, 'function');
  assert.equal(typeof db.prepare, 'function');
  assert.equal(typeof db.exec, 'function');
});
