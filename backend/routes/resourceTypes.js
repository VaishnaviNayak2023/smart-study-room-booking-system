import { Router } from 'express';
import db from '../db.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

const rowToType = (r) => ({
  id: r.id,
  name: r.name,
  icon: r.icon,
  color: r.color,
  description: r.description,
  resources: db.prepare('SELECT COUNT(*) AS c FROM resources WHERE type = ?').get(r.name).c,
});

/* GET /api/resource-types */
router.get('/', authenticate, (req, res) => {
  const rows = db.prepare('SELECT * FROM resource_types ORDER BY id').all();
  res.json({ resourceTypes: rows.map(rowToType) });
});

/* POST /api/resource-types */
router.post('/', authenticate, authorize('admin'), (req, res) => {
  const { name, icon = 'meeting_room', color = 'purple', description = '' } = req.body || {};
  if (!name) return res.status(400).json({ message: 'Name is required.' });
  const info = db
    .prepare('INSERT INTO resource_types (name, icon, color, description) VALUES (?, ?, ?, ?)')
    .run(name, icon, color, description);
  const row = db.prepare('SELECT * FROM resource_types WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ resourceType: rowToType(row) });
});

/* PUT /api/resource-types/:id */
router.put('/:id', authenticate, authorize('admin'), (req, res) => {
  const existing = db.prepare('SELECT * FROM resource_types WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ message: 'Resource type not found.' });
  const { name, icon, color, description } = req.body || {};
  db.prepare('UPDATE resource_types SET name = ?, icon = ?, color = ?, description = ? WHERE id = ?')
    .run(name ?? existing.name, icon ?? existing.icon, color ?? existing.color, description ?? existing.description, existing.id);
  const row = db.prepare('SELECT * FROM resource_types WHERE id = ?').get(existing.id);
  res.json({ resourceType: rowToType(row) });
});

/* DELETE /api/resource-types/:id */
router.delete('/:id', authenticate, authorize('admin'), (req, res) => {
  const info = db.prepare('DELETE FROM resource_types WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ message: 'Resource type not found.' });
  res.json({ message: 'Resource type deleted.' });
});

export default router;

