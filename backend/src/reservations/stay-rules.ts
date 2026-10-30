import { BadRequestException } from '@nestjs/common';
import { addDays, nightsBetween } from '../common/calendar-date';
import type { RoomType } from '../rooms/room-type.entity';

export const MAX_NIGHTS = 30;
export const BOOKING_WINDOW_DAYS = 365;

export interface StayRequest {
  checkIn: string;
  checkOut: string;
  guests: number;
}

/**
 * The hotel's booking rules for a stay, independent of availability.
 * `today` is the hotel's current date (`YYYY-MM-DD`). Returns the number of nights.
 */
export function assertStayAllowed(
  stay: StayRequest,
  roomType: Pick<RoomType, 'name' | 'maxGuests'>,
  today: string,
): number {
  // YYYY-MM-DD strings compare correctly as plain strings.
  if (stay.checkIn < today) {
    throw new BadRequestException('Check-in date cannot be in the past.');
  }
  if (stay.checkIn > addDays(today, BOOKING_WINDOW_DAYS)) {
    throw new BadRequestException(`Reservations open ${BOOKING_WINDOW_DAYS} days in advance.`);
  }

  const nights = nightsBetween(stay.checkIn, stay.checkOut);
  if (nights < 1) {
    throw new BadRequestException('Check-out must be at least one night after check-in.');
  }
  if (nights > MAX_NIGHTS) {
    throw new BadRequestException(`Online requests are limited to ${MAX_NIGHTS} nights.`);
  }
  if (stay.guests > roomType.maxGuests) {
    throw new BadRequestException(
      `The ${roomType.name} accommodates up to ${roomType.maxGuests} ${roomType.maxGuests === 1 ? 'guest' : 'guests'}.`,
    );
  }
  return nights;
}
