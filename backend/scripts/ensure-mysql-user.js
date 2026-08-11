import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootEnv = path.resolve(__dirname, '../../.env');
dotenv.config({ path: rootEnv });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const user = process.env.DB_USER;
const pass = process.env.DB_PASSWORD;
const db = process.env.DB_NAME;
const mysqlBin = process.env.MYSQL_BIN || 'C:\\xampp\\mysql\\bin\\mysql.exe';

if (!user || !pass || !db) {
  console.error('Missing DB_USER, DB_PASSWORD, or DB_NAME in .env');
  process.exit(1);
}

const esc = (value) => String(value).replaceAll("'", "''");

const sql = `
CREATE DATABASE IF NOT EXISTS \`${db}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${esc(user)}'@'localhost' IDENTIFIED BY '${esc(pass)}';
CREATE USER IF NOT EXISTS '${esc(user)}'@'127.0.0.1' IDENTIFIED BY '${esc(pass)}';
ALTER USER '${esc(user)}'@'localhost' IDENTIFIED BY '${esc(pass)}';
ALTER USER '${esc(user)}'@'127.0.0.1' IDENTIFIED BY '${esc(pass)}';
GRANT ALL PRIVILEGES ON \`${db}\`.* TO '${esc(user)}'@'localhost';
GRANT ALL PRIVILEGES ON \`${db}\`.* TO '${esc(user)}'@'127.0.0.1';
FLUSH PRIVILEGES;
`;

const apply = spawnSync(mysqlBin, ['-u', 'root'], { input: sql, encoding: 'utf8' });
if (apply.status !== 0) {
  console.error(apply.stderr || apply.stdout || 'Failed to apply grants');
  process.exit(apply.status ?? 1);
}

const login = spawnSync(
  mysqlBin,
  ['-u', user, `-p${pass}`, '-e', 'SELECT DATABASE() AS db', db],
  { encoding: 'utf8' },
);

if (login.status !== 0) {
  console.error(login.stderr || login.stdout || 'Login verification failed');
  process.exit(login.status ?? 1);
}

console.log(`MySQL ready for ${user}@localhost / ${db}`);
console.log((login.stdout || '').trim());
