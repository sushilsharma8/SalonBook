import { format } from 'date-fns';

/**
 * SalonBook is operated in India: all salon hours, slots, and bookings use
 * local wall-clock time (IST for users in India). Times are persisted as ISO
 * strings with that wall-clock HH:mm copied into the UTC fields
 * (e.g. selecting 11:00 becomes "2025-06-10T11:00:00.000Z").
 *
 * Always use these helpers instead of `new Date(...)` + `format()` so display
 * and comparisons stay on the same wall-clock calendar.
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

/** Current local wall-clock instant (matches how users pick slot times in India). */
export function nowBookingTimeMs(): number {
  const now = new Date();
  return Date.UTC(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
  );
}

export function isBookingUpcoming(value: string | Date): boolean {
  return bookingTimeMs(value) > nowBookingTimeMs();
}

export function isBookingPast(value: string | Date): boolean {
  return bookingTimeMs(value) <= nowBookingTimeMs();
}

/** PENDING bookings sellers can still accept or reject. */
export function isPendingBookingActionable(booking: {
  startTime: string | Date;
  status: string;
}): boolean {
  return booking.status === 'PENDING' && isBookingUpcoming(booking.startTime);
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
