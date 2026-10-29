import { addDays, isCalendarDate, nightsBetween, parseCalendarDate, todayIn } from './calendar-date';

describe('calendar-date', () => {
  it('accepts real dates and rejects malformed or overflowing ones', () => {
    expect(isCalendarDate('2026-11-05')).toBe(true);
    expect(isCalendarDate('2028-02-29')).toBe(true); // leap year
    expect(isCalendarDate('2026-02-29')).toBe(false);
    expect(isCalendarDate('2026-02-30')).toBe(false);
    expect(isCalendarDate('2026-13-01')).toBe(false);
    expect(isCalendarDate('2026-1-05')).toBe(false);
    expect(isCalendarDate('2026-11-05T00:00:00Z')).toBe(false);
    expect(isCalendarDate(20261105)).toBe(false);
    expect(parseCalendarDate('')).toBeNull();
  });

  it('counts nights across month, year and DST boundaries', () => {
    expect(nightsBetween('2026-11-05', '2026-11-08')).toBe(3);
    expect(nightsBetween('2026-12-30', '2027-01-02')).toBe(3);
    expect(nightsBetween('2027-03-27', '2027-03-30')).toBe(3); // EU DST change
    expect(nightsBetween('2026-11-08', '2026-11-05')).toBe(-3);
  });

  it('adds days', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });

  it('resolves today in the hotel time zone', () => {
    const instant = new Date('2026-10-29T23:30:00Z');
    expect(todayIn('UTC', instant)).toBe('2026-10-29');
    expect(todayIn('Asia/Tokyo', instant)).toBe('2026-10-30');
    expect(todayIn('America/Los_Angeles', instant)).toBe('2026-10-29');
  });
});
