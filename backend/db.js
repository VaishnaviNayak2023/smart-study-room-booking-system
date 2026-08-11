import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import env from './config/env.js';

const pool = mysql.createPool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  timezone: env.DB_TIMEZONE || 'local',
});

const executePrepared = async (sql, params = []) => {
  const [rows] = await pool.execute(sql, params);
  return rows;
};

const withPreparedHelpers = (sql) => ({
  async get(...params) {
    const rows = await executePrepared(sql, params.flat());
    return rows[0] ?? undefined;
  },
  async all(...params) {
    return executePrepared(sql, params.flat());
  },
  async run(...params) {
    const values = params.flat();
    const [result] = await pool.execute(sql, values);
    return {
      lastInsertRowid: result.insertId ?? 0,
      affectedRows: result.affectedRows ?? 0,
      changes: result.affectedRows ?? 0,
    };
  },
});

const db = {
  async query(sql, params = []) {
    return executePrepared(sql, params);
  },
  async exec(sql) {
    await pool.execute(sql, []);
  },
  prepare(sql) {
    return withPreparedHelpers(sql);
  },
};

async function ensureSchema() {
  const statements = [
    `CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL DEFAULT '',
      role VARCHAR(50) NOT NULL DEFAULT 'user',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS resource_types (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      icon VARCHAR(255) NOT NULL DEFAULT 'meeting_room',
      color VARCHAR(255) NOT NULL DEFAULT 'purple',
      description TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS resources (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      type VARCHAR(255) NOT NULL,
      capacity INT NOT NULL DEFAULT 1,
      location VARCHAR(255) NOT NULL DEFAULT '',
      description TEXT NOT NULL,
      available TINYINT(1) NOT NULL DEFAULT 1,
      image VARCHAR(255) NOT NULL DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS rooms (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      capacity INT NOT NULL DEFAULT 1,
      available TINYINT(1) NOT NULL DEFAULT 1,
      image VARCHAR(255) NOT NULL DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS bookings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      booking_code VARCHAR(255) NOT NULL UNIQUE,
      user_id INT NULL,
      user_name VARCHAR(255) NOT NULL DEFAULT '',
      resource_id INT NULL,
      resource VARCHAR(255) NOT NULL,
      date DATE NOT NULL,
      time VARCHAR(255) NOT NULL DEFAULT '',
      datetime_label VARCHAR(255) NOT NULL DEFAULT '',
      status VARCHAR(50) NOT NULL DEFAULT 'Confirmed',
      amount VARCHAR(50) NOT NULL DEFAULT '0.00',
      start_time VARCHAR(50) NOT NULL DEFAULT '',
      end_time VARCHAR(50) NOT NULL DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE SET NULL
    )`,
    `CREATE TABLE IF NOT EXISTS pricing_rules (
      id INT AUTO_INCREMENT PRIMARY KEY,
      context VARCHAR(255) NOT NULL DEFAULT 'study',
      data JSON NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS settings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      data JSON NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`
  ];

  for (const statement of statements) {
    await db.exec(statement);
  }
}

export async function seedDatabase({ reset = false } = {}) {
  await ensureSchema();

  const [userCount] = await pool.execute('SELECT COUNT(*) AS c FROM users');
  const [resourceTypeCount] = await pool.execute('SELECT COUNT(*) AS c FROM resource_types');

  if (!reset && (Number(userCount[0].c) > 0 || Number(resourceTypeCount[0].c) > 0)) {
    return { seeded: false, inserted: 0, message: 'Database already initialized; skipping seed.' };
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL || '';
  const userEmail = process.env.SEED_USER_EMAIL || '';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || '';
  const userPassword = process.env.SEED_USER_PASSWORD || '';

  if (!adminEmail || !userEmail || !adminPassword || !userPassword) {
    throw new Error('Seed credentials are required. Set SEED_ADMIN_EMAIL, SEED_USER_EMAIL, SEED_ADMIN_PASSWORD, and SEED_USER_PASSWORD before running the seed script.');
  }

  const seedUsers = [
    [adminEmail, adminPassword, 'System Administrator', 'admin'],
    [userEmail, userPassword, 'Default User', 'user'],
  ];

  const hashValue = (value) => bcrypt.hashSync(String(value), 10);

  if (reset) {
    await pool.execute('DELETE FROM bookings');
    await pool.execute('DELETE FROM rooms');
    await pool.execute('DELETE FROM resources');
    await pool.execute('DELETE FROM resource_types');
    await pool.execute('DELETE FROM users');
    await pool.execute('DELETE FROM pricing_rules');
    await pool.execute('DELETE FROM settings');
  }

  for (const [email, password, name, role] of seedUsers) {
    await pool.execute(
      'INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE password = VALUES(password), name = VALUES(name), role = VALUES(role)',
      [email, hashValue(password), name, role],
    );
  }

  await pool.execute(
    'INSERT INTO pricing_rules (context, data) VALUES (?, ?) ON DUPLICATE KEY UPDATE data = VALUES(data)',
    ['study', JSON.stringify({ hourlyRate: 0, freeFirstHour: false })],
  );

  await pool.execute(
    'INSERT INTO settings (id, data) VALUES (1, ?) ON DUPLICATE KEY UPDATE data = VALUES(data)',
    [JSON.stringify({ systemName: '', currency: '', maxHours: 8, advanceDays: 7 })],
  );

  return { seeded: true, inserted: seedUsers.length + 1, message: 'Database seeded successfully.' };
}

export async function ensureDatabaseReady() {
  await ensureSchema();
  const [userCount] = await pool.execute('SELECT COUNT(*) AS c FROM users');
  const [settingsCount] = await pool.execute('SELECT COUNT(*) AS c FROM settings');

  if (Number(userCount[0].c) === 0 && Number(settingsCount[0].c) === 0) {
    return seedDatabase({ reset: false });
  }

  return { seeded: false, inserted: 0, message: 'Database already has application data.' };
}

export async function checkDatabase() {
  try {
    const [rows] = await pool.query('SELECT 1 AS ok');
    const ok = Array.isArray(rows) ? rows[0]?.ok === 1 : false;
    return ok
      ? { ok: true }
      : { ok: false, message: 'Unexpected database probe response' };
  } catch (error) {
    return {
      ok: false,
      message: error?.code || error?.message || 'Database unavailable',
    };
  }
}

export async function initializeDatabase() {
  const connection = await pool.getConnection();
  try {
    await connection.ping();
  } finally {
    connection.release();
  }

  await ensureSchema();
  return db;
}

export async function connectDatabase() {
  return db;
}

export async function closeDatabase() {
  await pool.end();
}

export default db;
