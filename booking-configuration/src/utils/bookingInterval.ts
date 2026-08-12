/** Shown whenever a chosen window overlaps an occupied booking slot. */
export const BOOKED_INTERVAL_MESSAGE =
  'Booked for that interval, choose another interval';

export type BusyInterval = {
  date?: string;
  startTime: string;
  endTime: string;
  bookingId?: string | null;
  isMine?: boolean;
};

export function timeToMinutes(value?: string | null): number | null {
  if (value == null || value === '') return null;
  const match = String(value).trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours > 23 || minutes > 59) {
    return null;
  }
  return hours * 60 + minutes;
}

/** True when [startA, endA) overlaps [startB, endB). */
export function timesOverlap(startA: string, endA: string, startB: string, endB: string) {
  const a0 = timeToMinutes(startA);
  const a1 = timeToMinutes(endA);
  const b0 = timeToMinutes(startB);
  const b1 = timeToMinutes(endB);
  if (a0 == null || a1 == null || b0 == null || b1 == null) return true;
  return a0 < b1 && a1 > b0;
}

/**
 * Returns true when the requested window overlaps any busy interval
 * other than the booking being edited (`excludeBookingId`).
 */
export function conflictsWithBusyIntervals(
  date: string,
  startTime: string,
  endTime: string,
  intervals: BusyInterval[],
  excludeBookingId?: string | null,
) {
  const startMin = timeToMinutes(startTime);
  const endMin = timeToMinutes(endTime);
  if (!date || startMin == null || endMin == null || endMin <= startMin) return false;

  return intervals.some((slot) => {
    if (excludeBookingId && slot.bookingId && String(slot.bookingId) === String(excludeBookingId)) {
      return false;
    }
    if (slot.date && String(slot.date).slice(0, 10) !== String(date).slice(0, 10)) {
      return false;
    }
    return timesOverlap(startTime, endTime, slot.startTime, slot.endTime);
  });
}

export function conflictMessageForSelection(
  date: string,
  startTime: string,
  endTime: string,
  intervals: BusyInterval[],
  excludeBookingId?: string | null,
): string {
  return conflictsWithBusyIntervals(date, startTime, endTime, intervals, excludeBookingId)
    ? BOOKED_INTERVAL_MESSAGE
    : '';
}
