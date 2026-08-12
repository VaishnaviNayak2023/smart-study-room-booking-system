import db from '../db.js';

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

export function pricingContextKey(name) {
  if (!name || String(name).trim().toLowerCase() === 'general') return 'general';
  return String(name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function loadContextData(context) {
  const row = await db.prepare('SELECT data FROM pricing_rules WHERE context = ? ORDER BY id DESC LIMIT 1').get(context);
  return parseJsonColumn(row?.data);
}

export async function loadMergedPricing(resourceType = '') {
  const general = await loadContextData('general');
  const slug = pricingContextKey(resourceType);
  let specific = {};

  if (slug && slug !== 'general') {
    specific = await loadContextData(slug);
  }

  const hourlyRate =
    Number(specific.hourlyRate) ||
    Number(general.baseRate) ||
    Number(general.hourlyRate) ||
    0;

  return {
    ...general,
    ...specific,
    hourlyRate,
    currency: specific.currency || general.currency || 'USD',
    freeFirstHour: specific.freeFirstHour ?? general.freeFirstHour ?? false,
    applyTax: general.applyTax ?? true,
    taxRate: Number(general.taxRate ?? general.gstRate ?? 0),
    taxLabel: general.taxLabel || 'Tax',
    addOns: Array.isArray(specific.addOns) ? specific.addOns : Array.isArray(general.addOns) ? general.addOns : [],
    rules: [
      ...(Array.isArray(general.rules) ? general.rules : []),
      ...(Array.isArray(specific.rules) ? specific.rules : []),
    ],
    peakStart: specific.peakStart || general.peakStart || '',
    peakEnd: specific.peakEnd || general.peakEnd || '',
    peakDays: specific.peakDays || general.peakDays || '',
    peakMultiplier: Number(specific.peakMultiplier ?? general.peakMultiplier ?? 1),
    studentDiscount: Number(specific.studentDiscount ?? general.studentDiscount ?? 0),
    roleDiscounts: Array.isArray(specific.roleDiscounts) ? specific.roleDiscounts : [],
  };
}

function timeToMinutes(value) {
  if (!value) return null;
  const [hours = NaN, minutes = NaN] = String(value).split(':').map(Number);
  return Number.isInteger(hours) && Number.isInteger(minutes) ? hours * 60 + minutes : null;
}

function durationHoursFromTimes(startTime, endTime) {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  if (start === null || end === null || end <= start) return 0;
  return (end - start) / 60;
}

function isWeekend(dateStr) {
  const day = new Date(`${dateStr}T12:00:00`).getDay();
  return day === 0 || day === 6;
}

function isPeakWindow(pricing, date, startTime) {
  const start = timeToMinutes(startTime);
  const peakStart = timeToMinutes(pricing.peakStart);
  const peakEnd = timeToMinutes(pricing.peakEnd);
  if (start === null || peakStart === null || peakEnd === null) return false;

  const days = String(pricing.peakDays || '').toLowerCase();
  const weekend = isWeekend(date);
  if (days.includes('weekend') && !weekend) return false;
  if (days.includes('mon') && weekend) return false;

  return start >= peakStart && start < peakEnd;
}

function applyModifier(base, rule) {
  let value = Number(rule.value ?? rule.modifierValue);
  if (!Number.isFinite(value)) {
    const match = String(rule.modifier || '').match(/(-?\d+(?:\.\d+)?)\s*%/);
    value = match ? Number(match[1]) : 0;
  }

  const modifierText = String(rule.modifier || '').toLowerCase();
  const isPercent =
    rule.modifierType?.includes('percent') ||
    modifierText.includes('%') ||
    rule.type === 'percentage';

  if (isPercent) {
    const amount = base * (value / 100);
    return {
      amount,
      label: rule.name || 'Modifier',
      calculation: `${value}% of base`,
    };
  }

  return {
    amount: value,
    label: rule.name || 'Modifier',
    calculation: 'Flat fee',
  };
}

export function calculateBookingPrice({
  pricing,
  startTime = '',
  endTime = '',
  durationHours = null,
  date = '',
  addOnIds = [],
  userRole = 'user',
}) {
  const hours =
    durationHours !== null && durationHours !== undefined
      ? Number(durationHours)
      : durationHoursFromTimes(startTime, endTime);

  const hourlyRate = Number(pricing.hourlyRate) || 0;
  const billableHours = Math.max(hours - (pricing.freeFirstHour ? 1 : 0), 0);
  let base = billableHours * hourlyRate;

  const lineItems = [
    {
      description: 'Base Rate',
      calculation: `${billableHours} hrs @ $${hourlyRate.toFixed(2)}/hr`,
      amount: base,
      type: 'base',
    },
  ];

  if (isPeakWindow(pricing, date, startTime) && pricing.peakMultiplier > 1) {
    const surcharge = base * (pricing.peakMultiplier - 1);
    base += surcharge;
    lineItems.push({
      description: 'Peak Hour Surcharge',
      calculation: `${pricing.peakMultiplier}x multiplier`,
      amount: surcharge,
      type: 'surcharge',
    });
  }

  const activeRules = (pricing.rules || []).filter((rule) => rule.active !== false);
  for (const rule of activeRules) {
    const mod = applyModifier(base, rule);
    if (mod.amount !== 0) {
      base += mod.amount;
      lineItems.push({
        description: mod.label,
        calculation: mod.calculation,
        amount: mod.amount,
        type: mod.amount < 0 ? 'discount' : 'surcharge',
      });
    }
  }

  const roleDiscount = (pricing.roleDiscounts || []).find(
    (item) => String(item.role || '').toLowerCase().includes(userRole),
  );
  if (roleDiscount) {
    const pct = Number(roleDiscount.discount) / 100;
    const discount = base * pct;
    base -= discount;
    lineItems.push({
      description: `${roleDiscount.role} Discount`,
      calculation: `${roleDiscount.discount}% applied`,
      amount: -discount,
      type: 'discount',
    });
  } else if (pricing.studentDiscount && userRole === 'user') {
    const discount = base * Number(pricing.studentDiscount);
    if (discount > 0) {
      base -= discount;
      lineItems.push({
        description: 'Member Discount',
        calculation: `${(Number(pricing.studentDiscount) * 100).toFixed(0)}% applied`,
        amount: -discount,
        type: 'discount',
      });
    }
  }

  const addOnTotal = (pricing.addOns || [])
    .filter((item) => addOnIds.includes(item.id))
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  if (addOnTotal > 0) {
    base += addOnTotal;
    lineItems.push({
      description: 'Add-ons',
      calculation: `${addOnIds.length} selected`,
      amount: addOnTotal,
      type: 'addon',
    });
  }

  const subtotal = base;
  const taxRate = pricing.applyTax === false ? 0 : Number(pricing.taxRate) || 0;
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;

  if (tax > 0) {
    lineItems.push({
      description: pricing.taxLabel || 'Tax',
      calculation: `${taxRate}%`,
      amount: tax,
      type: 'tax',
    });
  }

  return {
    hours,
    billableHours,
    hourlyRate,
    lineItems,
    subtotal,
    tax,
    taxRate,
    total,
    amount: total.toFixed(2),
    currency: pricing.currency || 'USD',
  };
}

export async function calculateBookingPriceForResource({
  resourceType,
  resourceId = null,
  date,
  startTime,
  endTime,
  addOnIds = [],
  userRole = 'user',
}) {
  let type = resourceType;
  if (!type && resourceId) {
    const row = await db.prepare('SELECT type FROM resources WHERE id = ?').get(resourceId);
    type = row?.type || '';
  }
  const pricing = await loadMergedPricing(type);
  return calculateBookingPrice({
    pricing,
    date,
    startTime,
    endTime,
    addOnIds,
    userRole,
  });
}
