import { Router } from 'express';
import db from '../db.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { getSettingsCurrencyCode } from '../utils/currency.js';
import {
  calculateBookingPrice,
  loadMergedPricing,
  mergePricingConfigs,
  pricingContextKey,
} from '../utils/pricingCalculator.js';

const router = Router();

/** mysql2 may return JSON columns as objects; older rows may still be strings. */
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

function validatePricingPayload(body) {
  const errors = [];
  if (body.baseRate !== undefined) {
    const n = Number(body.baseRate);
    if (Number.isNaN(n)) errors.push('baseRate must be a number.');
    else if (n < 0) errors.push('baseRate cannot be negative.');
  }
  if (body.hourlyRate !== undefined) {
    const n = Number(body.hourlyRate);
    if (Number.isNaN(n)) errors.push('hourlyRate must be a number.');
    else if (n < 0) errors.push('hourlyRate cannot be negative.');
  }
  if (body.taxRate !== undefined) {
    const n = Number(body.taxRate);
    if (Number.isNaN(n)) errors.push('taxRate must be a number.');
    else if (n < 0 || n > 100) errors.push('taxRate must be between 0 and 100.');
  }
  if (body.peakMultiplier !== undefined) {
    const n = Number(body.peakMultiplier);
    if (Number.isNaN(n)) errors.push('peakMultiplier must be a number.');
    else if (n < 1) errors.push('peakMultiplier must be at least 1.');
  }
  if (body.rules !== undefined && !Array.isArray(body.rules)) {
    errors.push('rules must be an array.');
  }
  if (Array.isArray(body.rules)) {
    for (const rule of body.rules) {
      if (!rule?.name || !String(rule.name).trim()) {
        errors.push('Each pricing rule must have a name.');
        break;
      }
      if (rule.value !== undefined && Number.isNaN(Number(rule.value))) {
        errors.push('Rule values must be numeric.');
        break;
      }
      if (rule.value !== undefined && Number(rule.value) < 0) {
        errors.push('Rule values cannot be negative.');
        break;
      }
    }
  }
  if (Array.isArray(body.roleDiscounts)) {
    for (const item of body.roleDiscounts) {
      const pct = Number(item?.discount);
      if (item?.role && (Number.isNaN(pct) || pct < 0 || pct > 100)) {
        errors.push('Role discount percentages must be between 0 and 100.');
        break;
      }
    }
  }
  return errors;
}

/* GET /api/pricing-rules/meta — booking systems / contexts for admin UI */
router.get('/meta', authenticate, authorize('admin'), async (req, res) => {
  const resourceTypes = await db.prepare('SELECT id, name FROM resource_types ORDER BY name').all();
  const pricingRows = await db.prepare('SELECT DISTINCT context FROM pricing_rules ORDER BY context').all();
  const existingContexts = new Set(pricingRows.map((row) => row.context));

  const contexts = [
    { label: 'General Base Pricing', value: 'general' },
    ...resourceTypes.map((type) => ({
      label: type.name,
      value: pricingContextKey(type.name),
    })),
  ];

  for (const context of existingContexts) {
    if (context === 'general') continue;
    if (!contexts.some((item) => item.value === context)) {
      contexts.push({ label: context, value: context });
    }
  }

  res.json({ contexts, resourceTypes });
});

/* GET /api/pricing-rules/resources — pricing snapshot for browse / booking */
router.get('/resources', authenticate, async (req, res) => {
  const resourceType = req.query.resourceType || req.query.type || '';
  const resourceId = req.query.resourceId ? Number(req.query.resourceId) : null;

  let type = String(resourceType || '').trim();
  if (!type && resourceId) {
    const row = await db.prepare('SELECT type FROM resources WHERE id = ?').get(resourceId);
    type = row?.type || '';
  }

  const pricing = await loadMergedPricing(type);
  res.json({ pricing, resourceType: type, context: pricingContextKey(type) });
});

/* POST /api/pricing-rules/calculate — authoritative price preview */
router.post('/calculate', authenticate, async (req, res) => {
  const {
    resourceType = '',
    resourceId = null,
    date = '',
    startTime = '',
    endTime = '',
    addOnIds = [],
    pricingOverride = null,
    simulationUserRole = '',
  } = req.body || {};

  let type = String(resourceType || '').trim();
  if (!type && resourceId) {
    const row = await db.prepare('SELECT type FROM resources WHERE id = ?').get(Number(resourceId));
    type = row?.type || '';
  }

  const userRole = String(simulationUserRole || req.user.role || 'user').trim();

  let pricing;
  if (pricingOverride && typeof pricingOverride === 'object') {
    const general = pricingOverride.general && typeof pricingOverride.general === 'object'
      ? pricingOverride.general
      : parseJsonColumn((await db.prepare('SELECT data FROM pricing_rules WHERE context = ?').get('general'))?.data);
    const slug = pricingContextKey(type);
    let specific = {};
    if (pricingOverride.context && typeof pricingOverride.context === 'object') {
      specific = pricingOverride.context;
    } else if (slug && pricingOverride[slug] && typeof pricingOverride[slug] === 'object') {
      specific = pricingOverride[slug];
    } else if (slug && slug !== 'general') {
      specific = parseJsonColumn(
        (await db.prepare('SELECT data FROM pricing_rules WHERE context = ?').get(slug))?.data,
      );
    }
    const settingsCurrency = await getSettingsCurrencyCode(db);
    pricing = mergePricingConfigs(general, specific, settingsCurrency);
  } else {
    pricing = await loadMergedPricing(type);
  }

  const breakdown = calculateBookingPrice({
    pricing,
    date,
    startTime,
    endTime,
    addOnIds: Array.isArray(addOnIds) ? addOnIds : [],
    userRole,
  });

  res.json({ breakdown });
});

/* GET /api/pricing-rules/:context — full config for the Pricing Rules page */
router.get('/:context', authenticate, authorize('admin'), async (req, res) => {
  const context = req.params.context || 'general';
  const rows = await db.prepare('SELECT * FROM pricing_rules ORDER BY id').all();
  const pricing = {};
  for (const row of rows) pricing[row.context] = parseJsonColumn(row.data);
  res.json({ context, pricing });
});

/* PUT /api/pricing-rules/:context */
router.put('/:context', authenticate, authorize('admin'), async (req, res) => {
  const context = String(req.params.context || '').trim();
  if (!context) {
    return res.status(400).json({ message: 'Pricing context is required.' });
  }

  const body = req.body || {};
  const errors = validatePricingPayload(body);
  if (errors.length) {
    return res.status(400).json({ message: errors.join(' ') });
  }

  const existing = await db.prepare('SELECT * FROM pricing_rules WHERE context = ?').get(context);
  if (existing) {
    await db
      .prepare('UPDATE pricing_rules SET data = ?, updated_at = CURRENT_TIMESTAMP WHERE context = ?')
      .run(JSON.stringify(body), context);
  } else {
    await db.prepare('INSERT INTO pricing_rules (context, data) VALUES (?, ?)').run(context, JSON.stringify(body));
  }

  const row = await db.prepare('SELECT * FROM pricing_rules WHERE context = ?').get(context);
  res.json({ context, pricing: parseJsonColumn(row?.data) });
});

export default router;
