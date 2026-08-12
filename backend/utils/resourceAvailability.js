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
  if (value instanceof Date) return localDateString(value);
  return String(value).slice(0, 10);
}

/** Local calendar date YYYY-MM-DD (avoids UTC off-by-one near midnight). */
export function localDateString(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
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

  const today = localDateString(now);
  if (date > today) return true;
  if (date < today) return false;

  const endMin = timeToMinutes(booking.end_time || booking.endTime);
  if (endMin == null) return true;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  return endMin > nowMin;
}

/** True when "now" falls inside the booking's [start, end) on its date. */
export function bookingOccupiesNow(booking, now = new Date()) {
  if (!isOccupyingStatus(booking.status)) return false;
  const date = normalizeDate(booking.date);
  if (date !== localDateString(now)) return false;

  const startMin = timeToMinutes(booking.start_time || booking.startTime);
  const endMin = timeToMinutes(booking.end_time || booking.endTime);
  if (startMin == null || endMin == null) return bookingStillActive(booking, now);

  const nowMin = now.getHours() * 60 + now.getMinutes();
  return startMin <= nowMin && nowMin < endMin;
}

/**
 * Does this booking conflict with a requested date/time window?
 * - date + times: occupying booking on that date with overlapping times
 * - date only: used for listing intervals (any occupying booking on that date)
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

function toInterval(b, viewerUserId) {
  return {
    date: normalizeDate(b.date),
    startTime: b.start_time || b.startTime || '',
    endTime: b.end_time || b.endTime || '',
    bookingId: b.booking_code || (b.id != null ? String(b.id) : null),
    userId: b.user_id ?? b.userId ?? null,
    isMine: viewerUserId != null && Number(b.user_id ?? b.userId) === Number(viewerUserId),
  };
}

function sortIntervals(intervals) {
  return intervals.sort((a, b) => {
    const dateCmp = String(a.date).localeCompare(String(b.date));
    if (dateCmp !== 0) return dateCmp;
    return String(a.startTime).localeCompare(String(b.startTime));
  });
}

/**
 * Compute effective availability for a resource row + its bookings.
 * `inService` is the admin maintenance flag (DB `available` column).
 * `viewerUserId` personalizes Booked vs Unavailable.
 *
 * Window rules:
 * - date + startTime + endTime → slot conflict check (booking create/edit)
 * - date only → show that day's remaining intervals; status reflects "occupied now"
 *   when the date is today (past slots no longer block; free gaps stay bookable)
 * - no date → any still-active upcoming/ongoing booking
 */
export function computeResourceAvailability(
  resource,
  bookings = [],
  window = {},
  now = new Date(),
  viewerUserId = null,
) {
  const inService = !!resource.available;
  const windowDate = normalizeDate(window.date);
  const hasExplicitTimes = !!(window.startTime && window.endTime);
  const today = localDateString(now);

  let displayBookings;
  let blockingBookings;

  if (hasExplicitTimes && windowDate) {
    blockingBookings = bookings.filter((b) => bookingConflictsWithWindow(b, window, now));
    displayBookings = blockingBookings;
  } else if (windowDate) {
    // Calendar day listing: keep only intervals that have not ended yet.
    displayBookings = bookings.filter((b) => {
      if (!isOccupyingStatus(b.status)) return false;
      if (normalizeDate(b.date) !== windowDate) return false;
      if (windowDate < today) return false;
      if (windowDate > today) return true;
      const endMin = timeToMinutes(b.end_time || b.endTime);
      if (endMin == null) return true;
      const nowMin = now.getHours() * 60 + now.getMinutes();
      return endMin > nowMin;
    });
    // Status / canBook for date-only: currently inside a slot (today), else free to book gaps.
    blockingBookings =
      windowDate === today ? displayBookings.filter((b) => bookingOccupiesNow(b, now)) : [];
  } else {
    displayBookings = bookings.filter((b) => bookingStillActive(b, now));
    blockingBookings = displayBookings;
  }

  const intervals = sortIntervals(displayBookings.map((b) => toInterval(b, viewerUserId)));
  const blockingIntervals = sortIntervals(blockingBookings.map((b) => toInterval(b, viewerUserId)));

  const bookedByCurrentUser = blockingIntervals.some((i) => i.isMine);
  const bookedByOthers = blockingIntervals.some((i) => !i.isMine);
  const isBooked = blockingIntervals.length > 0;

  let availabilityStatus = 'available';
  if (!inService) availabilityStatus = 'maintenance';
  else if (bookedByCurrentUser) availabilityStatus = 'booked';
  else if (bookedByOthers) availabilityStatus = 'unavailable';

  const next = intervals[0] || null;
  // Date-only browse: allow booking as long as the resource is in service.
  // Slot conflicts are enforced when start/end times are provided (and on POST).
  const canBook = hasExplicitTimes
    ? inService && !isBooked
    : inService && (windowDate ? true : !isBooked);

  return {
    inService,
    isBooked,
    bookedByCurrentUser,
    bookedByOthers,
    available: inService && !isBooked,
    canBook,
    availabilityStatus,
    unavailableIntervals: intervals,
    activeBookingId: next ? next.bookingId : null,
    activeBookingStatus: (blockingBookings[0] || displayBookings[0])?.status || null,
  };
}
