import { currencySymbol, parseCurrencyCode } from './currency.js';

/**
 * USD value of 1 unit of each currency (offline fallback).
 * Used when live FX APIs are unreachable.
 */
export const FALLBACK_RATES_TO_USD = {
  USD: 1,
  EUR: 1.08,
  GBP: 1.27,
  INR: 0.012,
};

async function fetchJson(url, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Load USD-relative rates for the given currency codes.
 * Tries multiple public FX endpoints, then falls back to static rates.
 */
export async function loadUsdRates(codes = ['USD', 'EUR', 'GBP', 'INR']) {
  const unique = [...new Set(codes.map((c) => String(c || '').toUpperCase()).filter(Boolean))];
  const rates = { ...FALLBACK_RATES_TO_USD };
  let source = 'fallback';

  // 1) Frankfurter (ECB) — rates are foreign units per 1 USD
  try {
    const others = unique.filter((c) => c !== 'USD');
    if (others.length) {
      const data = await fetchJson(
        `https://api.frankfurter.app/latest?from=USD&to=${others.join(',')}`,
      );
      for (const [code, perUsd] of Object.entries(data.rates || {})) {
        const n = Number(perUsd);
        if (Number.isFinite(n) && n > 0) rates[code] = 1 / n;
      }
      rates.USD = 1;
      source = 'frankfurter';
      return { rates, source };
    }
  } catch {
    // continue
  }

  // 2) open.er-api.com — rates are foreign units per 1 USD
  try {
    const data = await fetchJson('https://open.er-api.com/v6/latest/USD');
    if (data?.result === 'success' && data.rates) {
      for (const code of unique) {
        const perUsd = Number(data.rates[code]);
        if (code === 'USD') rates.USD = 1;
        else if (Number.isFinite(perUsd) && perUsd > 0) rates[code] = 1 / perUsd;
      }
      source = 'open.er-api';
      return { rates, source };
    }
  } catch {
    // continue
  }

  return { rates, source };
}

export function convertAmount(amount, fromCode, toCode, ratesToUsd = FALLBACK_RATES_TO_USD) {
  const value = Number(amount);
  if (!Number.isFinite(value)) return amount;
  const from = String(fromCode || 'USD').toUpperCase();
  const to = String(toCode || 'USD').toUpperCase();
  if (from === to) return roundMoney(value);

  const fromRate = Number(ratesToUsd[from]);
  const toRate = Number(ratesToUsd[to]);
  if (!Number.isFinite(fromRate) || !Number.isFinite(toRate) || fromRate <= 0 || toRate <= 0) {
    return roundMoney(value);
  }

  // value_from * (USD per from) / (USD per to) = value_to
  return roundMoney((value * fromRate) / toRate);
}

export function roundMoney(value, digits = 2) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  const factor = 10 ** digits;
  return Math.round(n * factor) / factor;
}

function isPercentRule(rule) {
  const modifierText = String(rule?.modifier || '').toLowerCase();
  const modifierType = String(rule?.modifierType || '').toLowerCase();
  return (
    modifierType.includes('percent') ||
    modifierText.includes('%') ||
    String(rule?.type || '').toLowerCase() === 'percentage'
  );
}

function convertFixedModifierDisplay(rule, convertedValue, toCode) {
  if (isPercentRule(rule)) return rule.modifier;
  const symbol = currencySymbol(toCode).trim();
  const sign =
    String(rule.modifier || '').trim().startsWith('-') || /discount/i.test(rule.name || '')
      ? '-'
      : '+';
  return `${sign}${symbol}${Number(convertedValue).toFixed(2)}`;
}

function hasNumericMoney(value) {
  if (value === undefined || value === null || value === '') return false;
  return Number.isFinite(Number(value));
}

/** Convert monetary fields inside one pricing_rules.data object. */
export function convertPricingData(data, fromCode, toCode, ratesToUsd) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return data;
  const next = { ...data, currency: toCode };

  for (const key of ['baseRate', 'hourlyRate']) {
    if (hasNumericMoney(next[key])) {
      next[key] = convertAmount(next[key], fromCode, toCode, ratesToUsd);
    }
  }

  if (Array.isArray(next.addOns)) {
    next.addOns = next.addOns.map((item) => {
      if (!item || typeof item !== 'object') return item;
      if (!hasNumericMoney(item.amount)) return item;
      return {
        ...item,
        amount: convertAmount(item.amount, fromCode, toCode, ratesToUsd),
      };
    });
  }

  if (Array.isArray(next.rules)) {
    next.rules = next.rules.map((rule) => {
      if (!rule || typeof rule !== 'object' || isPercentRule(rule)) return rule;
      const raw = rule.value ?? rule.modifierValue;
      if (!hasNumericMoney(raw)) {
        const match = String(rule.modifier || '').match(/(-?\d+(?:\.\d+)?)/);
        if (!match) return rule;
        const converted = convertAmount(match[1], fromCode, toCode, ratesToUsd);
        return {
          ...rule,
          value: converted,
          modifier: convertFixedModifierDisplay(rule, converted, toCode),
        };
      }
      const converted = convertAmount(raw, fromCode, toCode, ratesToUsd);
      return {
        ...rule,
        value: converted,
        ...(rule.modifierValue !== undefined ? { modifierValue: converted } : {}),
        modifier: convertFixedModifierDisplay({ ...rule, value: converted }, converted, toCode),
      };
    });
  }

  return next;
}

function convertPricingSnapshot(snapshot, fromCode, toCode, ratesToUsd) {
  if (!snapshot || typeof snapshot !== 'object') return snapshot;
  const next = { ...snapshot, currency: toCode };

  for (const key of ['total', 'subtotal', 'hourlyRate', 'tax', 'base']) {
    if (hasNumericMoney(next[key])) {
      next[key] = convertAmount(next[key], fromCode, toCode, ratesToUsd);
    }
  }

  if (Array.isArray(next.lineItems)) {
    next.lineItems = next.lineItems.map((item) => {
      if (!item || typeof item !== 'object') return item;
      if (!hasNumericMoney(item.amount)) return item;
      return {
        ...item,
        amount: convertAmount(item.amount, fromCode, toCode, ratesToUsd),
      };
    });
  }

  return next;
}

function parseJson(value) {
  if (value == null) return null;
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

/**
 * Convert all stored monetary values from one system currency to another.
 */
export async function convertStoredCurrencyValues(db, fromCode, toCode) {
  const from = String(fromCode || '').toUpperCase();
  const to = String(toCode || '').toUpperCase();
  if (!from || !to || from === to) {
    return { pricingUpdated: 0, bookingsUpdated: 0, rate: 1, source: 'none', from, to };
  }

  const { rates, source } = await loadUsdRates([from, to, 'USD', 'EUR', 'GBP', 'INR']);
  const sample = convertAmount(1, from, to, rates);

  const pricingRows = await db.prepare('SELECT context, data FROM pricing_rules').all();
  let pricingUpdated = 0;
  for (const row of pricingRows) {
    const data = parseJson(row.data) || {};
    // Prefer the row's own currency when present to avoid double-converting.
    const rowFrom = parseCurrencyCode(data.currency) || from;
    const converted = convertPricingData(data, rowFrom, to, rates);
    await db
      .prepare('UPDATE pricing_rules SET data = ?, updated_at = CURRENT_TIMESTAMP WHERE context = ?')
      .run(JSON.stringify(converted), row.context);
    pricingUpdated += 1;
  }

  const bookings = await db.prepare('SELECT id, amount, pricing_snapshot FROM bookings').all();
  let bookingsUpdated = 0;
  for (const booking of bookings) {
    const snapshot = parseJson(booking.pricing_snapshot);
    const amountFrom = parseCurrencyCode(snapshot?.currency) || from;

    let nextAmount = booking.amount;
    const numeric = Number(String(booking.amount || '').replace(/[^\d.-]/g, ''));
    if (Number.isFinite(numeric)) {
      nextAmount = convertAmount(numeric, amountFrom, to, rates).toFixed(2);
    }

    const nextSnapshot = snapshot
      ? convertPricingSnapshot(snapshot, amountFrom, to, rates)
      : snapshot;

    await db
      .prepare('UPDATE bookings SET amount = ?, pricing_snapshot = ? WHERE id = ?')
      .run(
        nextAmount,
        nextSnapshot == null ? booking.pricing_snapshot : JSON.stringify(nextSnapshot),
        booking.id,
      );
    bookingsUpdated += 1;
  }

  return {
    pricingUpdated,
    bookingsUpdated,
    rate: sample,
    source,
    from,
    to,
  };
}
