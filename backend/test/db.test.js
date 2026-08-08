import test from 'node:test';
import assert from 'node:assert/strict';
import db from '../db.js';

test('db.prepare().get() works for a simple query', async () => {
  const result = await db.prepare('SELECT 1 AS value').get();
  assert.deepEqual(result, { value: 1 });
});
