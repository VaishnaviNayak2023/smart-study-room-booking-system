import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

for (const candidate of [
  path.resolve(projectRoot, '.env'),
  path.resolve(projectRoot, '.env.local'),
  path.resolve(projectRoot, '..', '.env'),
  path.resolve(projectRoot, '..', '.env.local'),
]) {
  dotenv.config({ path: candidate });
}

const normalizeList = (value) =>
  (value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const parsePort = (value, fallback) => {
  const parsed = Number(value ?? fallback);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65535) {
    throw new Error(
      `Invalid port value "${value}". Expected an integer between 1 and 65535.`,
    );
  }
  return parsed;
};

// Prefer PORT (standard), then BACKEND_PORT (compose/local alias), then 5006.
const rawPort = process.env.PORT || process.env.BACKEND_PORT || 5006;

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parsePort(rawPort, 5006),
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || '',
  CORS_ORIGINS: normalizeList(process.env.CORS_ORIGINS || process.env.CLIENT_ORIGIN),
  DB_HOST: process.env.DB_HOST || '',
  DB_PORT: parsePort(process.env.DB_PORT || 3306, 3306),
  DB_NAME: process.env.DB_NAME || '',
  DB_USER: process.env.DB_USER || '',
  DB_PASSWORD: process.env.DB_PASSWORD || '',
  DB_TIMEZONE: process.env.DB_TIMEZONE || 'local',
  JWT_SECRET: process.env.JWT_SECRET || '',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1h',
  APP_NAME: process.env.APP_NAME || 'Booking Configuration',
  API_BASE_URL: process.env.API_BASE_URL || '/api',
};

const required = [
  ['DB_HOST', env.DB_HOST],
  ['DB_NAME', env.DB_NAME],
  ['DB_USER', env.DB_USER],
  ['DB_PASSWORD', env.DB_PASSWORD],
  ['JWT_SECRET', env.JWT_SECRET],
];

const missing = required.filter(([, value]) => !value).map(([key]) => key);
if (missing.length) {
  throw new Error(
    `Missing required environment variable${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}`,
  );
}

if (!env.CLIENT_ORIGIN && !env.CORS_ORIGINS.length) {
  throw new Error(
    'Missing required environment variable: CLIENT_ORIGIN (or CORS_ORIGINS)',
  );
}

export default env;
