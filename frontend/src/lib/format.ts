const currencyFormatters = new Map<string, Intl.NumberFormat>();

/** Formats minor units as a price, e.g. 12900 USD -> "$129" (cents only when needed). */
export function formatPrice(cents: number, currency = 'USD'): string {
  const whole = cents % 100 === 0;
  const key = `${currency}:${whole}`;
  let formatter = currencyFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: whole ? 0 : 2,
      maximumFractionDigits: whole ? 0 : 2,
    });
    currencyFormatters.set(key, formatter);
  }
  return formatter.format(cents / 100);
}

/** "2026-11-05" -> "Thu, Nov 5, 2026" (calendar date, no time-zone shift). */
export function formatStayDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** Local calendar date as YYYY-MM-DD (for <input type="date"> bounds). */
export function localIsoDate(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDaysIso(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function nightsBetweenIso(checkIn: string, checkOut: string): number {
  const toUtc = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUtc(checkOut) - toUtc(checkIn)) / 86_400_000);
}
