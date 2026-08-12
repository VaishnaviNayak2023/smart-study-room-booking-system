import { Router } from 'express';
import db from '../db.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { createNotification } from './notifications.js';
import {
  bookingConflictsWithWindow,
  computeResourceAvailability,
} from '../utils/resourceAvailability.js';
import {
  calculateBookingPriceForResource,
  loadMergedPricing,
  durationHoursFromTimes,
  parseMinimumDurationHours,
} from '../utils/pricingCalculator.js';
import { getSettingsCurrencyCode } from '../utils/currency.js';

const router = Router();

const ALLOWED_STATUSES = new Set(['Pending', 'Confirmed', 'Completed', 'Cancelled']);

/** Valid status transitions keyed by current status. */
const STATUS_TRANSITIONS = {
  Pending: new Set(['Confirmed', 'Cancelled']),
  Confirmed: new Set(['Cancelled', 'Completed']),
  Completed: new Set(),
  Cancelled: new Set(),
};

const rowToBooking = (r) => {
  const createdAt = r.created_at;
  const statusUpdatedAt = r.status_updated_at || r.created_at;
  const waitingMs =
    r.status === 'Pending' && createdAt
      ? Math.max(0, Date.now() - new Date(createdAt).getTime())
      : null;
  const waitingHours = waitingMs == null ? null : Math.round((waitingMs / 36e5) * 10) / 10;

  return {
    id: r.booking_code || `BK${r.id}`,
    userId: r.user_id,
    user: r.user_name || r.account_name || '',
    userEmail: r.user_email || '',
    userPhone: r.user_phone || '',
    userPhoneCountryCode: r.user_phone_country_code || '',
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
    pricingSnapshot: parsePricingSnapshot(r.pricing_snapshot),
    location: r.location || '',
    capacity: r.capacity ?? null,
    image: r.image || '',
    createdAt,
    statusUpdatedAt,
    waitingHours,
    urgencyLabel:
      waitingHours == null
        ? null
        : waitingHours < 1
          ? `Expires soon · ${Math.max(1, Math.round(waitingHours * 60))}m waiting`
          : `${waitingHours} hrs waiting`,
  };
};

function parsePricingSnapshot(value) {
  if (!value) return null;
  let parsed = null;
  if (typeof value === 'object') parsed = value;
  else if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (!parsed || typeof parsed !== 'object') return null;
  if (!Array.isArray(parsed.lineItems) || parsed.total === undefined) return null;
  return parsed;
}

function parseStoredAmount(value) {
  const n = parseFloat(String(value || '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

/** Legacy bookings without a snapshot — use amount recorded at booking time. */
async function breakdownFromStoredBooking(row) {
  const total = parseStoredAmount(row.amount);
  if (total === null) return null;
  const currency = await getSettingsCurrencyCode(db);
  const amountText = String(row.amount || '').trim() || total.toFixed(2);
  return {
    lineItems: [
      {
        description: 'Booking Total',
        calculation: 'Amount recorded at booking time',
        amount: total,
        type: 'base',
      },
    ],
    subtotal: total,
    tax: 0,
    taxRate: 0,
    total,
    amount: amountText,
    currency,
  };
}

const bookingSelect = `
  SELECT b.*,
         r.location AS location,
         r.capacity AS capacity,
         r.image AS image,
         r.type AS resource_type,
         b.pricing_snapshot AS pricing_snapshot,
         u.email AS user_email,
         u.phone AS user_phone,
         u.phone_country_code AS user_phone_country_code,
         u.role AS user_role,
         u.name AS account_name
  FROM bookings b
  LEFT JOIN resources r ON r.id = b.resource_id
  LEFT JOIN users u ON u.id = b.user_id
`;

async function getSettings() {
  const row = await db.prepare('SELECT data FROM settings WHERE id = 1').get();
  if (!row?.data) return {};
  return typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
}

async function getOrganizationName() {
  const settings = await getSettings();
  return String(settings.systemName || '').trim();
}

function parseAddOnIds(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

async function assertMinimumDuration({ resourceType, startTime, endTime }) {
  const pricing = await loadMergedPricing(resourceType);
  const minimumHours = parseMinimumDurationHours(pricing.minimumDuration);
  if (minimumHours <= 0) return { ok: true };
  const hours = durationHoursFromTimes(startTime, endTime);
  if (hours < minimumHours) {
    return {
      ok: false,
      status: 400,
      message: `Booking duration must be at least ${minimumHours} hour(s).`,
    };
  }
  return { ok: true };
}

function canAccessBooking(row, user) {
  if (!row || !user) return false;
  return user.role === 'admin' || row.user_id === user.id;
}

async function assertResourceBookable({ resourceId, resourceName, date, startTime, endTime, excludeBookingId = null }) {
  let resourceRow = null;
  if (resourceId) {
    resourceRow = await db.prepare('SELECT * FROM resources WHERE id = ?').get(resourceId);
  }
  if (!resourceRow && resourceName) {
    resourceRow = await db.prepare('SELECT * FROM resources WHERE name = ?').get(resourceName);
  }

  if (resourceRow && !resourceRow.available) {
    return {
      ok: false,
      status: 409,
      message: 'This resource is marked unavailable by an administrator.',
    };
  }

  const params = [];
  let sql = `SELECT id, booking_code, resource_id, resource, date, start_time, end_time, status
             FROM bookings
             WHERE status IN ('Pending', 'Confirmed')`;
  if (resourceRow?.id) {
    sql += ' AND (resource_id = ? OR resource = ?)';
    params.push(resourceRow.id, resourceRow.name);
  } else {
    sql += ' AND resource = ?';
    params.push(resourceName);
  }
  if (excludeBookingId) {
    sql += ' AND id <> ?';
    params.push(excludeBookingId);
  }

  const existing = await db.prepare(sql).all(...params);
  const window = { date, startTime, endTime };
  const conflict = existing.find((b) => bookingConflictsWithWindow(b, window));
  if (conflict) {
    const conflictStart = conflict.start_time || conflict.startTime || '';
    const conflictEnd = conflict.end_time || conflict.endTime || '';
    return {
      ok: false,
      status: 409,
      message: 'Booked for that interval, choose another interval',
      conflictCode: conflict.booking_code,
      conflictInterval: {
        date: conflict.date,
        startTime: conflictStart,
        endTime: conflictEnd,
      },
    };
  }

  if (resourceRow) {
    const availability = computeResourceAvailability(resourceRow, existing, window);
    if (!availability.available) {
      return {
        ok: false,
        status: 409,
        message: 'Booked for that interval, choose another interval',
      };
    }
  }

  return { ok: true, resourceRow };
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

function parsePositiveInt(value, fallback) {
  const n = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function buildAdminFilters(query) {
  const clauses = [];
  const params = [];
  const search = String(query.search || query.q || '').trim();
  const status = String(query.status || '').trim();
  const resource = String(query.resource || '').trim();
  const resourceId = String(query.resourceId || '').trim();
  const dateFrom = String(query.dateFrom || '').trim();
  const dateTo = String(query.dateTo || '').trim();
  const view = String(query.view || 'all').trim().toLowerCase();

  if (view === 'action') {
    clauses.push(`b.status = 'Pending'`);
  }

  if (status && status !== 'All Statuses' && ALLOWED_STATUSES.has(status)) {
    clauses.push('b.status = ?');
    params.push(status);
  }

  if (resourceId) {
    clauses.push('b.resource_id = ?');
    params.push(Number(resourceId));
  } else if (resource && resource !== 'All Resources') {
    clauses.push('b.resource = ?');
    params.push(resource);
  }

  if (dateFrom) {
    clauses.push('b.date >= ?');
    params.push(dateFrom);
  }
  if (dateTo) {
    clauses.push('b.date <= ?');
    params.push(dateTo);
  }

  if (search) {
    clauses.push(
      `(b.booking_code LIKE ? OR b.user_name LIKE ? OR b.resource LIKE ? OR b.datetime_label LIKE ?
        OR COALESCE(b.purpose, '') LIKE ? OR COALESCE(r.location, '') LIKE ? OR COALESCE(u.email, '') LIKE ?)`,
    );
    const like = `%${search}%`;
    params.push(like, like, like, like, like, like, like);
  }

  return {
    whereSql: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
    params,
    view,
  };
}

function orderByClause(sort) {
  switch (String(sort || 'newest')) {
    case 'oldest':
      return 'ORDER BY b.date ASC, b.start_time ASC, b.id ASC';
    case 'status':
      return 'ORDER BY b.status ASC, b.date DESC, b.id DESC';
    case 'urgency':
      // Longest-waiting pending first, then soonest reservation date.
      return `ORDER BY
        CASE WHEN b.status = 'Pending' THEN 0 ELSE 1 END ASC,
        b.created_at ASC,
        b.date ASC,
        b.start_time ASC,
        b.id ASC`;
    case 'newest':
    default:
      return 'ORDER BY b.id DESC';
  }
}

async function computeAdminStats() {
  const today = new Date().toISOString().slice(0, 10);
  const totals = await db
    .prepare(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN status = 'Confirmed' THEN 1 ELSE 0 END) AS confirmed,
         SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pending,
         SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END) AS cancelled,
         SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed,
         SUM(
           CASE
             WHEN status = 'Confirmed'
              AND DATE(COALESCE(status_updated_at, created_at)) = ?
             THEN 1 ELSE 0
           END
         ) AS confirmedToday
       FROM bookings`,
    )
    .get(today);

  // Average approval/rejection latency for bookings whose status changed after creation.
  const avgRow = await db
    .prepare(
      `SELECT AVG(TIMESTAMPDIFF(MINUTE, created_at, status_updated_at)) AS avgMinutes
       FROM bookings
       WHERE status IN ('Confirmed', 'Cancelled')
         AND status_updated_at IS NOT NULL
         AND created_at IS NOT NULL
         AND status_updated_at > created_at`,
    )
    .get();

  const avgMinutes = avgRow?.avgMinutes == null ? null : Number(avgRow.avgMinutes);
  const avgResponseHours =
    avgMinutes == null || Number.isNaN(avgMinutes) ? null : Math.round((avgMinutes / 60) * 10) / 10;

  return {
    total: Number(totals?.total || 0),
    confirmed: Number(totals?.confirmed || 0),
    pending: Number(totals?.pending || 0),
    cancelled: Number(totals?.cancelled || 0),
    completed: Number(totals?.completed || 0),
    confirmedToday: Number(totals?.confirmedToday || 0),
    avgResponseHours,
  };
}

/* GET /api/bookings/my — must be before /:code routes */
router.get('/my', authenticate, async (req, res) => {
  const rows = await db
    .prepare(`${bookingSelect} WHERE b.user_id = ? ORDER BY b.id DESC`)
    .all(req.user.id);
  res.json({ bookings: rows.map(rowToBooking) });
});

/* GET /api/bookings/meta — admin filter options + global stats */
router.get('/meta', authenticate, authorize('admin'), async (req, res) => {
  const resources = await db
    .prepare(
      `SELECT DISTINCT b.resource AS name, b.resource_id AS id
       FROM bookings b
       WHERE b.resource IS NOT NULL AND b.resource <> ''
       ORDER BY b.resource ASC`,
    )
    .all();
  const statusRows = await db
    .prepare(
      `SELECT DISTINCT status
       FROM bookings
       WHERE status IS NOT NULL AND status <> ''
       ORDER BY status ASC`,
    )
    .all();
  const statusesFromDb = statusRows.map((r) => r.status).filter(Boolean);
  // Include known workflow statuses so filters remain available even before any rows exist.
  const statuses = [...new Set([...ALLOWED_STATUSES, ...statusesFromDb])];
  const stats = await computeAdminStats();
  res.json({
    statuses,
    resources: resources.map((r) => ({ id: r.id, name: r.name })),
    stats,
  });
});

/* GET /api/bookings — admins see all (filterable), users see their own */
router.get('/', authenticate, async (req, res) => {
  const isAdmin = req.user.role === 'admin';

  if (!isAdmin) {
    const rows = await db
      .prepare(`${bookingSelect} WHERE b.user_id = ? ORDER BY b.id DESC`)
      .all(req.user.id);
    return res.json({ bookings: rows.map(rowToBooking) });
  }

  const page = parsePositiveInt(req.query.page, 1);
  const limit = Math.min(parsePositiveInt(req.query.limit, 10), 100);
  const offset = (page - 1) * limit;
  const { whereSql, params } = buildAdminFilters(req.query);
  const orderSql = orderByClause(req.query.sort);

  const countRow = await db
    .prepare(
      `SELECT COUNT(*) AS c
       FROM bookings b
       LEFT JOIN resources r ON r.id = b.resource_id
       LEFT JOIN users u ON u.id = b.user_id
       ${whereSql}`,
    )
    .get(...params);
  const totalFiltered = Number(countRow?.c || 0);

  // LIMIT/OFFSET inlined as validated integers — mysql2 prepared statements
  // reject bound placeholders for these clauses on some servers.
  const rows = await db
    .prepare(
      `${bookingSelect}
       ${whereSql}
       ${orderSql}
       LIMIT ${limit} OFFSET ${offset}`,
    )
    .all(...params);

  const stats = await computeAdminStats();

  return res.json({
    bookings: rows.map(rowToBooking),
    stats,
    pagination: {
      page,
      limit,
      total: totalFiltered,
      totalPages: Math.max(1, Math.ceil(totalFiltered / limit)),
    },
  });
});

/* GET /api/bookings/:code/receipt — receipt data for PDF (owner or admin) */
router.get('/:code/receipt', authenticate, async (req, res) => {
  const row = await db.prepare(`${bookingSelect} WHERE b.booking_code = ?`).get(req.params.code);
  if (!row || !canAccessBooking(row, req.user)) {
    return res.status(404).json({ message: 'Booking not found.' });
  }

  const snapshot = parsePricingSnapshot(row.pricing_snapshot);
  let breakdown = snapshot;
  if (!breakdown) {
    breakdown = await breakdownFromStoredBooking(row);
  }
  if (!breakdown) {
    breakdown = await calculateBookingPriceForResource({
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      date: row.date instanceof Date ? row.date.toISOString().slice(0, 10) : String(row.date || '').slice(0, 10),
      startTime: row.start_time,
      endTime: row.end_time,
      addOnIds: parseAddOnIds(row.add_on_ids),
      userRole: row.user_role || 'user',
    });
  }

  const storedTotal = parseStoredAmount(row.amount);
  if (storedTotal !== null && breakdown && Number(breakdown.total) !== storedTotal) {
    breakdown = {
      ...breakdown,
      total: storedTotal,
      amount: String(row.amount || storedTotal.toFixed(2)),
    };
  }

  const organizationName = await getOrganizationName();
  const receipt = {
    receiptId: `RCT-${row.booking_code || row.id}`,
    issuedAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    organizationName,
    booking: rowToBooking(row),
    breakdown,
  };

  return res.json({ receipt });
});

/* GET /api/bookings/:code — single booking (admin or owner) */
router.get('/:code', authenticate, async (req, res) => {
  const row = await db.prepare(`${bookingSelect} WHERE b.booking_code = ?`).get(req.params.code);
  if (!row || !canAccessBooking(row, req.user)) {
    return res.status(404).json({ message: 'Booking not found.' });
  }

  return res.json({ booking: rowToBooking(row) });
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
    amount: clientAmount = '0.00',
    addOnIds = [],
    purpose = '',
    notes = '',
  } = req.body || {};

  if (!resource || !date) {
    return res.status(400).json({ message: 'Resource and date are required.' });
  }

  const bookable = await assertResourceBookable({
    resourceId,
    resourceName: resource,
    date,
    startTime,
    endTime,
  });
  if (!bookable.ok) {
    return res.status(bookable.status).json({
      message: bookable.message,
      conflictCode: bookable.conflictCode || null,
      conflictInterval: bookable.conflictInterval || null,
    });
  }
  const resolvedResourceId = resourceId || bookable.resourceRow?.id || null;

  const durationCheck = await assertMinimumDuration({
    resourceType: bookable.resourceRow?.type,
    startTime,
    endTime,
  });
  if (!durationCheck.ok) {
    return res.status(durationCheck.status).json({ message: durationCheck.message });
  }

  const normalizedAddOnIds = Array.isArray(addOnIds) ? addOnIds.map(String) : [];

  const settings = await getSettings();
  const autoConfirm = !!settings.autoConfirm;
  const status = req.user.role === 'admin' || autoConfirm ? 'Confirmed' : 'Pending';

  const user = await db.prepare('SELECT id, name, role FROM users WHERE id = ?').get(req.user.id);

  const pricingBreakdown = await calculateBookingPriceForResource({
    resourceType: bookable.resourceRow?.type,
    resourceId: resolvedResourceId,
    date,
    startTime,
    endTime,
    addOnIds: normalizedAddOnIds,
    userRole: user.role,
  });

  const amount = pricingBreakdown.amount;
  const lastCode = await db.prepare('SELECT booking_code FROM bookings ORDER BY id DESC LIMIT 1').get();
  const lastNum = lastCode ? parseInt(String(lastCode.booking_code).replace(/\D/g, ''), 10) || 1000 : 1000;
  const code = `BK${lastNum + 1}`;

  const dlabel = `${date} — ${startTime} - ${endTime}`;

  const info = await db
    .prepare(
      `INSERT INTO bookings
        (booking_code, user_id, user_name, resource_id, resource, date, time, datetime_label,
         status, amount, start_time, end_time, purpose, notes, pricing_snapshot, add_on_ids, status_updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    )
    .run(
      code,
      user.id,
      user.name,
      resolvedResourceId,
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
      JSON.stringify(pricingBreakdown),
      JSON.stringify(normalizedAddOnIds),
    );

  const row = await db.prepare(`${bookingSelect} WHERE b.id = ?`).get(info.lastInsertRowid);

  await notifyBookingStatus(row, status, resource, date, startTime, endTime);

  res.status(201).json({ booking: rowToBooking(row), pricing: pricingBreakdown });
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

  if (status !== undefined && status !== booking.status) {
    if (!isAdmin) {
      return res.status(403).json({ message: 'Only an administrator can change booking status.' });
    }
    if (!ALLOWED_STATUSES.has(status)) {
      return res.status(400).json({
        message: `Invalid status. Allowed values: ${[...ALLOWED_STATUSES].join(', ')}.`,
      });
    }
    const allowedNext = STATUS_TRANSITIONS[booking.status] || new Set();
    if (!allowedNext.has(status)) {
      return res.status(400).json({
        message: `Invalid status transition from ${booking.status} to ${status}.`,
      });
    }
  }

  const nextDate = date ?? booking.date;
  const nextStart = startTime ?? booking.start_time;
  const nextEnd = endTime ?? booking.end_time;
  const nextTime = time ?? nextStart ?? booking.time;
  const nextStatus = status ?? booking.status;
  const nextResource = resource ?? booking.resource;
  const dlabel = `${nextDate} — ${nextStart} - ${nextEnd}`;
  const statusChanged = nextStatus !== booking.status;
  const scheduleChanged =
    nextResource !== booking.resource ||
    nextDate !== booking.date ||
    nextStart !== booking.start_time ||
    nextEnd !== booking.end_time;

  if (nextStatus === 'Pending' || nextStatus === 'Confirmed') {
    const bookable = await assertResourceBookable({
      resourceId: booking.resource_id,
      resourceName: nextResource,
      date: nextDate,
      startTime: nextStart,
      endTime: nextEnd,
      excludeBookingId: booking.id,
    });
    if (!bookable.ok) {
      return res.status(bookable.status).json({
        message: bookable.message,
        conflictCode: bookable.conflictCode || null,
        conflictInterval: bookable.conflictInterval || null,
      });
    }
    const resourceRow = booking.resource_id
      ? await db.prepare('SELECT id, type FROM resources WHERE id = ?').get(booking.resource_id)
      : await db.prepare('SELECT id, type FROM resources WHERE name = ?').get(nextResource);
    const durationCheck = await assertMinimumDuration({
      resourceType: resourceRow?.type || '',
      startTime: nextStart,
      endTime: nextEnd,
    });
    if (!durationCheck.ok) {
      return res.status(durationCheck.status).json({ message: durationCheck.message });
    }
  }

  let nextAmount = amount ?? booking.amount;
  let nextPricingSnapshot = parsePricingSnapshot(booking.pricing_snapshot);

  if (scheduleChanged) {
    const user = await db.prepare('SELECT role FROM users WHERE id = ?').get(booking.user_id);
    const resourceRow = booking.resource_id
      ? await db.prepare('SELECT id, type FROM resources WHERE id = ?').get(booking.resource_id)
      : await db.prepare('SELECT id, type FROM resources WHERE name = ?').get(nextResource);
    const recalculatedPricing = await calculateBookingPriceForResource({
      resourceType: resourceRow?.type || '',
      resourceId: resourceRow?.id || booking.resource_id,
      date: nextDate,
      startTime: nextStart,
      endTime: nextEnd,
      addOnIds: parseAddOnIds(booking.add_on_ids),
      userRole: user?.role || 'user',
    });
    nextAmount = recalculatedPricing.amount;
    nextPricingSnapshot = recalculatedPricing;
  }

  await db
    .prepare(
      `UPDATE bookings SET
         status = ?,
         resource = ?,
         date = ?,
         time = ?,
         amount = ?,
         start_time = ?,
         end_time = ?,
         purpose = ?,
         notes = ?,
         pricing_snapshot = ?,
         datetime_label = ?,
         status_updated_at = CASE WHEN ? THEN CURRENT_TIMESTAMP ELSE COALESCE(status_updated_at, created_at) END
       WHERE id = ?`,
    )
    .run(
      nextStatus,
      nextResource,
      nextDate,
      nextTime,
      nextAmount,
      nextStart,
      nextEnd,
      purpose !== undefined ? purpose : booking.purpose || '',
      notes !== undefined ? notes : booking.notes || '',
      nextPricingSnapshot ? JSON.stringify(nextPricingSnapshot) : null,
      dlabel,
      statusChanged ? 1 : 0,
      booking.id,
    );

  const row = await db.prepare(`${bookingSelect} WHERE b.id = ?`).get(booking.id);

  if (statusChanged || nextDate !== booking.date || nextStart !== booking.start_time) {
    await notifyBookingStatus(row, nextStatus, row.resource, nextDate, nextStart, nextEnd);
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
