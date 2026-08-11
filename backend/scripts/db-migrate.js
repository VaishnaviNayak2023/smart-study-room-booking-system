import '../config/env.js';
import mysql from 'mysql2/promise';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const env = {
  host: process.env.DB_HOST || 'mysql',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'booking_user',
  password: process.env.DB_PASSWORD || 'change_me_strong_password',
  database: process.env.DB_NAME || 'booking_configuration',
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function ensureDatabaseAndTables() {
  const connection = await mysql.createConnection({
    host: env.host,
    port: env.port,
    user: env.user,
    password: env.password,
    multipleStatements: true,
  });

  try {
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${env.database}\``);
    await connection.query(`USE \`${env.database}\``);

    const sql = await fs.readFile(path.join(rootDir, 'schema.sql'), 'utf8');
    await connection.query(sql);
    console.log(`Database '${env.database}' ready.`);
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
