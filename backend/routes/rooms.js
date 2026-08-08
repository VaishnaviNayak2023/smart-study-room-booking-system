import { Router } from 'express';
import db from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

const rowToRoom = (r) => ({
  id: r.id,
  name: r.name,
  capacity: r.capacity,
  available: !!r.available,
  image: r.image,
});

/* GET /api/rooms */
router.get('/', authenticate, async (req, res) => {
  const rows = await db.prepare('SELECT * FROM resources ORDER BY id').all();
  res.json({ rooms: rows.map(rowToRoom) });
});

export default router;

