/**
 * Helpers for calendar dates in `YYYY-MM-DD` form.
 *
 * Stay dates are calendar days, not instants, so all arithmetic is done in UTC
 * on midnight timestamps. This keeps it free of DST and server time-zone effects.
 */
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 86_400_000;

/** Returns the UTC-midnight timestamp of a valid `YYYY-MM-DD` date, or null. */
export function parseCalendarDate(value: string): number | null {
  const match = ISO_DATE.exec(value);
  if (!match) return null;
  const [, y, m, d] = match.map(Number);
  const time = Date.UTC(y, m - 1, d);
  const date = new Date(time);
  // Rejects overflow such as 2026-02-30 (which Date would roll into March).
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    return null;
  }
  return time;
}

export function isCalendarDate(value: unknown): value is string {
  return typeof value === 'string' && parseCalendarDate(value) !== null;
}

/** Number of nights between two valid calendar dates (negative if reversed). */
export function nightsBetween(checkIn: string, checkOut: string): number {
  const start = parseCalendarDate(checkIn);
  const end = parseCalendarDate(checkOut);
  if (start === null || end === null) throw new Error('Invalid calendar date');
  return Math.round((end - start) / DAY_MS);
}

export function addDays(date: string, days: number): string {
  const time = parseCalendarDate(date);
  if (time === null) throw new Error('Invalid calendar date');
  return new Date(time + days * DAY_MS).toISOString().slice(0, 10);
}

/** Today's calendar date in the given IANA time zone. */
export function todayIn(timeZone: string, now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}
