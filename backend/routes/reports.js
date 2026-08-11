import { Router } from 'express';
import db from '../db.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

function monthKey(dateValue) {
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function trendPercent(current, previous) {
  if (!previous) return current ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

/* GET /api/reports */
router.get('/', authenticate, authorize('admin'), async (req, res) => {
  const allBookings = await db.prepare('SELECT * FROM bookings').all();
  const totalBookings = allBookings.length;
  const totalResourcesRow = await db.prepare('SELECT COUNT(*) AS c FROM resources').get();
  const availableResourcesRow = await db.prepare('SELECT COUNT(*) AS c FROM resources WHERE available = 1').get();
  const totalUsersRow = await db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'user'").get();

  const now = new Date();
  const thisMonth = monthKey(now);
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonth = monthKey(lastMonthDate);

  const bookingsThisMonth = allBookings.filter((b) => monthKey(b.created_at) === thisMonth).length;
  const bookingsLastMonth = allBookings.filter((b) => monthKey(b.created_at) === lastMonth).length;

  const revenue = allBookings.reduce((acc, b) => {
    const m = String(b.amount || '').replace(/[^\d.]/g, '');
    return acc + (parseFloat(m) || 0);
  }, 0);

  const revenueThisMonth = allBookings
    .filter((b) => monthKey(b.created_at) === thisMonth)
    .reduce((acc, b) => acc + (parseFloat(String(b.amount || '').replace(/[^\d.]/g, '')) || 0), 0);
  const revenueLastMonth = allBookings
    .filter((b) => monthKey(b.created_at) === lastMonth)
    .reduce((acc, b) => acc + (parseFloat(String(b.amount || '').replace(/[^\d.]/g, '')) || 0), 0);

  const usersThisMonthRow = await db
    .prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'user' AND DATE_FORMAT(created_at, '%Y-%m') = ?")
    .get(thisMonth);
  const usersLastMonthRow = await db
    .prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'user' AND DATE_FORMAT(created_at, '%Y-%m') = ?")
    .get(lastMonth);

  const byStatus = (status) => allBookings.filter((b) => b.status === status).length;

  const statusBreakdown = ['Confirmed', 'Pending', 'Completed', 'Cancelled'].map((s) => {
    const count = byStatus(s);
    const percent = totalBookings ? Math.round((count / totalBookings) * 100) : 0;
    const color = { Confirmed: '#16a34a', Pending: '#2563eb', Completed: '#64748b', Cancelled: '#dc2626' }[s];
    return { label: s, count, percent, color };
  });

  const byResource = {};
  for (const b of allBookings) {
    byResource[b.resource] = byResource[b.resource] || { bookings: 0, resourceId: b.resource_id };
    byResource[b.resource].bookings += 1;
  }
  const topResources = Object.entries(byResource)
    .sort((a, b) => b[1].bookings - a[1].bookings)
    .slice(0, 6)
    .map(([name, info]) => ({
      name,
      bookings: info.bookings,
      utilization: totalBookings ? Math.round((info.bookings / totalBookings) * 100) : 0,
    }));

  const resourceCount = Number(totalResourcesRow.c) || 0;
  const occupiedEstimate = byStatus('Confirmed') + byStatus('Pending');
  const occupancy = resourceCount ? Math.min(100, Math.round((occupiedEstimate / resourceCount) * 100)) : 0;

  const stats = [
    {
      label: 'TOTAL REVENUE',
      value: `$${revenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      icon: 'payments',
      color: 'green',
      trend: trendPercent(revenueThisMonth, revenueLastMonth),
    },
    {
      label: 'TOTAL BOOKINGS',
      value: String(totalBookings),
      icon: 'event',
      color: 'blue',
      trend: trendPercent(bookingsThisMonth, bookingsLastMonth),
    },
    {
      label: 'AVG OCCUPANCY',
      value: `${occupancy}%`,
      icon: 'insights',
      color: 'purple',
      trend: 0,
    },
    {
      label: 'NEW USERS',
      value: String(totalUsersRow.c),
      icon: 'person_add',
      color: 'orange',
      trend: trendPercent(Number(usersThisMonthRow.c), Number(usersLastMonthRow.c)),
    },
  ];

  res.json({
    stats,
    statusBreakdown,
    topResources,
    meta: {
      totalResources: resourceCount,
      availableResources: Number(availableResourcesRow.c || 0),
    },
  });
});

export default router;
