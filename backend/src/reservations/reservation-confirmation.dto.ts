import type { CreatedReservation } from './reservations.service';
import type { ReservationStatus } from './reservation.entity';

/** What the guest sees after submitting a request. */
export interface ReservationConfirmationDto {
  reference: string;
  status: ReservationStatus;
  room: { id: string; name: string };
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  fullName: string;
  email: string;
  nightlyRateCents: number;
  totalCents: number;
  currency: string;
  createdAt: string;
}

export function toReservationConfirmationDto(reservation: CreatedReservation): ReservationConfirmationDto {
  return {
    reference: reservation.reference,
    status: reservation.status,
    room: { id: reservation.room.id, name: reservation.room.name },
    checkIn: reservation.checkIn,
    checkOut: reservation.checkOut,
    nights: reservation.nights,
    guests: reservation.guests,
    fullName: reservation.fullName,
    email: reservation.email,
    nightlyRateCents: reservation.nightlyRateCents,
    totalCents: reservation.totalCents,
    currency: reservation.currency,
    createdAt: reservation.createdAt.toISOString(),
  };
}
