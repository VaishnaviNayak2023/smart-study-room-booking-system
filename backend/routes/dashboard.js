import { Router } from 'express';
import db from '../db.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { hoursBetween } from '../utils/bookingMath.js';
import { computeResourceAvailability } from '../utils/resourceAvailability.js';

const router = Router();

const bookingSelect = `
  SELECT b.*, r.location AS location, r.capacity AS capacity, r.image AS image
  FROM bookings b
  LEFT JOIN resources r ON r.id = b.resource_id
`;

const rowToBooking = (r) => ({
  id: r.booking_code || `BK${r.id}`,
  userId: r.user_id,
  user: r.user_name,
  resourceId: r.resource_id,
  resource: r.resource,
  date: r.date instanceof Date ? r.date.toISOString().slice(0, 10) : String(r.date || '').slice(0, 10),
  time: r.time,
  datetime: r.datetime_label || `${r.date} — ${r.start_time} - ${r.end_time}`,
  status: r.status,
  amount: r.amount,
  startTime: r.start_time,
  endTime: r.end_time,
  purpose: r.purpose || '',
  notes: r.notes || '',
  location: r.location || '',
  capacity: r.capacity ?? null,
  image: r.image || '',
});

function parseAmount(amount) {
  const n = parseFloat(String(amount || '').replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function isUpcoming(booking) {
  if (booking.status === 'Cancelled' || booking.status === 'Completed') return false;
  if (booking.status === 'Confirmed' || booking.status === 'Pending') {
    const today = new Date().toISOString().slice(0, 10);
    const dateStr = String(booking.date).slice(0, 10);
    return dateStr >= today;
  }
  return false;
}

function nextInLabel(booking) {
  if (!booking?.date || !booking?.start_time) return '';
  const start = new Date(`${String(booking.date).slice(0, 10)}T${booking.start_time}`);
  if (Number.isNaN(start.getTime())) return '';
  const diffMs = start.getTime() - Date.now();
  if (diffMs <= 0) return 'Starting soon';
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `Next in ${days} day${days === 1 ? '' : 's'}`;
  }
  if (hours > 0) return `Next in ${hours} hour${hours === 1 ? '' : 's'}`;
  return `Next in ${mins} min`;
}

async function countDynamicallyAvailableResources() {
  const resources = await db.prepare('SELECT * FROM resources').all();
  const bookings = await db
    .prepare(
      `SELECT id, booking_code, resource_id, resource, date, start_time, end_time, status
       FROM bookings
       WHERE status IN ('Pending', 'Confirmed')`,
    )
    .all();

  let available = 0;
  for (const resource of resources) {
    const related = bookings.filter(
      (b) => b.resource_id === resource.id || b.resource === resource.name,
    );
    const availability = computeResourceAvailability(resource, related, {});
    if (availability.available) available += 1;
  }
  return available;
}

/* GET /api/dashboard — admin stats + recent bookings */
router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const totalResourcesRow = await db.prepare('SELECT COUNT(*) AS c FROM resources').get();
    const availableResources = await countDynamicallyAvailableResources();
    const totalBookingsRow = await db.prepare('SELECT COUNT(*) AS c FROM bookings').get();
    const totalUsersRow = await db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'user'").get();
    const pendingBookingsRow = await db.prepare("SELECT COUNT(*) AS c FROM bookings WHERE status = 'Pending'").get();
    const confirmedBookingsRow = await db.prepare("SELECT COUNT(*) AS c FROM bookings WHERE status = 'Confirmed'").get();

    const today = new Date().toISOString().slice(0, 10);
    const todaysBookingsRow = await db
      .prepare('SELECT COUNT(*) AS c FROM bookings WHERE date(created_at) = date(?)')
      .get(today);

    const recentRows = await db
      .prepare(`${bookingSelect} ORDER BY b.id DESC LIMIT 6`)
      .all();

    const recent = recentRows.map((r) => ({
      id: r.booking_code,
      user: r.user_name,
      resource: r.resource,
      date: r.date instanceof Date ? r.date.toISOString().slice(0, 10) : String(r.date || '').slice(0, 10),
      time: r.time,
      startTime: r.start_time,
      endTime: r.end_time,
      status: r.status,
      location: r.location || '',
    }));

    res.json({
      stats: {
        totalResources: Number(totalResourcesRow?.c) || 0,
        availableResources,
        totalBookings: Number(totalBookingsRow?.c) || 0,
        todaysBookings: Number(todaysBookingsRow?.c) || 0,
        totalUsers: Number(totalUsersRow?.c) || 0,
        pendingBookings: Number(pendingBookingsRow?.c) || 0,
        confirmedBookings: Number(confirmedBookingsRow?.c) || 0,
      },
      bookings: recent,
    });
  } catch (err) {
    console.error('GET /api/dashboard failed:', err);
    res.status(500).json({ message: 'Unable to load admin dashboard.' });
  }
});

/* GET /api/dashboard/user — current user stats + next upcoming */
router.get('/user', authenticate, async (req, res) => {
  const rows = await db
    .prepare(
      `SELECT b.*, r.location AS location, r.capacity AS capacity, r.image AS image
       FROM bookings b
       LEFT JOIN resources r ON r.id = b.resource_id
       WHERE b.user_id = ?
       ORDER BY b.date ASC, b.start_time ASC`,
    )
    .all(req.user.id);

  const bookings = rows.map(rowToBooking);
  const upcoming = bookings.filter(isUpcoming);
  const completed = bookings.filter((b) => b.status === 'Completed');
  const hoursBooked = bookings.reduce(
    (sum, b) => sum + hoursBetween(b.startTime, b.endTime),
    0,
  );
  const totalSpent = bookings.reduce((sum, b) => sum + parseAmount(b.amount), 0);

  const nextUpcoming =
    upcoming
      .slice()
      .sort((a, b) => {
        const aKey = `${String(a.date).slice(0, 10)}T${a.startTime || '00:00'}`;
        const bKey = `${String(b.date).slice(0, 10)}T${b.startTime || '00:00'}`;
        return aKey.localeCompare(bKey);
      })[0] || null;

  res.json({
    stats: {
      totalBookings: bookings.length,
      upcoming: upcoming.length,
      completed: completed.length,
      hoursBooked: Math.round(hoursBooked * 10) / 10,
      totalSpent,
      nextIn: nextInLabel(nextUpcoming),
    },
    upcoming: nextUpcoming,
    bookings,
  });
});

export default router;
