import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateBookingPrice, mergePricingConfigs } from '../utils/pricingCalculator.js';

test('general merge prefers baseRate when context has no hourly rate', () => {
  const pricing = mergePricingConfigs(
    { baseRate: 99.17, currency: 'INR', applyTax: true, taxRate: 18, rules: [] },
    {},
    'INR',
  );
  assert.equal(pricing.hourlyRate, 99.17);
});

test('weekday percent rule with "% Base" modifier applies percent not flat INR', () => {
  const pricing = mergePricingConfigs(
    {
      baseRate: 99.17,
      currency: 'INR',
      applyTax: true,
      taxRate: 18,
      taxLabel: 'GST Tax',
      rules: [
        {
          name: 'Weekday Discount',
          modifier: '-21% Base',
          modifierType: 'percent',
          value: 21,
          active: true,
          conditionType: 'day_of_week',
          peakDays: 'Mon - Fri',
          direction: 'discount',
        },
      ],
    },
    { hourlyRate: 99.17 },
    'INR',
  );

  const breakdown = calculateBookingPrice({
    pricing,
    date: '2026-08-12',
    startTime: '10:00',
    endTime: '12:00',
    userRole: 'user',
  });

  assert.equal(breakdown.hourlyRate, 99.17);
  assert.equal(breakdown.lineItems[0].amount, 198.34);
  const discount = breakdown.lineItems.find((item) => item.description === 'Weekday Discount');
  assert.ok(discount);
  assert.equal(discount.calculation, '-21% of base');
  assert.equal(Number(discount.amount.toFixed(4)), -41.6514);
  assert.notEqual(discount.amount, -21);
});

test('context hourly rate does not leak into general-only override shape', () => {
  const pricing = mergePricingConfigs(
    { baseRate: 99.17, currency: 'INR', rules: [], applyTax: false, taxRate: 0, hourlyRate: 99.17 },
    {},
    'INR',
  );
  const breakdown = calculateBookingPrice({
    pricing,
    date: '2026-08-12',
    startTime: '10:00',
    endTime: '12:00',
  });
  assert.equal(breakdown.lineItems[0].amount, 198.34);
});
