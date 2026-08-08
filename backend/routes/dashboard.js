import { Router } from 'express';
import db from '../db.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

/* GET /api/dashboard — admin stats + recent bookings */
router.get('/', authenticate, authorize('admin'), (req, res) => {
  const totalResources = db.prepare('SELECT COUNT(*) AS c FROM resources').get().c;
  const totalBookings = db.prepare('SELECT COUNT(*) AS c FROM bookings').get().c;
  const totalUsers = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'user'").get().c;

  const today = new Date().toISOString().slice(0, 10);
  const todaysBookings = db
    .prepare('SELECT COUNT(*) AS c FROM bookings WHERE date(created_at) = date(?)')
    .get(today).c;

  const recent = db.prepare('SELECT * FROM bookings ORDER BY id DESC LIMIT 6').all().map((r) => ({
    id: r.booking_code,
    user: r.user_name,
    resource: r.resource,
    date: r.date,
    time: r.time,
    status: r.status,
  }));

  res.json({
    stats: { totalResources, totalBookings, todaysBookings, totalUsers },
    bookings: recent,
  });
});

export default router;

