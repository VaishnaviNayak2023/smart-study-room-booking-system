import test from 'node:test';
import assert from 'node:assert/strict';
import env from '../config/env.js';

test('database configuration is environment-driven and MySQL-backed', () => {
  assert.equal(typeof env.DB_HOST, 'string');
  assert.equal(typeof env.DB_PORT, 'number');
  assert.equal(typeof env.DB_NAME, 'string');
  assert.equal(typeof env.DB_USER, 'string');
  assert.equal(typeof env.DB_PASSWORD, 'string');
  assert.equal(typeof env.JWT_SECRET, 'string');
  assert.equal(typeof env.JWT_EXPIRES_IN, 'string');
  assert.equal(typeof env.PORT, 'number');
  assert.ok(env.PORT >= 1 && env.PORT <= 65535);
});
