import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_DIR = path.join(__dirname, 'data');
const DB_FILE = process.env.DB_FILE
  ? path.join(__dirname, process.env.DB_FILE)
  : path.join(DB_DIR, 'booking.db');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new Database(DB_FILE);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/* ==========================================================
   SCHEMA
   ========================================================== */
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    name TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL DEFAULT 'user',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS resource_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT 'meeting_room',
    color TEXT NOT NULL DEFAULT 'purple',
    description TEXT NOT NULL DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
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
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 1,
    available INTEGER NOT NULL DEFAULT 1,
    image TEXT NOT NULL DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_code TEXT NOT NULL,
    user_id INTEGER,
    user_name TEXT NOT NULL DEFAULT 'User',
    resource_id INTEGER,
    resource TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL DEFAULT '',
    datetime_label TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'Confirmed',
    amount TEXT NOT NULL DEFAULT '₹0.00',
    start_time TEXT NOT NULL DEFAULT '',
    end_time TEXT NOT NULL DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (resource_id) REFERENCES resources(id)
  );

  CREATE TABLE IF NOT EXISTS pricing_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    context TEXT NOT NULL DEFAULT 'study',
    data TEXT NOT NULL DEFAULT '{}',
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    data TEXT NOT NULL DEFAULT '{}',
    updated_at TEXT DEFAULT (datetime('now'))
  );
`);

/* ==========================================================
   SEED DATA
   ========================================================== */

function seed() {
  const userCount = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  if (userCount === 0) {
    const insertUser = db.prepare(
      'INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)',
    );
    const seedUsers = [
      { email: 'admin@example.com', password: 'Admin@123', name: 'System Admin', role: 'admin' },
      { email: 'user@example.com', password: 'User@123', name: 'Ananya', role: 'user' },
      { email: 'rohan@example.com', password: 'User@123', name: 'Rohan', role: 'user' },
      { email: 'neha@example.com', password: 'User@123', name: 'Neha', role: 'user' },
      { email: 'arjun@example.com', password: 'User@123', name: 'Arjun', role: 'user' },
      { email: 'priya@example.com', password: 'User@123', name: 'Priya', role: 'user' },
    ];
    const insert = db.transaction(() => {
      for (const u of seedUsers) {
        insertUser.run(u.email, bcrypt.hashSync(u.password, 10), u.name, u.role);
      }
    });
    insert();
    console.log('  -> Seeded users');
  }

  const typeCount = db.prepare('SELECT COUNT(*) AS c FROM resource_types').get().c;
  if (typeCount === 0) {
    const insertType = db.prepare(
      'INSERT INTO resource_types (name, icon, color, description) VALUES (?, ?, ?, ?)',
    );
    const types = [
      { name: 'Study Rooms', icon: 'meeting_room', color: 'purple', description: 'Quiet study spaces for individual and group work.' },
      { name: 'Conference Rooms', icon: 'groups', color: 'blue', description: 'Meeting rooms equipped for presentations and calls.' },
      { name: 'Labs', icon: 'science', color: 'green', description: 'Equipped laboratories for academic and research use.' },
      { name: 'Equipment', icon: 'developer_board', color: 'orange', description: 'Specialized equipment available for booking.' },
      { name: 'Auditoriums', icon: 'theaters', color: 'red', description: 'Large venues for events, seminars, and workshops.' },
      { name: 'Outdoor Spaces', icon: 'park', color: 'teal', description: 'Open-air areas for gatherings and activities.' },
    ];
    const insert = db.transaction(() => {
      for (const t of types) insertType.run(t.name, t.icon, t.color, t.description);
    });
    insert();
    console.log('  -> Seeded resource_types');
  }

  const resourceCount = db.prepare('SELECT COUNT(*) AS c FROM resources').get().c;
  if (resourceCount === 0) {
    const insertResource = db.prepare(
      'INSERT INTO resources (name, type, capacity, location, description, available, image) VALUES (?, ?, ?, ?, ?, ?, ?)',
    );
    const resources = [
      { name: 'Study Room A101', type: 'Study Room', capacity: 6, location: 'Building A, 1st Floor', description: 'Quiet study room with tables and power outlets.', available: 1, image: '' },
      { name: 'Study Room A102', type: 'Study Room', capacity: 4, location: 'Building A, 1st Floor', description: 'Small study room suitable for individual study.', available: 1, image: '' },
      { name: 'Study Room A103', type: 'Study Room', capacity: 8, location: 'Building A, 1st Floor', description: 'Large study room suitable for groups.', available: 0, image: '' },
      { name: 'Study Room B201', type: 'Study Room', capacity: 8, location: 'Building B, 2nd Floor', description: 'Spacious study room with natural lighting.', available: 1, image: '' },
      { name: 'Meeting Room M1', type: 'Meeting Room', capacity: 10, location: 'Main Building, 1st Floor', description: 'Meeting room with presentation facilities.', available: 1, image: '' },
      { name: 'Conference Room 1', type: 'Conference Room', capacity: 12, location: 'Floor 3', description: 'Large conference room.', available: 1, image: '' },
      { name: 'Lab 4C', type: 'Lab', capacity: 20, location: 'Floor 4', description: 'Computer laboratory.', available: 1, image: '' },
      { name: 'Projector Kit A', type: 'Equipment', capacity: 1, location: 'Reception', description: 'Portable projector kit.', available: 0, image: '' },
    ];
    const insert = db.transaction(() => {
      for (const r of resources) insertResource.run(r.name, r.type, r.capacity, r.location, r.description, r.available, r.image);
    });
    insert();
    console.log('  -> Seeded resources');
  }

  const roomCount = db.prepare('SELECT COUNT(*) AS c FROM rooms').get().c;
  if (roomCount === 0) {
    const insertRoom = db.prepare('INSERT INTO rooms (name, capacity, available, image) VALUES (?, ?, ?, ?)');
    const rooms = [
      { name: 'Study Room A101', capacity: 4, available: 1, image: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=800&q=80' },
      { name: 'Study Room A102', capacity: 4, available: 1, image: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=800&q=80' },
      { name: 'Study Room B201', capacity: 8, available: 1, image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80' },
    ];
    const insert = db.transaction(() => {
      for (const r of rooms) insertRoom.run(r.name, r.capacity, r.available, r.image);
    });
    insert();
    console.log('  -> Seeded rooms');
  }

  const bookingCount = db.prepare('SELECT COUNT(*) AS c FROM bookings').get().c;
  if (bookingCount === 0) {
    const insertBooking = db.prepare(
      'INSERT INTO bookings (booking_code, user_id, user_name, resource_id, resource, date, time, datetime_label, status, amount, start_time, end_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    );
    const bookings = [
      { code: 'BK1001', userId: 2, user: 'Ananya', resourceId: 1, resource: 'Study Room A101', date: '24 May 2024', time: '10:00 AM', dlabel: '24 May 2024', status: 'Confirmed', amount: '₹15.00', start: '10:00 AM', end: '12:00 PM' },
      { code: 'BK1002', userId: 3, user: 'Rohan', resourceId: 2, resource: 'Study Room A102', date: '24 May 2024', time: '11:00 AM', dlabel: '24 May 2024', status: 'Confirmed', amount: '₹15.00', start: '11:00 AM', end: '12:00 PM' },
      { code: 'BK1003', userId: 4, user: 'Neha', resourceId: 4, resource: 'Study Room B201', date: '25 May 2024', time: '02:00 PM', dlabel: '25 May 2024', status: 'Pending', amount: '₹20.00', start: '02:00 PM', end: '04:00 PM' },
      { code: 'BK1004', userId: 5, user: 'Arjun', resourceId: 7, resource: 'Lab 4C (Equipment)', date: '25 May 2024', time: '04:00 PM', dlabel: '25 May 2024', status: 'Cancelled', amount: '₹25.00', start: '04:00 PM', end: '05:00 PM' },
      { code: 'BK1005', userId: 6, user: 'Priya', resourceId: 6, resource: 'Conference Room 1', date: '20 May 2024', time: '09:00 AM', dlabel: '20 May 2024', status: 'Completed', amount: '₹30.00', start: '09:00 AM', end: '10:00 AM' },
      { code: 'BK1006', userId: 2, user: 'Ananya', resourceId: 3, resource: 'Study Room A103', date: '26 May 2024', time: '01:00 PM', dlabel: '26 May 2024', status: 'Confirmed', amount: '₹15.00', start: '01:00 PM', end: '02:00 PM' },
      { code: 'BK1007', userId: 2, user: 'Ananya', resourceId: 6, resource: 'Conference Room 1', date: '28 May 2024', time: '02:00 PM', dlabel: '28 May 2024 — 02:00 PM - 04:00 PM', status: 'Confirmed', amount: '₹20.00', start: '02:00 PM', end: '04:00 PM' },
      { code: 'BK1008', userId: 2, user: 'Ananya', resourceId: 7, resource: 'Lab 4C (Equipment)', date: '02 Jun 2024', time: '09:00 AM', dlabel: '02 Jun 2024 — 09:00 AM - 12:00 PM', status: 'Pending', amount: '₹0.00', start: '09:00 AM', end: '12:00 PM' },
      { code: 'BK1009', userId: 2, user: 'Ananya', resourceId: 1, resource: 'Study Room A101', date: '15 May 2024', time: '10:00 AM', dlabel: '15 May 2024 — 10:00 AM - 12:00 PM', status: 'Completed', amount: '₹15.00', start: '10:00 AM', end: '12:00 PM' },
      { code: 'BK1010', userId: 2, user: 'Ananya', resourceId: 6, resource: 'Conference Room 1', date: '10 May 2024', time: '01:00 PM', dlabel: '10 May 2024 — 01:00 PM - 02:00 PM', status: 'Cancelled', amount: '₹25.00', start: '01:00 PM', end: '02:00 PM' },
    ];
    const insert = db.transaction(() => {
      for (const b of bookings) {
        insertBooking.run(b.code, b.userId, b.user, b.resourceId, b.resource, b.date, b.time, b.dlabel, b.status, b.amount, b.start, b.end);
      }
    });
    insert();
    console.log('  -> Seeded bookings');
  }

  const pricingCount = db.prepare('SELECT COUNT(*) AS c FROM pricing_rules').get().c;
  if (pricingCount === 0) {
    db.prepare('INSERT INTO pricing_rules (context, data) VALUES (?, ?)').run(
      'study',
      JSON.stringify({
        hourlyRate: 50,
        freeFirstHour: true,
        peakStart: '17:00',
        peakEnd: '22:00',
        peakDays: 'Mon - Fri',
        peakMultiplier: 1.5,
        gstRate: 0.18,
        studentDiscount: 0.1,
      }),
    );
    console.log('  -> Seeded pricing_rules');
  }

  const settingsCount = db.prepare('SELECT COUNT(*) AS c FROM settings').get().c;
  if (settingsCount === 0) {
    db.prepare('INSERT INTO settings (id, data) VALUES (1, ?)').run(
      JSON.stringify({
        systemName: 'ResourceHub',
        currency: 'INR (₹)',
        maxHours: 8,
        advanceDays: 7,
        sameDay: true,
        autoConfirm: false,
        emailNotifications: true,
      }),
    );
    console.log('  -> Seeded settings');
  }
}

seed();

export default db;
