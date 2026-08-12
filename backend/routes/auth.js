import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db.js';
import env from '../config/env.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
const JWT_SECRET = env.JWT_SECRET;
const JWT_EXPIRES_IN = env.JWT_EXPIRES_IN;

const signToken = (user) =>
  jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

const publicUser = (user) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
  phone: user.phone || '',
  phoneCountryCode: user.phone_country_code || user.phoneCountryCode || '',
});

/* POST /api/auth/register */
router.post('/register', async (req, res) => {
  const {
    email,
    password,
    name = '',
    role = 'user',
    phone = '',
    phoneCountryCode = '',
  } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const exists = await db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
  if (exists) {
    return res.status(409).json({ message: 'An account with this email already exists.' });
  }

  const hashed = bcrypt.hashSync(String(password), 10);
  const info = await db
    .prepare(
      'INSERT INTO users (email, password, name, role, phone, phone_country_code) VALUES (?, ?, ?, ?, ?, ?)',
    )
    .run(
      normalizedEmail,
      hashed,
      String(name).trim(),
      role === 'admin' ? 'admin' : 'user',
      String(phone).trim(),
      String(phoneCountryCode).trim(),
    );

  const user = await db
    .prepare('SELECT id, email, name, role, phone, phone_country_code FROM users WHERE id = ?')
    .get(info.lastInsertRowid);

  return res.status(201).json({ user: publicUser(user), token: signToken(user) });
});

/* POST /api/auth/login */
router.post('/login', async (req, res) => {
  const { email, password, role } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail);

  if (!user || !bcrypt.compareSync(String(password), user.password)) {
    return res.status(401).json({ message: 'Incorrect email or password.' });
  }

  if (role && role !== user.role) {
    return res.status(401).json({
      message: `This account is registered as a ${user.role}. Switch to ${user.role} and try again.`,
      actualRole: user.role,
    });
  }

  return res.json({ user: publicUser(user), token: signToken(user) });
});

/* GET /api/auth/me — current user from token */
router.get('/me', authenticate, async (req, res) => {
  const user = await db
    .prepare('SELECT id, email, name, role, phone, phone_country_code FROM users WHERE id = ?')
    .get(req.user.id);
  if (!user) return res.status(401).json({ message: 'User not found.' });
  return res.json({ user: publicUser(user) });
});

/* PUT /api/auth/profile — update current user's profile (authenticated) */
router.put('/profile', authenticate, async (req, res) => {
  const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(401).json({ message: 'User not found.' });

  const { name, currentPassword, newPassword, phone, phoneCountryCode } = req.body || {};

  if (newPassword) {
    if (!currentPassword || !bcrypt.compareSync(String(currentPassword), user.password)) {
      return res.status(400).json({ message: 'Current password is incorrect.' });
    }
    if (String(newPassword).length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters long.' });
    }
  }

  const hashed = newPassword ? bcrypt.hashSync(String(newPassword), 10) : user.password;
  const nextName = name !== undefined ? String(name).trim() : user.name;
  const nextPhone = phone !== undefined ? String(phone).trim() : user.phone || '';
  const nextCountryCode =
    phoneCountryCode !== undefined
      ? String(phoneCountryCode).trim()
      : user.phone_country_code || '';

  if (!nextName) {
    return res.status(400).json({ message: 'Name is required.' });
  }

  await db
    .prepare('UPDATE users SET name = ?, password = ?, phone = ?, phone_country_code = ? WHERE id = ?')
    .run(nextName, hashed, nextPhone, nextCountryCode, user.id);

  const updated = await db
    .prepare('SELECT id, email, name, role, phone, phone_country_code FROM users WHERE id = ?')
    .get(user.id);
  return res.json({ user: publicUser(updated) });
});

export default router;
