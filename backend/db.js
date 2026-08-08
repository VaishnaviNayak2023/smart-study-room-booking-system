import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbFile = process.env.DB_FILE || path.join(__dirname, 'data', 'booking_configuration.sqlite');

const db = new Database(dbFile);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    name TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('admin','user')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS resource_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT 'meeting_room',
    color TEXT NOT NULL DEFAULT 'purple',
    description TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS resources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 1,
    location TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    available INTEGER NOT NULL DEFAULT 1,
    image TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 1,
    available INTEGER NOT NULL DEFAULT 1,
    image TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_code TEXT NOT NULL,
    user_id INTEGER NULL,
    user_name TEXT NOT NULL DEFAULT 'User',
    resource_id INTEGER NULL,
    resource TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL DEFAULT '',
    datetime_label TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'Confirmed',
    amount TEXT NOT NULL DEFAULT '₹0.00',
    start_time TEXT NOT NULL DEFAULT '',
    end_time TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (resource_id) REFERENCES resources(id)
  );

  CREATE TABLE IF NOT EXISTS pricing_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    context TEXT NOT NULL DEFAULT 'study',
    data TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    data TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

const seedUsers = [
  ['admin@example.com', '$2a$10$VF8fBK0EF/jf.51sbAR0dednSeVq0DQ6aY.QLQSrBzRi0.dFybYP.', 'System Admin', 'admin'],
  ['user@example.com', '$2a$10$z9E8VWy3Kc5Yy716dlsDg.ogGDCmdu0atymUVaDW4pOrRW2lIu7SS', 'Ananya', 'user'],
  ['rohan@example.com', '$2a$10$z9E8VWy3Kc5Yy716dlsDg.ogGDCmdu0atymUVaDW4pOrRW2lIu7SS', 'Rohan', 'user'],
  ['neha@example.com', '$2a$10$z9E8VWy3Kc5Yy716dlsDg.ogGDCmdu0atymUVaDW4pOrRW2lIu7SS', 'Neha', 'user'],
  ['arjun@example.com', '$2a$10$z9E8VWy3Kc5Yy716dlsDg.ogGDCmdu0atymUVaDW4pOrRW2lIu7SS', 'Arjun', 'user'],
  ['priya@example.com', '$2a$10$z9E8VWy3Kc5Yy716dlsDg.ogGDCmdu0atymUVaDW4pOrRW2lIu7SS', 'Priya', 'user'],
];

const seedResourceTypes = [
  ['Study Rooms', 'meeting_room', 'purple', 'Quiet study spaces for individual and group work.'],
  ['Conference Rooms', 'groups', 'blue', 'Meeting rooms equipped for presentations and calls.'],
  ['Labs', 'science', 'green', 'Equipped laboratories for academic and research use.'],
  ['Equipment', 'developer_board', 'orange', 'Specialized equipment available for booking.'],
  ['Auditoriums', 'theaters', 'red', 'Large venues for events, seminars, and workshops.'],
  ['Outdoor Spaces', 'park', 'teal', 'Open-air areas for gatherings and activities.'],
];

const seedResources = [
  ['Study Room A101', 'Study Room', 6, 'Building A, 1st Floor', 'Quiet study room with tables and power outlets.', 1, ''],
  ['Study Room A102', 'Study Room', 4, 'Building A, 1st Floor', 'Small study room suitable for individual study.', 1, ''],
  ['Study Room A103', 'Study Room', 8, 'Building A, 1st Floor', 'Large study room suitable for groups.', 0, ''],
  ['Study Room B201', 'Study Room', 8, 'Building B, 2nd Floor', 'Spacious study room with natural lighting.', 1, ''],
  ['Meeting Room M1', 'Meeting Room', 10, 'Main Building, 1st Floor', 'Meeting room with presentation facilities.', 1, ''],
  ['Conference Room 1', 'Conference Room', 12, 'Floor 3', 'Large conference room.', 1, ''],
  ['Lab 4C', 'Lab', 20, 'Floor 4', 'Computer laboratory.', 1, ''],
  ['Projector Kit A', 'Equipment', 1, 'Reception', 'Portable projector kit.', 0, ''],
];

const seedRooms = [
  ['Study Room A101', 4, 1, 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=800&q=80'],
  ['Study Room A102', 4, 1, 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=800&q=80'],
  ['Study Room B201', 8, 1, 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80'],
];

const seedBookings = [
  ['BK1001', 2, 'Ananya', 1, 'Study Room A101', '24 May 2024', '10:00 AM', '24 May 2024', 'Confirmed', '₹15.00', '10:00 AM', '12:00 PM'],
  ['BK1002', 3, 'Rohan', 2, 'Study Room A102', '24 May 2024', '11:00 AM', '24 May 2024', 'Confirmed', '₹15.00', '11:00 AM', '12:00 PM'],
  ['BK1003', 4, 'Neha', 4, 'Study Room B201', '25 May 2024', '02:00 PM', '25 May 2024', 'Pending', '₹20.00', '02:00 PM', '04:00 PM'],
  ['BK1004', 5, 'Arjun', 7, 'Lab 4C (Equipment)', '25 May 2024', '04:00 PM', '25 May 2024', 'Cancelled', '₹25.00', '04:00 PM', '05:00 PM'],
  ['BK1005', 6, 'Priya', 6, 'Conference Room 1', '20 May 2024', '09:00 AM', '20 May 2024', 'Completed', '₹30.00', '09:00 AM', '10:00 AM'],
];

db.exec('BEGIN');
try {
  db.prepare(
    'INSERT OR IGNORE INTO users (email, password, name, role) VALUES (?, ?, ?, ?)',
  ).run(...seedUsers[0]);
  for (const user of seedUsers.slice(1)) {
    db.prepare('INSERT OR IGNORE INTO users (email, password, name, role) VALUES (?, ?, ?, ?)').run(...user);
  }

  for (const row of seedResourceTypes) {
    db.prepare('INSERT OR IGNORE INTO resource_types (name, icon, color, description) VALUES (?, ?, ?, ?)').run(...row);
  }

  for (const row of seedResources) {
    db.prepare('INSERT OR IGNORE INTO resources (name, type, capacity, location, description, available, image) VALUES (?, ?, ?, ?, ?, ?, ?)').run(...row);
  }

  for (const row of seedRooms) {
    db.prepare('INSERT OR IGNORE INTO rooms (name, capacity, available, image) VALUES (?, ?, ?, ?)').run(...row);
  }

  for (const row of seedBookings) {
    db.prepare('INSERT OR IGNORE INTO bookings (booking_code, user_id, user_name, resource_id, resource, date, time, datetime_label, status, amount, start_time, end_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(...row);
  }

  db.prepare('INSERT OR IGNORE INTO pricing_rules (context, data) VALUES (?, ?)').run('study', '{"hourlyRate":50,"freeFirstHour":true,"peakStart":"17:00","peakEnd":"22:00"}');
  db.prepare('INSERT OR IGNORE INTO settings (id, data) VALUES (?, ?)').run(1, '{"theme":"light","currency":"INR"}');
db.exec('COMMIT');
} catch (error) {
  db.exec('ROLLBACK');
  throw error;
}

export async function connectDatabase() {
  return db;
}

function createQueryHelpers() {
  return {
    prepare(query) {
      return {
        get(...params) {
          const statement = db.prepare(query);
          return statement.get(...params);
        },
        all(...params) {
          const statement = db.prepare(query);
          return statement.all(...params);
        },
        run(...params) {
          const statement = db.prepare(query);
          const result = statement.run(...params);
          return {
            lastInsertRowid: result.lastInsertRowid,
            affectedRows: result.changes,
            changedRows: result.changes,
          };
        },
      };
    },
  };
}

const queryHelpers = createQueryHelpers();
export default queryHelpers;
