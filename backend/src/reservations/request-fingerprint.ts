import { createHash } from 'node:crypto';
import type { CreateReservationDto } from './dto/create-reservation.dto';

/**
 * SHA-256 of everything a booking request asks for, after validation and trimming.
 * Two requests with the same idempotency key must have the same fingerprint;
 * otherwise the key was reused for a different booking.
 */
export function requestFingerprint(dto: CreateReservationDto): string {
  // A fixed field order, so the hash doesn't depend on how the JSON was written.
  const fields = [
    dto.roomTypeId ?? null,
    dto.roomId ?? null,
    dto.checkIn,
    dto.checkOut,
    dto.guests,
    dto.fullName,
    dto.email,
    dto.phone ?? null,
    dto.specialRequests ?? null,
    dto.arrivalTime ?? null,
  ];
  return createHash('sha256').update(JSON.stringify(fields)).digest('hex');
}
