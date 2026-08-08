import { Router } from 'express';
import db from '../db.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

/* GET /api/pricing-rules/resources — pricing snapshot for the browse page */
router.get('/resources', authenticate, (req, res) => {
  const row = db.prepare("SELECT * FROM pricing_rules WHERE context = 'study' ORDER BY id DESC LIMIT 1").get();
  const data = row ? JSON.parse(row.data) : {};
  res.json({ pricing: data });
});

/* GET /api/pricing-rules/:context — full config for the Pricing Rules page */
router.get('/:context?', authenticate, authorize('admin'), (req, res) => {
  const context = req.params.context || 'study';
  const rows = db.prepare('SELECT * FROM pricing_rules ORDER BY id').all();
  const data = {};
  for (const r of rows) data[r.context] = JSON.parse(r.data);
  res.json({ context, pricing: data });
});

/* PUT /api/pricing-rules/:context */
router.put('/:context', authenticate, authorize('admin'), (req, res) => {
  const context = req.params.context;
  const body = req.body || {};
  const existing = db.prepare('SELECT * FROM pricing_rules WHERE context = ?').get(context);
  if (existing) {
    db.prepare('UPDATE pricing_rules SET data = ?, updated_at = datetime(\'now\') WHERE context = ?').run(JSON.stringify(body), context);
  } else {
    db.prepare('INSERT INTO pricing_rules (context, data) VALUES (?, ?)').run(context, JSON.stringify(body));
  }
  const row = db.prepare('SELECT * FROM pricing_rules WHERE context = ?').get(context);
  res.json({ context, pricing: JSON.parse(row.data) });
});

export default router;

