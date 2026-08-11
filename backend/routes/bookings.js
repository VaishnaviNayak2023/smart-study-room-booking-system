import { Router } from 'express';
import db from '../db.js';
import { authenticate } from '../middleware/auth.js';
import { createNotification } from './notifications.js';

const router = Router();

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
  createdAt: r.created_at,
});

const bookingSelect = `
  SELECT b.*, r.location AS location, r.capacity AS capacity, r.image AS image
  FROM bookings b
  LEFT JOIN resources r ON r.id = b.resource_id
`;

async function getSettings() {
  const row = await db.prepare('SELECT data FROM settings WHERE id = 1').get();
  if (!row?.data) return {};
  return typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
}

async function notifyBookingStatus(booking, status, resource, date, startTime, endTime) {
  if (!booking.user_id) return;
  if (status === 'Confirmed') {
    await createNotification({
      userId: booking.user_id,
      type: 'booking_confirmed',
      title: `Booking Confirmed: ${resource}`,
      message: `Your booking for ${date}, ${startTime} - ${endTime} has been approved.`,
    });
  } else if (status === 'Cancelled') {
    await createNotification({
      userId: booking.user_id,
      type: 'system',
      title: `Booking Cancelled: ${resource}`,
      message: `Your booking for ${date}, ${startTime} - ${endTime} was cancelled.`,
    });
  } else if (status === 'Pending') {
    await createNotification({
      userId: booking.user_id,
      type: 'reminder',
      title: `Booking Pending: ${resource}`,
      message: `Your booking request for ${date}, ${startTime} - ${endTime} is awaiting approval.`,
    });
  } else {
    await createNotification({
      userId: booking.user_id,
      type: 'reminder',
      title: `Booking Updated: ${resource}`,
      message: `Your booking status is now ${status}.`,
    });
  }
}

/* GET /api/bookings/my — must be before /:code routes */
router.get('/my', authenticate, async (req, res) => {
  const rows = await db
    .prepare(`${bookingSelect} WHERE b.user_id = ? ORDER BY b.id DESC`)
    .all(req.user.id);
  res.json({ bookings: rows.map(rowToBooking) });
});

/* GET /api/bookings — admins see all, users see their own */
router.get('/', authenticate, async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const rows = isAdmin
    ? await db.prepare(`${bookingSelect} ORDER BY b.id DESC`).all()
    : await db.prepare(`${bookingSelect} WHERE b.user_id = ? ORDER BY b.id DESC`).all(req.user.id);

  if (isAdmin) {
    const all = await db.prepare('SELECT * FROM bookings').all();
    const today = new Date().toISOString().slice(0, 10);
    const stats = {
      total: all.length,
      confirmed: all.filter((b) => b.status === 'Confirmed').length,
      pending: all.filter((b) => b.status === 'Pending').length,
      cancelled: all.filter((b) => b.status === 'Cancelled').length,
      completed: all.filter((b) => b.status === 'Completed').length,
      confirmedToday: all.filter(
        (b) => b.status === 'Confirmed' && String(b.date).slice(0, 10) === today,
      ).length,
    };
    return res.json({ bookings: rows.map(rowToBooking), stats });
  }

  return res.json({ bookings: rows.map(rowToBooking) });
});

/* POST /api/bookings — create a booking */
router.post('/', authenticate, async (req, res) => {
  const {
    resource,
    resourceId = null,
    date,
    time,
    startTime = time,
    endTime,
    amount = '0.00',
    purpose = '',
    notes = '',
  } = req.body || {};

  if (!resource || !date) {
    return res.status(400).json({ message: 'Resource and date are required.' });
  }

  const settings = await getSettings();
  const autoConfirm = !!settings.autoConfirm;
  const status =
    req.user.role === 'admin' || autoConfirm ? 'Confirmed' : 'Pending';

  const user = await db.prepare('SELECT id, name, role FROM users WHERE id = ?').get(req.user.id);
  const lastCode = await db.prepare('SELECT booking_code FROM bookings ORDER BY id DESC LIMIT 1').get();
  const lastNum = lastCode ? parseInt(lastCode.booking_code.replace(/\D/g, ''), 10) || 1000 : 1000;
  const code = `BK${lastNum + 1}`;

  const dlabel = `${date} — ${startTime} - ${endTime}`;

  const info = await db
    .prepare(
      'INSERT INTO bookings (booking_code, user_id, user_name, resource_id, resource, date, time, datetime_label, status, amount, start_time, end_time, purpose, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    )
    .run(
      code,
      user.id,
      user.name,
      resourceId,
      resource,
      date,
      time,
      dlabel,
      status,
      amount,
      startTime,
      endTime,
      purpose || '',
      notes || '',
    );

  const row = await db.prepare(`${bookingSelect} WHERE b.id = ?`).get(info.lastInsertRowid);

  await notifyBookingStatus(row, status, resource, date, startTime, endTime);

  res.status(201).json({ booking: rowToBooking(row) });
});

/* PUT /api/bookings/:code — update status (admin) or modify (owner) */
router.put('/:code', authenticate, async (req, res) => {
  const booking = await db.prepare('SELECT * FROM bookings WHERE booking_code = ?').get(req.params.code);
  if (!booking) return res.status(404).json({ message: 'Booking not found.' });

  const isAdmin = req.user.role === 'admin';
  const isOwner = booking.user_id === req.user.id;

  if (!isAdmin && !isOwner) {
    return res.status(403).json({ message: 'You can only modify your own bookings.' });
  }

  const { status, resource, date, time, amount, startTime, endTime, purpose, notes } = req.body || {};
  const nextDate = date ?? booking.date;
  const nextStart = startTime ?? booking.start_time;
  const nextEnd = endTime ?? booking.end_time;
  const nextTime = time ?? nextStart ?? booking.time;
  const nextStatus = status ?? booking.status;
  const dlabel = `${nextDate} — ${nextStart} - ${nextEnd}`;

  await db
    .prepare(
      'UPDATE bookings SET status = ?, resource = ?, date = ?, time = ?, amount = ?, start_time = ?, end_time = ?, purpose = ?, notes = ?, datetime_label = ? WHERE id = ?',
    )
    .run(
      nextStatus,
      resource ?? booking.resource,
      nextDate,
      nextTime,
      amount ?? booking.amount,
      nextStart,
      nextEnd,
      purpose !== undefined ? purpose : booking.purpose || '',
      notes !== undefined ? notes : booking.notes || '',
      dlabel,
      booking.id,
    );

  const row = await db.prepare(`${bookingSelect} WHERE b.id = ?`).get(booking.id);

  if (nextStatus !== booking.status || nextDate !== booking.date || nextStart !== booking.start_time) {
    await notifyBookingStatus(
      row,
      nextStatus,
      row.resource,
      nextDate,
      nextStart,
      nextEnd,
    );
  }

  res.json({ booking: rowToBooking(row) });
});

/* DELETE /api/bookings/:code */
router.delete('/:code', authenticate, async (req, res) => {
  const booking = await db.prepare('SELECT * FROM bookings WHERE booking_code = ?').get(req.params.code);
  if (!booking) return res.status(404).json({ message: 'Booking not found.' });

  const isAdmin = req.user.role === 'admin';
  const isOwner = booking.user_id === req.user.id;
  if (!isAdmin && !isOwner) {
    return res.status(403).json({ message: 'You can only cancel your own bookings.' });
  }

  await db.prepare('DELETE FROM bookings WHERE id = ?').run(booking.id);

  await createNotification({
    userId: booking.user_id,
    type: 'system',
    title: `Booking Cancelled: ${booking.resource}`,
    message: `Your booking for ${booking.datetime_label || booking.date} was cancelled.`,
  });

  res.json({ message: 'Booking cancelled.' });
});

export default router;
