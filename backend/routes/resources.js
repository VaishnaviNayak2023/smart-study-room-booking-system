import { Router } from 'express';
import db from '../db.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { computeResourceAvailability } from '../utils/resourceAvailability.js';
import { loadMergedPricing } from '../utils/pricingCalculator.js';
import { saveResourceImageDataUrl } from '../utils/resourceImageUpload.js';

const router = Router();

function resolveImageInput(body = {}, existingImage = '') {
  const imageData = body.imageData || body.imageBase64;
  if (imageData) {
    try {
      return { ok: true, image: saveResourceImageDataUrl(imageData, body.imageName).url };
    } catch (err) {
      return { ok: false, status: err.status || 400, message: err.message || 'Invalid image upload.' };
    }
  }
  if (body.clearImage) {
    return { ok: true, image: '' };
  }
  if (body.image !== undefined) {
    // Keep backward compatibility for existing absolute/relative URLs.
    return { ok: true, image: String(body.image || '') };
  }
  return { ok: true, image: existingImage };
}

const rowToResource = (r, availability = null) => {
  const base = {
    id: r.id,
    name: r.name,
    type: r.type,
    capacity: r.capacity,
    location: r.location,
    description: r.description,
    // Admin maintenance flag from DB (not booking-derived).
    inService: !!r.available,
    image: r.image,
  };

  if (!availability) {
    return {
      ...base,
      available: !!r.available,
      active: !!r.available,
      canBook: !!r.available,
      isBooked: false,
      bookedByCurrentUser: false,
      bookedByOthers: false,
      availabilityStatus: r.available ? 'available' : 'maintenance',
      unavailableIntervals: [],
      activeBookingId: null,
      activeBookingStatus: null,
    };
  }

  return {
    ...base,
    available: availability.available,
    active: availability.available,
    canBook: availability.canBook,
    isBooked: availability.isBooked,
    bookedByCurrentUser: availability.bookedByCurrentUser,
    bookedByOthers: availability.bookedByOthers,
    availabilityStatus: availability.availabilityStatus,
    unavailableIntervals: availability.unavailableIntervals || [],
    activeBookingId: availability.activeBookingId,
    activeBookingStatus: availability.activeBookingStatus,
  };
};

async function assertValidResourceType(type) {
  const name = String(type || '').trim();
  if (!name) {
    return { ok: false, status: 400, message: 'Resource type is required.' };
  }
  const existing = await db.prepare('SELECT id, name FROM resource_types WHERE name = ?').get(name);
  if (!existing) {
    return {
      ok: false,
      status: 400,
      message: 'Resource type must match an existing Resource Types category.',
    };
  }
  return { ok: true, name: existing.name };
}

async function loadOccupyingBookings() {
  return db
    .prepare(
      `SELECT id, booking_code, user_id, resource_id, resource, date, start_time, end_time, status
       FROM bookings
       WHERE status IN ('Pending', 'Confirmed')`,
    )
    .all();
}

function bookingsForResource(allBookings, resource) {
  return allBookings.filter(
    (b) =>
      (resource.id != null && b.resource_id === resource.id) ||
      (!!resource.name && b.resource === resource.name),
  );
}

function parseAvailabilityWindow(query = {}) {
  return {
    date: query.date ? String(query.date).slice(0, 10) : '',
    startTime: query.startTime ? String(query.startTime) : '',
    endTime: query.endTime ? String(query.endTime) : '',
  };
}

async function enrichResources(rows, window, viewerUserId = null) {
  const bookings = await loadOccupyingBookings();
  const uniqueTypes = [...new Set(rows.map((row) => row.type).filter(Boolean))];
  const pricingByType = {};

  await Promise.all(
    uniqueTypes.map(async (type) => {
      pricingByType[type] = await loadMergedPricing(type);
    }),
  );

  return rows.map((row) => {
    const related = bookingsForResource(bookings, row);
    const availability = computeResourceAvailability(row, related, window, new Date(), viewerUserId);
    const mergedPricing = pricingByType[row.type] || {};
    const resource = rowToResource(row, availability);
    return {
      ...resource,
      hourlyRate: Number(mergedPricing.hourlyRate) || 0,
      currency: mergedPricing.currency || 'INR',
      freeFirstHour: !!mergedPricing.freeFirstHour,
    };
  });
}

/* GET /api/resources
 * Optional query: date, startTime, endTime — scopes booking conflict checks.
 * Without date: a resource is Unavailable while it has an active upcoming/ongoing booking.
 * With date only: shows remaining intervals that day; status reflects current occupancy.
 */
router.get('/', authenticate, async (req, res) => {
  const rows = await db.prepare('SELECT * FROM resources ORDER BY id').all();
  const window = parseAvailabilityWindow(req.query);
  const resources = await enrichResources(rows, window, req.user?.id);
  res.json({ resources, window });
});

/* POST /api/resources/upload — save image from data URL (admin). */
router.post('/upload', authenticate, authorize('admin'), async (req, res) => {
  const imageData = req.body?.imageData || req.body?.imageBase64;
  if (!imageData) return res.status(400).json({ message: 'imageData is required.' });
  try {
    const saved = saveResourceImageDataUrl(imageData, req.body?.imageName);
    res.status(201).json({ url: saved.url, image: saved.url, filename: saved.filename });
  } catch (err) {
    res.status(err.status || 400).json({ message: err.message || 'Upload failed.' });
  }
});

/* GET /api/resources/:id */
router.get('/:id', authenticate, async (req, res) => {
  const row = await db.prepare('SELECT * FROM resources WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ message: 'Resource not found.' });
  const window = parseAvailabilityWindow(req.query);
  const [resource] = await enrichResources([row], window, req.user?.id);
  res.json({ resource, window });
});

/* POST /api/resources */
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  const {
    name,
    type,
    capacity = 1,
    location = '',
    description = '',
    available = true,
  } = req.body || {};
  if (!name) return res.status(400).json({ message: 'Name is required.' });

  const typeCheck = await assertValidResourceType(type);
  if (!typeCheck.ok) return res.status(typeCheck.status).json({ message: typeCheck.message });

  const imageResult = resolveImageInput(req.body || {}, '');
  if (!imageResult.ok) return res.status(imageResult.status).json({ message: imageResult.message });

  const info = await db
    .prepare(
      'INSERT INTO resources (name, type, capacity, location, description, available, image) VALUES (?, ?, ?, ?, ?, ?, ?)',
    )
    .run(name, typeCheck.name, capacity, location, description, available ? 1 : 0, imageResult.image);
  const row = await db.prepare('SELECT * FROM resources WHERE id = ?').get(info.lastInsertRowid);
  const [resource] = await enrichResources([row], {});
  res.status(201).json({ resource });
});

/* PUT /api/resources/:id */
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  const existing = await db.prepare('SELECT * FROM resources WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ message: 'Resource not found.' });
  const { name, type, capacity, location, description, available } = req.body || {};

  let nextType = existing.type;
  if (type !== undefined) {
    const typeCheck = await assertValidResourceType(type);
    if (!typeCheck.ok) return res.status(typeCheck.status).json({ message: typeCheck.message });
    nextType = typeCheck.name;
  }

  const imageResult = resolveImageInput(req.body || {}, existing.image);
  if (!imageResult.ok) return res.status(imageResult.status).json({ message: imageResult.message });

  await db
    .prepare(
      'UPDATE resources SET name = ?, type = ?, capacity = ?, location = ?, description = ?, available = ?, image = ? WHERE id = ?',
    )
    .run(
      name ?? existing.name,
      nextType,
      capacity ?? existing.capacity,
      location ?? existing.location,
      description ?? existing.description,
      available !== undefined ? (available ? 1 : 0) : existing.available,
      imageResult.image,
      existing.id,
    );
  const row = await db.prepare('SELECT * FROM resources WHERE id = ?').get(existing.id);
  const [resource] = await enrichResources([row], {});
  res.json({ resource });
});

/* DELETE /api/resources/:id */
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  const id = req.params.id;
  const existing = await db.prepare('SELECT id FROM resources WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ message: 'Resource not found.' });

  await db.prepare('UPDATE bookings SET resource_id = NULL WHERE resource_id = ?').run(id);
  const info = await db.prepare('DELETE FROM resources WHERE id = ?').run(id);
  if (info.affectedRows === 0) return res.status(404).json({ message: 'Resource not found.' });
  res.json({ message: 'Resource deleted.' });
});

export default router;
