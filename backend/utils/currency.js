/** Default system currency — Indian Rupees */
export const DEFAULT_CURRENCY = 'INR';

const LABEL_TO_CODE = {
  'inr (rs.)': 'INR',
  'inr (₹)': 'INR',
  'usd ($)': 'USD',
  'eur (€)': 'EUR',
  'gbp (£)': 'GBP',
};

/** Parse ISO code from settings label ("INR (Rs.)") or raw code ("INR"). */
export function parseCurrencyCode(value) {
  if (value == null || value === '') return DEFAULT_CURRENCY;
  const text = String(value).trim();
  if (/^[A-Za-z]{3}$/.test(text)) return text.toUpperCase();
  const fromLabel = LABEL_TO_CODE[text.toLowerCase()];
  if (fromLabel) return fromLabel;
  const match = text.match(/\b([A-Z]{3})\b/i);
  if (match) return match[1].toUpperCase();
  if (/₹|rs\.?/i.test(text)) return 'INR';
  return DEFAULT_CURRENCY;
}

export function currencySymbol(code = DEFAULT_CURRENCY) {
  switch (code) {
    case 'INR':
      return 'Rs.';
    case 'USD':
      return '$';
    case 'EUR':
      return '€';
    case 'GBP':
      return '£';
    default:
      return `${code} `;
  }
}

export function defaultCurrencyLabel(code = DEFAULT_CURRENCY) {
  switch (code) {
    case 'INR':
      return 'INR (Rs.)';
    case 'USD':
      return 'USD ($)';
    case 'EUR':
      return 'EUR (€)';
    case 'GBP':
      return 'GBP (£)';
    default:
      return code;
  }
}

let cachedSettingsCurrency = null;
let cacheAt = 0;

/** Load currency code from settings table (cached ~30s). */
export async function getSettingsCurrencyCode(db) {
  const now = Date.now();
  if (cachedSettingsCurrency && now - cacheAt < 30_000) {
    return cachedSettingsCurrency;
  }
  const row = await db.prepare('SELECT data FROM settings WHERE id = 1').get();
  let data = row?.data;
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      data = {};
    }
  }
  cachedSettingsCurrency = parseCurrencyCode(data?.currency);
  cacheAt = now;
  return cachedSettingsCurrency;
}

export function clearSettingsCurrencyCache() {
  cachedSettingsCurrency = null;
  cacheAt = 0;
}
