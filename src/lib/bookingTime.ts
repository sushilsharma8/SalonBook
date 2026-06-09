import { format } from 'date-fns';

/**
 * Booking times are stored as ISO strings with wall-clock HH:mm in UTC fields
 * (e.g. selecting 11:00 becomes "2025-06-10T11:00:00.000Z").
 * Always use these helpers instead of `new Date(...)` + local `format()`.
 */

function toDate(value: string | Date): Date {
  return typeof value === 'string' ? new Date(value) : value;
}

/** Wall-clock instant used for comparisons and sorting. */
export function bookingTimeMs(value: string | Date): number {
  const d = toDate(value);
  return Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate(),
    d.getUTCHours(),
    d.getUTCMinutes(),
    d.getUTCSeconds(),
  );
}

export function isBookingUpcoming(value: string | Date): boolean {
  return bookingTimeMs(value) > bookingTimeMs(new Date());
}

export function formatBookingTime(value: string | Date, pattern: string): string {
  const d = toDate(value);
  const wallClock = new Date(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate(),
    d.getUTCHours(),
    d.getUTCMinutes(),
    d.getUTCSeconds(),
  );
  return format(wallClock, pattern);
}

export function buildBookingIso(date: Date, time: string): string {
  const dateStr = format(date, 'yyyy-MM-dd');
  return `${dateStr}T${time}:00.000Z`;
}
