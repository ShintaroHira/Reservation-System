import type { CreatedReservation } from './reservations.service';
import type { ReservationStatus } from './reservation.entity';

/** What the guest sees after booking. */
export interface ReservationConfirmationDto {
  reference: string;
  status: ReservationStatus;
  roomType: { id: string; name: string };
  room: { id: string; number: string };
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  fullName: string;
  email: string;
  /** 24-hour `HH:MM`, or null when the guest didn't give one. */
  arrivalTime: string | null;
  nightlyRateCents: number;
  totalCents: number;
  currency: string;
  createdAt: string;
}

export function toReservationConfirmationDto(reservation: CreatedReservation): ReservationConfirmationDto {
  return {
    reference: reservation.reference,
    status: reservation.status,
    roomType: { id: reservation.roomType.id, name: reservation.roomType.name },
    room: { id: reservation.room.id, number: reservation.room.roomNumber },
    checkIn: reservation.checkIn,
    checkOut: reservation.checkOut,
    nights: reservation.nights,
    guests: reservation.guests,
    fullName: reservation.fullName,
    email: reservation.email,
    // Postgres returns `time` as HH:MM:SS.
    arrivalTime: reservation.arrivalTime?.slice(0, 5) ?? null,
    nightlyRateCents: reservation.nightlyRateCents,
    totalCents: reservation.totalCents,
    currency: reservation.currency,
    createdAt: reservation.createdAt.toISOString(),
  };
}
