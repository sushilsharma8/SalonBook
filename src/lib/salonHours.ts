export const WEEKDAYS = [
  { dayOfWeek: 0, label: 'Sunday', short: 'Sun' },
  { dayOfWeek: 1, label: 'Monday', short: 'Mon' },
  { dayOfWeek: 2, label: 'Tuesday', short: 'Tue' },
  { dayOfWeek: 3, label: 'Wednesday', short: 'Wed' },
  { dayOfWeek: 4, label: 'Thursday', short: 'Thu' },
  { dayOfWeek: 5, label: 'Friday', short: 'Fri' },
  { dayOfWeek: 6, label: 'Saturday', short: 'Sat' },
] as const;

export type SalonDayHours = {
  dayOfWeek: number;
  isOpen: boolean;
  startTime: string;
  endTime: string;
};

export function buildDefaultWeeklyHours(openTime: string, closeTime: string): SalonDayHours[] {
  return WEEKDAYS.map(({ dayOfWeek }) => ({
    dayOfWeek,
    isOpen: true,
    startTime: openTime,
    endTime: closeTime,
  }));
}

export function normalizeWeeklyHoursFromApi(
  raw: unknown,
  openTime: string,
  closeTime: string
): SalonDayHours[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return buildDefaultWeeklyHours(openTime, closeTime);
  }

  const byDay = new Map<number, SalonDayHours>();
  for (const entry of raw) {
    const dayOfWeek = Number((entry as { dayOfWeek?: unknown }).dayOfWeek);
    if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) continue;
    const isOpen = Boolean((entry as { isOpen?: unknown }).isOpen);
    const startTime = String((entry as { startTime?: unknown }).startTime || openTime);
    const endTime = String((entry as { endTime?: unknown }).endTime || closeTime);
    byDay.set(dayOfWeek, { dayOfWeek, isOpen, startTime, endTime });
  }

  return WEEKDAYS.map(({ dayOfWeek }) =>
    byDay.get(dayOfWeek) ?? { dayOfWeek, isOpen: true, startTime: openTime, endTime: closeTime }
  );
}

export function isSalonOpenOnDate(hours: SalonDayHours[], date: Date): boolean {
  const day = date.getDay();
  const row = hours.find((h) => h.dayOfWeek === day);
  return row?.isOpen ?? true;
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/** Whether the salon is open right now, using weekly hours when available. */
export function isSalonOpenNow(
  hours: SalonDayHours[] | null | undefined,
  fallbackOpen: string,
  fallbackClose: string,
  now: Date = new Date(),
): boolean {
  const normalized = hours?.length
    ? hours
    : buildDefaultWeeklyHours(fallbackOpen, fallbackClose);

  const day = now.getDay();
  const row = normalized.find((h) => h.dayOfWeek === day);
  if (!row?.isOpen) return false;

  const currentMins = now.getHours() * 60 + now.getMinutes();
  const start = timeToMinutes(row.startTime);
  const end = timeToMinutes(row.endTime);
  return currentMins >= start && currentMins < end;
}
