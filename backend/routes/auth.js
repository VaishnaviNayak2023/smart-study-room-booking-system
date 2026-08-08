import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '2d';

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
router.post('/register', (req, res) => {
  const { email, password, name = '', role = 'user' } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
  if (exists) {
    return res.status(409).json({ message: 'An account with this email already exists.' });
  }

  const hashed = bcrypt.hashSync(String(password), 10);
  const info = db
    .prepare('INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)')
    .run(normalizedEmail, hashed, name.trim(), role === 'admin' ? 'admin' : 'user');

  const user = db.prepare('SELECT id, email, name, role FROM users WHERE id = ?').get(info.lastInsertRowid);

  return res.status(201).json({ user: publicUser(user), token: signToken(user) });
});

/* POST /api/auth/login */
router.post('/login', (req, res) => {
  const { email, password, role } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail);

  if (!user || !bcrypt.compareSync(String(password), user.password)) {
    return res.status(401).json({ message: 'Incorrect email or password.' });
  }

  if (role && role !== user.role) {
    return res.status(401).json({ message: `This account is not a ${role} account.` });
  }

  return res.json({ user: publicUser(user), token: signToken(user) });
});

/* GET /api/auth/me — current user from token */
router.get('/me', (req, res) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Authentication token missing.' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = db
      .prepare('SELECT id, email, name, role FROM users WHERE id = ?')
      .get(payload.id);
    if (!user) return res.status(401).json({ message: 'User not found.' });
    return res.json({ user: publicUser(user) });
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
});

export default router;

