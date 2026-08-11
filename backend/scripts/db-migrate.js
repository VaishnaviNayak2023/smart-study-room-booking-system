import '../config/env.js';
import mysql from 'mysql2/promise';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import env from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function ensureDatabaseAndTables() {
  const connection = await mysql.createConnection({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    multipleStatements: true,
  });

  try {
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${env.DB_NAME}\``);
    await connection.query(`USE \`${env.DB_NAME}\``);

    const sql = await fs.readFile(path.join(rootDir, 'schema.sql'), 'utf8');
    await connection.query(sql);
    console.log(`Database '${env.DB_NAME}' ready.`);
  } finally {
    await connection.end();
  }
}

async function main() {
  const maxAttempts = 30;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await ensureDatabaseAndTables();
      return;
    } catch (error) {
      const message = error?.message || String(error);
      console.log(`Waiting for MySQL (${attempt}/${maxAttempts}): ${message}`);
      if (attempt === maxAttempts) {
        throw error;
      }
      await sleep(5000);
    }
  }
}

main().catch((error) => {
  console.error('Database migration failed:', error.message || error);
  process.exit(1);
});
