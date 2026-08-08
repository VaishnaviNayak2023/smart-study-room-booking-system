import { Router } from 'express';
import db from '../db.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

/* GET /api/reports */
router.get('/', authenticate, authorize('admin'), (req, res) => {
  const allBookings = db.prepare('SELECT * FROM bookings').all();
  const totalBookings = allBookings.length;

  const byStatus = (status) => allBookings.filter((b) => b.status === status).length;

  const statusBreakdown = ['Confirmed', 'Pending', 'Completed', 'Cancelled'].map((s) => {
    const count = byStatus(s);
    const percent = totalBookings ? Math.round((count / totalBookings) * 100) : 0;
    const color = { Confirmed: '#4caf50', Pending: '#ff9800', Completed: '#9e9e9e', Cancelled: '#f44336' }[s];
    return { label: s, count, percent, color };
  });

  // Aggregate bookings per resource name
  const byResource = {};
  for (const b of allBookings) {
    byResource[b.resource] = byResource[b.resource] || { bookings: 0, resourceId: b.resource_id };
    byResource[b.resource].bookings += 1;
  }
  const topResources = Object.entries(byResource)
    .sort((a, b) => b[1].bookings - a[1].bookings)
    .slice(0, 4)
    .map(([name, info]) => ({
      name,
      bookings: info.bookings,
      utilization: totalBookings ? Math.round((info.bookings / totalBookings) * 100) : 0,
    }));

  const totalUsers = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'user'").get().c;
  // Total revenue ~ sum of numeric parts of amount strings
  const revenue = allBookings.reduce((acc, b) => {
    const m = String(b.amount || '').replace(/[^\d.]/g, '');
    return acc + (parseFloat(m) || 0);
  }, 0);

  const stats = [
    { label: 'TOTAL REVENUE', value: `$${revenue.toLocaleString()}`, icon: 'payments', color: 'green', trend: 12 },
    { label: 'BOOKINGS', value: String(totalBookings), icon: 'event', color: 'blue', trend: 8 },
    { label: 'AVG OCCUPANCY', value: `${totalBookings ? Math.min(100, Math.round((totalBookings / 100) * 100)) : 0}%`, icon: 'insights', color: 'purple', trend: -3 },
    { label: 'NEW USERS', value: String(totalUsers), icon: 'person_add', color: 'orange', trend: 18 },
  ];

  res.json({ stats, statusBreakdown, topResources });
});

export default router;

