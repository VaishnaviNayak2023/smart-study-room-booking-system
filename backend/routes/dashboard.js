import { Router } from 'express';
import db from '../db.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

/* GET /api/dashboard — admin stats + recent bookings */
router.get('/', authenticate, authorize('admin'), async (req, res) => {
  const totalResourcesRow = await db.prepare('SELECT COUNT(*) AS c FROM resources').get();
  const totalBookingsRow = await db.prepare('SELECT COUNT(*) AS c FROM bookings').get();
  const totalUsersRow = await db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'user'").get();

  const today = new Date().toISOString().slice(0, 10);
  const todaysBookingsRow = await db.prepare('SELECT COUNT(*) AS c FROM bookings WHERE date(created_at) = date(?)').get(today);

  const recent = (await db.prepare('SELECT * FROM bookings ORDER BY id DESC LIMIT 6').all()).map((r) => ({
    id: r.booking_code,
    user: r.user_name,
    resource: r.resource,
    date: r.date,
    time: r.time,
    status: r.status,
  }));

  res.json({
    stats: {
      totalResources: totalResourcesRow.c,
      totalBookings: totalBookingsRow.c,
      todaysBookings: todaysBookingsRow.c,
      totalUsers: totalUsersRow.c,
    },
    bookings: recent,
  });
});

export default router;

