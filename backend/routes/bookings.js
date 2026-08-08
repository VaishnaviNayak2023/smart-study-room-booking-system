import { Router } from 'express';
import db from '../db.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

const rowToBooking = (r) => ({
  id: r.booking_code || `BK${r.id}`,
  userId: r.user_id,
  user: r.user_name,
  resourceId: r.resource_id,
  resource: r.resource,
  date: r.date,
  time: r.time,
  datetime: r.datetime_label || `${r.date} — ${r.start_time} - ${r.end_time}`,
  status: r.status,
  amount: r.amount,
  startTime: r.start_time,
  endTime: r.end_time,
});

/* GET /api/bookings — admins see all, users see their own */
router.get('/', authenticate, (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const rows = isAdmin
    ? db.prepare('SELECT * FROM bookings ORDER BY id DESC').all()
    : db.prepare('SELECT * FROM bookings WHERE user_id = ? ORDER BY id DESC').all(req.user.id);

  if (isAdmin) {
    // compute the same stats the admin page uses
    const all = db.prepare('SELECT * FROM bookings').all();
    const stats = {
      total: all.length,
      confirmed: all.filter((b) => b.status === 'Confirmed').length,
      pending: all.filter((b) => b.status === 'Pending').length,
      cancelled: all.filter((b) => b.status === 'Cancelled').length,
    };
    return res.json({ bookings: rows.map(rowToBooking), stats });
  }

  return res.json({ bookings: rows.map(rowToBooking) });
});

/* POST /api/bookings — create a booking */
router.post('/', authenticate, (req, res) => {
  const { resource, resourceId = null, date, time, startTime = time, endTime, amount = '₹0.00', status = 'Confirmed' } = req.body || {};

  if (!resource || !date) {
    return res.status(400).json({ message: 'Resource and date are required.' });
  }

  const user = db
    .prepare('SELECT id, name, role FROM users WHERE id = ?')
    .get(req.user.id);

  const lastCode = db.prepare('SELECT booking_code FROM bookings ORDER BY id DESC LIMIT 1').get();
  const lastNum = lastCode ? parseInt(lastCode.booking_code.replace(/\D/g, ''), 10) || 1000 : 1000;
  const code = `BK${lastNum + 1}`;

  const dlabel = `${date} — ${startTime} - ${endTime}`;

  const info = db
    .prepare('INSERT INTO bookings (booking_code, user_id, user_name, resource_id, resource, date, time, datetime_label, status, amount, start_time, end_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(code, user.id, user.name, resourceId, resource, date, time, dlabel, status, amount, startTime, endTime);

  const row = db.prepare('SELECT * FROM bookings WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ booking: rowToBooking(row) });
});

/* PUT /api/bookings/:code — update status (admin) or modify (owner) */
router.put('/:code', authenticate, (req, res) => {
  const booking = db.prepare('SELECT * FROM bookings WHERE booking_code = ?').get(req.params.code);
  if (!booking) return res.status(404).json({ message: 'Booking not found.' });

  const isAdmin = req.user.role === 'admin';
  const isOwner = booking.user_id === req.user.id;

  if (!isAdmin && !isOwner) {
    return res.status(403).json({ message: 'You can only modify your own bookings.' });
  }

  const { status, resource, date, time, amount, startTime, endTime } = req.body || {};
  db.prepare('UPDATE bookings SET status = ?, resource = ?, date = ?, time = ?, amount = ?, start_time = ?, end_time = ? WHERE id = ?')
    .run(
      status ?? booking.status,
      resource ?? booking.resource,
      date ?? booking.date,
      time ?? booking.time,
      amount ?? booking.amount,
      startTime ?? booking.start_time,
      endTime ?? booking.end_time,
      booking.id,
    );

  const row = db.prepare('SELECT * FROM bookings WHERE id = ?').get(booking.id);
  res.json({ booking: rowToBooking(row) });
});

/* DELETE /api/bookings/:code */
router.delete('/:code', authenticate, (req, res) => {
  const booking = db.prepare('SELECT * FROM bookings WHERE booking_code = ?').get(req.params.code);
  if (!booking) return res.status(404).json({ message: 'Booking not found.' });

  const isAdmin = req.user.role === 'admin';
  const isOwner = booking.user_id === req.user.id;
  if (!isAdmin && !isOwner) {
    return res.status(403).json({ message: 'You can only cancel your own bookings.' });
  }

  db.prepare('DELETE FROM bookings WHERE id = ?').run(booking.id);
  res.json({ message: 'Booking cancelled.' });
});

/* GET /api/bookings/my — current user's bookings */
router.get('/my', authenticate, (req, res) => {
  const rows = db.prepare('SELECT * FROM bookings WHERE user_id = ? ORDER BY id DESC').all(req.user.id);
  res.json({ bookings: rows.map(rowToBooking) });
});

export default router;

