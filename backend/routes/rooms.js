import { Router } from 'express';
import db from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

/*
 * The user-facing "Browse Rooms" list is served from the SAME `resources`
 * table that admins manage (via /api/resources). This keeps the admin and
 * user dashboards in sync: any resource added/edited/deleted/toggled by an
 * admin is immediately reflected in what users see, and user bookings
 * reference the same resource id.
 */
const rowToRoom = (r) => ({
  id: r.id,
  name: r.name,
  capacity: r.capacity,
  available: !!r.available,
  image: r.image,
});

/* GET /api/rooms */
router.get('/', authenticate, (req, res) => {
  const rows = db.prepare('SELECT * FROM resources ORDER BY id').all();
  res.json({ rooms: rows.map(rowToRoom) });
});

export default router;

