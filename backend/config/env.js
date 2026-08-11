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

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT || 5000),
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || '',
  CORS_ORIGINS: normalizeList(process.env.CORS_ORIGINS || process.env.CLIENT_ORIGIN),
  DB_HOST: process.env.DB_HOST || '',
  DB_PORT: Number(process.env.DB_PORT || 3306),
  DB_NAME: process.env.DB_NAME || '',
  DB_USER: process.env.DB_USER || '',
  DB_PASSWORD: process.env.DB_PASSWORD || '',
  DB_TIMEZONE: process.env.DB_TIMEZONE || 'local',
  JWT_SECRET: process.env.JWT_SECRET || '',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1h',
  APP_NAME: process.env.APP_NAME || 'Application',
  API_BASE_URL: process.env.API_BASE_URL || '/api',
};

const missingDb = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'].filter((key) => !env[key]);
if (missingDb.length) {
  throw new Error(`Missing required MySQL environment values: ${missingDb.join(', ')}`);
}

if (!env.JWT_SECRET) {
  throw new Error('JWT_SECRET is required. Set it in your environment before starting the backend.');
}

if (!env.CLIENT_ORIGIN && !env.CORS_ORIGINS.length) {
  throw new Error('CLIENT_ORIGIN or CORS_ORIGINS must be configured before starting the backend.');
}

export default env;
