import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bookingStillActive,
  computeResourceAvailability,
  timesOverlap,
} from '../utils/resourceAvailability.js';

test('timesOverlap detects overlapping and adjacent ranges', () => {
  assert.equal(timesOverlap('09:00', '10:00', '09:30', '10:30'), true);
  assert.equal(timesOverlap('09:00', '10:00', '10:00', '11:00'), false);
  assert.equal(timesOverlap('09:00', '10:00', '08:00', '09:00'), false);
});

test('bookingStillActive frees the resource after end time', () => {
  const now = new Date('2026-08-12T10:00:00');
  const active = {
    status: 'Confirmed',
    date: '2026-08-12',
    start_time: '09:00',
    end_time: '10:30',
  };
  const ended = {
    status: 'Confirmed',
    date: '2026-08-12',
    start_time: '08:00',
    end_time: '09:30',
  };
  assert.equal(bookingStillActive(active, now), true);
  assert.equal(bookingStillActive(ended, now), false);
});

test('date-only availability allows booking free gaps and shows remaining intervals', () => {
  const resource = { available: 1 };
  const bookings = [
    {
      status: 'Confirmed',
      date: '2026-08-12',
      start_time: '09:00',
      end_time: '10:00',
      user_id: 2,
      booking_code: 'B1',
    },
    {
      status: 'Confirmed',
      date: '2026-08-12',
      start_time: '14:00',
      end_time: '15:00',
      user_id: 3,
      booking_code: 'B2',
    },
  ];
  const now = new Date('2026-08-12T11:00:00');
  const result = computeResourceAvailability(resource, bookings, { date: '2026-08-12' }, now, 1);

  assert.equal(result.canBook, true);
  assert.equal(result.availabilityStatus, 'available');
  assert.equal(result.unavailableIntervals.length, 1);
  assert.equal(result.unavailableIntervals[0].startTime, '14:00');
});

test('explicit time window blocks overlapping slots only', () => {
  const resource = { available: 1 };
  const bookings = [
    {
      status: 'Confirmed',
      date: '2026-08-12',
      start_time: '09:00',
      end_time: '10:00',
      user_id: 2,
      booking_code: 'B1',
    },
  ];
  const now = new Date('2026-08-12T08:00:00');
  const blocked = computeResourceAvailability(
    resource,
    bookings,
    { date: '2026-08-12', startTime: '09:30', endTime: '10:30' },
    now,
    1,
  );
  const free = computeResourceAvailability(
    resource,
    bookings,
    { date: '2026-08-12', startTime: '10:00', endTime: '11:00' },
    now,
    1,
  );

  assert.equal(blocked.canBook, false);
  assert.equal(free.canBook, true);
});

test('no-date status frees after interval ends and books again for next interval', () => {
  const resource = { available: 1 };
  const bookings = [
    {
      status: 'Confirmed',
      date: '2026-08-12',
      start_time: '09:00',
      end_time: '10:00',
      user_id: 2,
      booking_code: 'B1',
    },
    {
      status: 'Confirmed',
      date: '2026-08-12',
      start_time: '14:00',
      end_time: '15:00',
      user_id: 3,
      booking_code: 'B2',
    },
  ];

  const duringFirst = computeResourceAvailability(
    resource,
    bookings,
    {},
    new Date('2026-08-12T09:30:00'),
    1,
  );
  assert.equal(duringFirst.isBooked, true);
  assert.equal(duringFirst.availabilityStatus, 'unavailable');
  assert.equal(duringFirst.unavailableIntervals.length, 2);

  const betweenIntervals = computeResourceAvailability(
    resource,
    bookings,
    {},
    new Date('2026-08-12T11:00:00'),
    1,
  );
  assert.equal(betweenIntervals.isBooked, false);
  assert.equal(betweenIntervals.available, true);
  assert.equal(betweenIntervals.availabilityStatus, 'available');
  assert.equal(betweenIntervals.unavailableIntervals.length, 1);
  assert.equal(betweenIntervals.unavailableIntervals[0].startTime, '14:00');

  const duringNext = computeResourceAvailability(
    resource,
    bookings,
    {},
    new Date('2026-08-12T14:15:00'),
    1,
  );
  assert.equal(duringNext.isBooked, true);
  assert.equal(duringNext.unavailableIntervals.length, 1);
  assert.equal(duringNext.unavailableIntervals[0].startTime, '14:00');
});
