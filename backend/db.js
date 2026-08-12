import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import env from './config/env.js';
import { pricingContextKey } from './utils/pricingCalculator.js';

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
      purpose VARCHAR(255) NOT NULL DEFAULT '',
      notes TEXT,
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
    )`,
    `CREATE TABLE IF NOT EXISTS notifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      type VARCHAR(50) NOT NULL DEFAULT 'system',
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      \`read\` TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS user_preferences (
      user_id INT PRIMARY KEY,
      theme VARCHAR(20) NOT NULL DEFAULT 'light',
      language VARCHAR(50) NOT NULL DEFAULT 'en-US',
      profile_visibility TINYINT(1) NOT NULL DEFAULT 1,
      activity_status TINYINT(1) NOT NULL DEFAULT 0,
      notification_prefs JSON NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
  ];

  for (const statement of statements) {
    await db.exec(statement);
  }

  await ensureColumn('bookings', 'purpose', "VARCHAR(255) NOT NULL DEFAULT ''");
  await ensureColumn('bookings', 'notes', 'TEXT NULL');
  await ensureColumn('bookings', 'pricing_snapshot', 'JSON NULL');
  await ensureColumn('bookings', 'add_on_ids', 'JSON NULL');
  // Tracks last status change for Confirmed Today / avg response metrics.
  await ensureColumn('bookings', 'status_updated_at', 'TIMESTAMP NULL');
  await ensureColumn('users', 'phone_country_code', "VARCHAR(10) NOT NULL DEFAULT ''");
  await ensureColumn('users', 'phone', "VARCHAR(32) NOT NULL DEFAULT ''");
  await ensurePricingContextUniqueness();
  await db.exec(
    `UPDATE bookings
     SET status_updated_at = COALESCE(status_updated_at, created_at, CURRENT_TIMESTAMP)
     WHERE status_updated_at IS NULL`,
  );
  await db.exec(
    `UPDATE bookings b
     INNER JOIN users u ON u.id = b.user_id
     SET b.user_name = u.name
     WHERE (b.user_name IS NULL OR b.user_name = '') AND u.name <> ''`,
  );
}

async function ensureColumn(table, column, definition) {
  const rows = await db.query(
    `SELECT COUNT(*) AS c FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column],
  );
  if (Number(rows[0]?.c || 0) === 0) {
    await db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

async function ensurePricingContextUniqueness() {
  const duplicates = await db.query(
    `SELECT context
     FROM pricing_rules
     GROUP BY context
     HAVING COUNT(*) > 1`,
  );

  for (const row of duplicates) {
    const context = row.context;
    const keep = await db
      .prepare('SELECT id FROM pricing_rules WHERE context = ? ORDER BY updated_at DESC, id DESC LIMIT 1')
      .get(context);

    if (!keep?.id) continue;

    await db
      .prepare('DELETE FROM pricing_rules WHERE context = ? AND id <> ?')
      .run(context, keep.id);
  }

  const indexes = await db.query(
    `SHOW INDEX FROM pricing_rules
     WHERE Key_name = 'uniq_pricing_rules_context'`,
  );

  if (!indexes.length) {
    await db.exec('ALTER TABLE pricing_rules ADD UNIQUE KEY uniq_pricing_rules_context (context)');
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
    await pool.execute('DELETE FROM notifications');
    await pool.execute('DELETE FROM user_preferences');
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
    [JSON.stringify({ systemName: process.env.SEED_SYSTEM_NAME || '', currency: 'INR (Rs.)', maxHours: 8, advanceDays: 7 })],
  );

  const seedDemo =
    process.env.SEED_DEMO_DATA === 'true' ||
    (process.env.NODE_ENV !== 'production' && process.env.SEED_DEMO_DATA !== 'false');
  if (seedDemo) {
    await seedDemoResourcesAndPricing();
  }

  return { seeded: true, inserted: seedUsers.length + 1, message: 'Database seeded successfully.' };
}

async function seedDemoResourcesAndPricing() {
  const baseRate = Number(process.env.SEED_DEMO_BASE_RATE || 99);
  const typeNames = String(process.env.SEED_DEMO_RESOURCE_TYPES || 'Meeting Rooms,Study Room')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  for (const name of typeNames) {
    await pool.execute(
      'INSERT INTO resource_types (name, icon, description) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE icon = VALUES(icon), description = VALUES(description)',
      [name, 'meeting_room', `${name} bookings`],
    );
  }

  const demoResources = [
    {
      name: 'Meeting Room A101',
      type: typeNames[0] || 'Meeting Rooms',
      capacity: 8,
      location: '102, London Heights, Margao, Goa, India',
      description: 'Conference room with projector.',
    },
    {
      name: 'Study Pod S1',
      type: typeNames[1] || typeNames[0] || 'Study Room',
      capacity: 2,
      location: 'Floor 2, Quiet Zone',
      description: 'Individual study space.',
    },
  ];

  for (const resource of demoResources) {
    await pool.execute(
      `INSERT INTO resources (name, type, capacity, location, description, available)
       SELECT ?, ?, ?, ?, ?, 1 FROM DUAL
       WHERE NOT EXISTS (SELECT 1 FROM resources WHERE name = ?)`,
      [resource.name, resource.type, resource.capacity, resource.location, resource.description, resource.name],
    );
  }

  await pool.execute(
    'INSERT INTO pricing_rules (context, data) VALUES (?, ?) ON DUPLICATE KEY UPDATE data = VALUES(data)',
    [
      'general',
      JSON.stringify({
        baseRate,
        minimumDuration: '1 Hour',
        currency: 'INR',
        applyTax: true,
        taxRate: 8.5,
        taxLabel: 'Tax',
        rules: [],
      }),
    ],
  );

  for (const name of typeNames) {
    const slug = pricingContextKey(name);
    if (slug === 'general') continue;
    await pool.execute(
      'INSERT INTO pricing_rules (context, data) VALUES (?, ?) ON DUPLICATE KEY UPDATE data = VALUES(data)',
      [slug, JSON.stringify({ hourlyRate: baseRate, freeFirstHour: false, rules: [], roleDiscounts: [] })],
    );
  }

  const [legacyRows] = await pool.execute("SELECT id, data FROM pricing_rules WHERE context = 'study' LIMIT 1");
  const studyRoomSlug = pricingContextKey('Study Room');
  if (legacyRows.length && studyRoomSlug !== 'study') {
    const legacy = legacyRows[0];
    const data = typeof legacy.data === 'string' ? legacy.data : JSON.stringify(legacy.data);
    await pool.execute(
      'INSERT INTO pricing_rules (context, data) VALUES (?, ?) ON DUPLICATE KEY UPDATE data = VALUES(data)',
      [studyRoomSlug, data],
    );
  }
}

export async function ensureDatabaseReady() {
  await ensureSchema();
  const [userCount] = await pool.execute('SELECT COUNT(*) AS c FROM users');
  const [settingsCount] = await pool.execute('SELECT COUNT(*) AS c FROM settings');

  if (Number(userCount[0].c) === 0 && Number(settingsCount[0].c) === 0) {
    return seedDatabase({ reset: false });
  }

  const [generalPricing] = await pool.execute(
    "SELECT COUNT(*) AS c FROM pricing_rules WHERE context = 'general'",
  );
  if (Number(generalPricing[0].c) === 0) {
    await pool.execute('INSERT INTO pricing_rules (context, data) VALUES (?, ?)', [
      'general',
      JSON.stringify({
        baseRate: 0,
        currency: 'INR',
        applyTax: false,
        taxRate: 0,
        taxLabel: 'Tax',
        rules: [],
      }),
    ]);
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
