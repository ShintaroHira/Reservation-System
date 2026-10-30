import { BadRequestException } from '@nestjs/common';
import { assertStayAllowed } from './stay-rules';

const TODAY = '2026-10-29';
const deluxe = { name: 'Deluxe Room', maxGuests: 2 };
const single = { name: 'Single Room', maxGuests: 1 };

describe('assertStayAllowed', () => {
  it('returns the number of nights for an allowed stay', () => {
    expect(assertStayAllowed({ checkIn: '2026-11-05', checkOut: '2026-11-08', guests: 2 }, deluxe, TODAY)).toBe(3);
  });

  it('accepts a same-day check-in and the last day of the booking window', () => {
    expect(assertStayAllowed({ checkIn: TODAY, checkOut: '2026-10-30', guests: 1 }, deluxe, TODAY)).toBe(1);
    expect(assertStayAllowed({ checkIn: '2027-10-29', checkOut: '2027-10-30', guests: 1 }, deluxe, TODAY)).toBe(1);
  });

  it('accepts a 30-night stay', () => {
    expect(assertStayAllowed({ checkIn: '2026-11-01', checkOut: '2026-12-01', guests: 1 }, deluxe, TODAY)).toBe(30);
  });

  it.each([
    ['check-in in the past', { checkIn: '2026-10-28', checkOut: '2026-10-30', guests: 1 }, deluxe, 'past'],
    ['check-out on the check-in day', { checkIn: '2026-11-05', checkOut: '2026-11-05', guests: 1 }, deluxe, 'at least one night'],
    ['check-out before check-in', { checkIn: '2026-11-05', checkOut: '2026-11-01', guests: 1 }, deluxe, 'at least one night'],
    ['stay longer than 30 nights', { checkIn: '2026-11-05', checkOut: '2026-12-06', guests: 1 }, deluxe, '30 nights'],
    ['check-in beyond the booking window', { checkIn: '2027-10-30', checkOut: '2027-11-01', guests: 1 }, deluxe, '365 days'],
    ['more guests than the room allows', { checkIn: '2026-11-05', checkOut: '2026-11-08', guests: 3 }, deluxe, 'The Deluxe Room accommodates up to 2 guests.'],
    ['more guests than a single room allows', { checkIn: '2026-11-05', checkOut: '2026-11-08', guests: 2 }, single, 'up to 1 guest.'],
  ])('rejects %s', (_label, stay, roomType, message) => {
    const attempt = () => assertStayAllowed(stay, roomType, TODAY);
    expect(attempt).toThrow(BadRequestException);
    expect(attempt).toThrow(message);
  });
});
