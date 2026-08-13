import { Router } from 'express';
import db from '../db.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { applyGeneralRulesToContextData, pricingContextKey } from '../utils/pricingCalculator.js';

const router = Router();

function parseJsonColumn(value) {
  if (value == null) return {};
  if (typeof value === 'object') return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

const rowToType = async (r) => ({
  id: r.id,
  name: r.name,
  icon: r.icon,
  color: r.color,
  description: r.description,
  resources: (await db.prepare('SELECT COUNT(*) AS c FROM resources WHERE type = ?').get(r.name)).c,
});

/* GET /api/resource-types */
router.get('/', authenticate, async (req, res) => {
  const rows = await db.prepare('SELECT * FROM resource_types ORDER BY id').all();
  res.json({ resourceTypes: await Promise.all(rows.map(rowToType)) });
});

/* POST /api/resource-types */
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  const { name, icon = '', color = 'purple', description = '' } = req.body || {};
  if (!name) return res.status(400).json({ message: 'Name is required.' });
  if (!String(icon).trim()) {
    return res.status(400).json({ message: 'Icon is required.' });
  }
  const info = await db.prepare('INSERT INTO resource_types (name, icon, color, description) VALUES (?, ?, ?, ?)').run(name, icon, color, description);
  const row = await db.prepare('SELECT * FROM resource_types WHERE id = ?').get(info.lastInsertRowid);

  const context = pricingContextKey(name);
  const existingPricing = await db.prepare('SELECT id FROM pricing_rules WHERE context = ?').get(context);
  if (!existingPricing) {
    const generalRow = await db.prepare('SELECT data FROM pricing_rules WHERE context = ?').get('general');
    const generalData = parseJsonColumn(generalRow?.data);
    const baseRate = Number(generalData?.baseRate) || 0;
    const seeded = applyGeneralRulesToContextData(
      {
        hourlyRate: baseRate,
        freeFirstHour: false,
        peakStart: '',
        peakEnd: '',
        peakDays: 'Mon - Fri',
        peakMultiplier: 1,
        roleDiscounts: [],
        rules: [],
      },
      generalData.rules || [],
    );
    await db
      .prepare('INSERT INTO pricing_rules (context, data) VALUES (?, ?)')
      .run(context, JSON.stringify(seeded));
  }

  res.status(201).json({ resourceType: await rowToType(row) });
});

/* PUT /api/resource-types/:id */
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  const existing = await db.prepare('SELECT * FROM resource_types WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ message: 'Resource type not found.' });
  const { name, icon, color, description } = req.body || {};
  await db.prepare('UPDATE resource_types SET name = ?, icon = ?, color = ?, description = ? WHERE id = ?').run(name ?? existing.name, icon ?? existing.icon, color ?? existing.color, description ?? existing.description, existing.id);
  const row = await db.prepare('SELECT * FROM resource_types WHERE id = ?').get(existing.id);
  res.json({ resourceType: await rowToType(row) });
});

/* DELETE /api/resource-types/:id */
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  const info = await db.prepare('DELETE FROM resource_types WHERE id = ?').run(req.params.id);
  if (info.affectedRows === 0) return res.status(404).json({ message: 'Resource type not found.' });
  res.json({ message: 'Resource type deleted.' });
});

export default router;

