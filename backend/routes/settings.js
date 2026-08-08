import { Router } from 'express';
import db from '../db.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

/* GET /api/settings */
router.get('/', authenticate, async (req, res) => {
  const row = await db.prepare('SELECT * FROM settings WHERE id = 1').get();
  const data = row ? JSON.parse(row.data) : {};
  res.json({ settings: data });
});

/* PUT /api/settings */
router.put('/', authenticate, authorize('admin'), async (req, res) => {
  const body = req.body || {};
  const existing = await db.prepare('SELECT * FROM settings WHERE id = 1').get();
  if (existing) {
    await db.prepare('UPDATE settings SET data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1').run(JSON.stringify(body));
  } else {
    await db.prepare('INSERT INTO settings (id, data) VALUES (1, ?)').run(JSON.stringify(body));
  }
  const row = await db.prepare('SELECT * FROM settings WHERE id = 1').get();
  res.json({ settings: JSON.parse(row.data) });
});

export default router;

