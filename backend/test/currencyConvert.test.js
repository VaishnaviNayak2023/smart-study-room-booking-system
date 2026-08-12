import test from 'node:test';
import assert from 'node:assert/strict';
import {
  convertAmount,
  convertPricingData,
  FALLBACK_RATES_TO_USD,
} from '../utils/currencyConvert.js';

test('convertAmount converts INR to USD using fallback rates', () => {
  const usd = convertAmount(100, 'INR', 'USD', FALLBACK_RATES_TO_USD);
  // 100 INR * 0.012 = 1.2 USD
  assert.equal(usd, 1.2);
});

test('convertAmount is identity for same currency', () => {
  assert.equal(convertAmount(50, 'EUR', 'EUR', FALLBACK_RATES_TO_USD), 50);
});

test('convertPricingData converts rates and fixed rules but not percents', () => {
  const converted = convertPricingData(
    {
      baseRate: 100,
      hourlyRate: 200,
      currency: 'INR',
      addOns: [{ id: 'projector', amount: 50 }],
      rules: [
        { name: 'Student', modifierType: 'percent', value: 10, modifier: '-10%' },
        { name: 'Weekday', modifierType: 'Percent', value: 21, modifier: '-21% Base' },
        { name: 'Flat fee', modifierType: 'fixed', value: 20, modifier: '+Rs.20.00' },
      ],
      peakMultiplier: 1.5,
      taxRate: 18,
    },
    'INR',
    'USD',
    FALLBACK_RATES_TO_USD,
  );

  assert.equal(converted.currency, 'USD');
  assert.equal(converted.baseRate, 1.2);
  assert.equal(converted.hourlyRate, 2.4);
  assert.equal(converted.addOns[0].amount, 0.6);
  assert.equal(converted.rules[0].value, 10);
  assert.equal(converted.rules[1].value, 21);
  assert.equal(converted.rules[1].modifier, '-21% Base');
  assert.equal(converted.rules[2].value, 0.24);
  assert.equal(converted.peakMultiplier, 1.5);
  assert.equal(converted.taxRate, 18);
});
