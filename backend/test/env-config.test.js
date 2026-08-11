import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envExamplePath = path.resolve(__dirname, '..', '..', '.env.example');
const envText = fs.readFileSync(envExamplePath, 'utf8');

for (const key of ['MYSQL_DATABASE', 'MYSQL_USER', 'MYSQL_PASSWORD', 'MYSQL_ROOT_PASSWORD']) {
  test(`${key} is present in .env.example for Docker Compose`, () => {
    assert.match(envText, new RegExp(`^${key}=`, 'm'), `${key} is missing from .env.example`);
  });
}
