import { Router } from 'express';
import db from '../db.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

const rowToResource = (r) => ({
  id: r.id,
  name: r.name,
  type: r.type,
  capacity: r.capacity,
  location: r.location,
  description: r.description,
  available: !!r.available,
  active: !!r.available,
  image: r.image,
});

/* GET /api/resources */
router.get('/', authenticate, (req, res) => {
  const rows = db.prepare('SELECT * FROM resources ORDER BY id').all();
  res.json({ resources: rows.map(rowToResource) });
});

/* GET /api/resources/:id */
router.get('/:id', authenticate, (req, res) => {
  const row = db.prepare('SELECT * FROM resources WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ message: 'Resource not found.' });
  res.json({ resource: rowToResource(row) });
});

/* POST /api/resources */
router.post('/', authenticate, authorize('admin'), (req, res) => {
  const { name, type = 'Study Room', capacity = 1, location = '', description = '', available = true, image = '' } = req.body || {};
  if (!name) return res.status(400).json({ message: 'Name is required.' });
  const info = db
    .prepare('INSERT INTO resources (name, type, capacity, location, description, available, image) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(name, type, capacity, location, description, available ? 1 : 0, image);
  const row = db.prepare('SELECT * FROM resources WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ resource: rowToResource(row) });
});

/* PUT /api/resources/:id */
router.put('/:id', authenticate, authorize('admin'), (req, res) => {
  const existing = db.prepare('SELECT * FROM resources WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ message: 'Resource not found.' });
  const { name, type, capacity, location, description, available, image } = req.body || {};
  db.prepare('UPDATE resources SET name = ?, type = ?, capacity = ?, location = ?, description = ?, available = ?, image = ? WHERE id = ?')
    .run(
      name ?? existing.name,
      type ?? existing.type,
      capacity ?? existing.capacity,
      location ?? existing.location,
      description ?? existing.description,
      available !== undefined ? (available ? 1 : 0) : existing.available,
      image ?? existing.image,
      existing.id,
    );
  const row = db.prepare('SELECT * FROM resources WHERE id = ?').get(existing.id);
  res.json({ resource: rowToResource(row) });
});

/* DELETE /api/resources/:id */
router.delete('/:id', authenticate, authorize('admin'), (req, res) => {
  const info = db.prepare('DELETE FROM resources WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ message: 'Resource not found.' });
  res.json({ message: 'Resource deleted.' });
});

export default router;

