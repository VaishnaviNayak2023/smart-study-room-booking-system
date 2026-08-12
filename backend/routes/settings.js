import { Router } from 'express';
import db from '../db.js';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  clearSettingsCurrencyCache,
  parseCurrencyCode,
} from '../utils/currency.js';
import { convertStoredCurrencyValues } from '../utils/currencyConvert.js';

const router = Router();

function parseSettingsData(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function withCurrencyCode(settings) {
  return {
    ...settings,
    currencyCode: parseCurrencyCode(settings.currency),
  };
}

async function syncGeneralPricingCurrency(currencyCode) {
  const row = await db.prepare('SELECT data FROM pricing_rules WHERE context = ?').get('general');
  const data = parseSettingsData(row?.data);
  data.currency = currencyCode;
  if (row) {
    await db
      .prepare('UPDATE pricing_rules SET data = ?, updated_at = CURRENT_TIMESTAMP WHERE context = ?')
      .run(JSON.stringify(data), 'general');
  } else {
    await db.prepare('INSERT INTO pricing_rules (context, data) VALUES (?, ?)').run(
      'general',
      JSON.stringify({ ...data, currency: currencyCode }),
    );
  }
}

/* GET /api/settings */
router.get('/', authenticate, async (req, res) => {
  const row = await db.prepare('SELECT * FROM settings WHERE id = 1').get();
  res.json({ settings: withCurrencyCode(parseSettingsData(row?.data)) });
});

/* PUT /api/settings */
router.put('/', authenticate, authorize('admin'), async (req, res) => {
  const body = req.body || {};
  const nextCurrencyCode = parseCurrencyCode(body.currency);

  const existing = await db.prepare('SELECT * FROM settings WHERE id = 1').get();
  const previousSettings = parseSettingsData(existing?.data);
  const previousCurrencyCode = parseCurrencyCode(previousSettings.currency);

  if (existing) {
    await db
      .prepare('UPDATE settings SET data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1')
      .run(JSON.stringify(body));
  } else {
    await db.prepare('INSERT INTO settings (id, data) VALUES (1, ?)').run(JSON.stringify(body));
  }

  clearSettingsCurrencyCache();

  let conversion = null;
  if (previousCurrencyCode && nextCurrencyCode && previousCurrencyCode !== nextCurrencyCode) {
    conversion = await convertStoredCurrencyValues(db, previousCurrencyCode, nextCurrencyCode);
  } else {
    await syncGeneralPricingCurrency(nextCurrencyCode);
  }

  const row = await db.prepare('SELECT * FROM settings WHERE id = 1').get();
  res.json({
    settings: withCurrencyCode(parseSettingsData(row?.data)),
    conversion,
  });
});

export default router;
