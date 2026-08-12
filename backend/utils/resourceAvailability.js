/** Active booking statuses that occupy a resource. */
export const OCCUPYING_STATUSES = new Set(['Pending', 'Confirmed']);

/**
 * Parse HH:mm or h:mm AM/PM into minutes from midnight.
 * Returns null when the value cannot be parsed.
 */
export function timeToMinutes(value) {
  if (value == null || value === '') return null;
  const raw = String(value).trim();
  const match24 = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const hours = Number(match24[1]);
    const minutes = Number(match24[2]);
    if (hours > 23 || minutes > 59) return null;
    return hours * 60 + minutes;
  }
  const match12 = raw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let hours = Number(match12[1]);
    const minutes = Number(match12[2]);
    const meridiem = match12[3].toUpperCase();
    if (hours < 1 || hours > 12 || minutes > 59) return null;
    if (meridiem === 'PM' && hours < 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }
  return null;
}

export function normalizeDate(value) {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

export function hoursBetween(startTime, endTime) {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  if (start == null || end == null || end <= start) return 0;
  return (end - start) / 60;
}

/** True when [startA, endA) overlaps [startB, endB). */
export function timesOverlap(startA, endA, startB, endB) {
  const a0 = timeToMinutes(startA);
  const a1 = timeToMinutes(endA);
  const b0 = timeToMinutes(startB);
  const b1 = timeToMinutes(endB);
  if (a0 == null || a1 == null || b0 == null || b1 == null) {
    // If times are missing, treat same-date active bookings as conflicting.
    return true;
  }
  return a0 < b1 && a1 > b0;
}

export function isOccupyingStatus(status) {
  return OCCUPYING_STATUSES.has(String(status || ''));
}

/**
 * Whether a booking still occupies the resource relative to "now".
 * Completed / Cancelled never occupy. Past reservation windows do not occupy.
 */
export function bookingStillActive(booking, now = new Date()) {
  if (!isOccupyingStatus(booking.status)) return false;
  const date = normalizeDate(booking.date);
  if (!date) return false;

  const today = now.toISOString().slice(0, 10);
  if (date > today) return true;
  if (date < today) return false;

  const endMin = timeToMinutes(booking.end_time || booking.endTime);
  if (endMin == null) return true;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  return endMin > nowMin;
}

/**
 * Does this booking conflict with a requested date/time window?
 * - date only: any occupying booking on that date
 * - date + times: occupying booking on that date with overlapping times
 * - no date: any still-active occupying booking
 */
export function bookingConflictsWithWindow(booking, { date, startTime, endTime } = {}, now = new Date()) {
  if (!isOccupyingStatus(booking.status)) return false;
  const bookingDate = normalizeDate(booking.date);

  if (!date) {
    return bookingStillActive(booking, now);
  }

  if (bookingDate !== normalizeDate(date)) return false;

  if (!startTime || !endTime) return true;

  return timesOverlap(
    booking.start_time || booking.startTime,
    booking.end_time || booking.endTime,
    startTime,
    endTime,
  );
}

/**
 * Compute effective availability for a resource row + its bookings.
 * `inService` is the admin maintenance flag (DB `available` column).
 */
export function computeResourceAvailability(resource, bookings = [], window = {}, now = new Date()) {
  const inService = !!resource.available;
  const conflicting = bookings.filter((b) => bookingConflictsWithWindow(b, window, now));
  const isBooked = conflicting.length > 0;
  const available = inService && !isBooked;

  let availabilityStatus = 'available';
  if (!inService) availabilityStatus = 'maintenance';
  else if (isBooked) availabilityStatus = 'booked';

  const next = conflicting[0] || null;

  return {
    inService,
    isBooked,
    available,
    availabilityStatus,
    activeBookingId: next ? next.booking_code || next.id || null : null,
    activeBookingStatus: next ? next.status : null,
  };
}
