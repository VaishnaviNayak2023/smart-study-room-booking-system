export const DEFAULT_CURRENCY = 'INR';

export const CURRENCY_OPTIONS = [
  { label: 'INR (Rs.)', value: 'INR (Rs.)', code: 'INR' },
  { label: 'USD ($)', value: 'USD ($)', code: 'USD' },
  { label: 'EUR (€)', value: 'EUR (€)', code: 'EUR' },
  { label: 'GBP (£)', value: 'GBP (£)', code: 'GBP' },
] as const;

const LABEL_TO_CODE: Record<string, string> = {
  'inr (rs.)': 'INR',
  'inr (₹)': 'INR',
  'usd ($)': 'USD',
  'eur (€)': 'EUR',
  'gbp (£)': 'GBP',
};

export function parseCurrencyCode(value?: string | null): string {
  if (!value) return DEFAULT_CURRENCY;
  const text = String(value).trim();
  if (/^[A-Za-z]{3}$/.test(text)) return text.toUpperCase();
  const fromLabel = LABEL_TO_CODE[text.toLowerCase()];
  if (fromLabel) return fromLabel;
  const match = text.match(/\b([A-Z]{3})\b/i);
  if (match?.[1]) return match[1].toUpperCase();
  if (/₹|rs\.?/i.test(text)) return 'INR';
  return DEFAULT_CURRENCY;
}

export function currencySymbol(code = DEFAULT_CURRENCY): string {
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

/** Format amount using system currency. INR displays as Rs. */
export function formatCurrencyAmount(value: number, code = DEFAULT_CURRENCY): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '—';
  if (code === 'INR') {
    return `Rs. ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: code }).format(amount);
  } catch {
    return `${code} ${amount.toFixed(2)}`;
  }
}

/** Format a stored booking amount string with the active currency. */
export function formatStoredAmount(raw: string | number | undefined, code = DEFAULT_CURRENCY): string {
  if (raw == null || raw === '') return '—';
  const text = String(raw).trim();
  const numeric = Number(text.replace(/[^\d.-]/g, ''));
  if (!Number.isFinite(numeric)) return text;
  return formatCurrencyAmount(numeric, code);
}
