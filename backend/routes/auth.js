import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db.js';
import env from '../config/env.js';

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
});

/* POST /api/auth/register */
router.post('/register', async (req, res) => {
  const { email, password, name = '', role = 'user' } = req.body || {};

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
    .prepare('INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)')
    .run(normalizedEmail, hashed, String(name).trim(), role === 'admin' ? 'admin' : 'user');

  const user = await db.prepare('SELECT id, email, name, role FROM users WHERE id = ?').get(info.lastInsertRowid);

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
    return res.status(401).json({ message: `This account is not a ${role} account.` });
  }

  return res.json({ user: publicUser(user), token: signToken(user) });
});

/* GET /api/auth/me — current user from token */
router.get('/me', async (req, res) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Authentication token missing.' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await db.prepare('SELECT id, email, name, role FROM users WHERE id = ?').get(payload.id);
    if (!user) return res.status(401).json({ message: 'User not found.' });
    return res.json({ user: publicUser(user) });
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
});

/* PUT /api/auth/profile — update current user's name / password (authenticated) */
router.put('/profile', async (req, res) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Authentication token missing.' });
  }

  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }

  const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(payload.id);
  if (!user) return res.status(401).json({ message: 'User not found.' });

  const { name, currentPassword, newPassword } = req.body || {};

  if (newPassword) {
    if (!currentPassword || !bcrypt.compareSync(String(currentPassword), user.password)) {
      return res.status(400).json({ message: 'Current password is incorrect.' });
    }
  }

  const hashed = newPassword ? bcrypt.hashSync(String(newPassword), 10) : user.password;
  await db.prepare('UPDATE users SET name = ?, password = ? WHERE id = ?').run(
    name !== undefined ? String(name) : user.name,
    hashed,
    user.id,
  );

  const updated = await db.prepare('SELECT id, email, name, role FROM users WHERE id = ?').get(user.id);
  return res.json({ user: publicUser(updated) });
});

export default router;

