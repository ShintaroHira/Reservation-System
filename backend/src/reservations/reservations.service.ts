import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { addDays, nightsBetween, todayIn } from '../common/calendar-date';
import type { Env } from '../config/env';
import type { Room } from '../rooms/room.entity';
import { RoomsService } from '../rooms/rooms.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { generateReference } from './reference';
import { Reservation } from './reservation.entity';

export const MAX_NIGHTS = 30;
export const BOOKING_WINDOW_DAYS = 365;
const MAX_REFERENCE_ATTEMPTS = 5;

export type CreatedReservation = Reservation & { room: Room };

function isReferenceCollision(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) return false;
  const driverError = error.driverError as { code?: string; constraint?: string } | undefined;
  return driverError?.code === '23505' && driverError.constraint === 'UQ_reservations_reference';
}

@Injectable()
export class ReservationsService {
  constructor(
    @InjectRepository(Reservation) private readonly reservations: Repository<Reservation>,
    private readonly roomsService: RoomsService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /**
   * Records a booking request with status `pending`. Availability is confirmed
   * by the hotel afterwards; the request locks in the current nightly rate.
   */
  async create(dto: CreateReservationDto, now: Date = new Date()): Promise<CreatedReservation> {
    const room = await this.roomsService.findActiveById(dto.roomId);
    if (!room) throw new NotFoundException('The selected room is not available.');

    const today = todayIn(this.config.get('HOTEL_TIMEZONE', { infer: true }), now);
    // YYYY-MM-DD strings compare correctly as plain strings.
    if (dto.checkIn < today) {
      throw new BadRequestException('Check-in date cannot be in the past.');
    }
    if (dto.checkIn > addDays(today, BOOKING_WINDOW_DAYS)) {
      throw new BadRequestException(`Reservations open ${BOOKING_WINDOW_DAYS} days in advance.`);
    }

    const nights = nightsBetween(dto.checkIn, dto.checkOut);
    if (nights < 1) {
      throw new BadRequestException('Check-out must be at least one night after check-in.');
    }
    if (nights > MAX_NIGHTS) {
      throw new BadRequestException(`Online requests are limited to ${MAX_NIGHTS} nights.`);
    }
    if (dto.guests > room.maxGuests) {
      throw new BadRequestException(
        `The ${room.name} accommodates up to ${room.maxGuests} ${room.maxGuests === 1 ? 'guest' : 'guests'}.`,
      );
    }

    for (let attempt = 1; ; attempt += 1) {
      const reservation = this.reservations.create({
        reference: generateReference(),
        roomId: room.id,
        checkIn: dto.checkIn,
        checkOut: dto.checkOut,
        nights,
        guests: dto.guests,
        fullName: dto.fullName,
        email: dto.email,
        phone: dto.phone ?? null,
        specialRequests: dto.specialRequests ?? null,
        nightlyRateCents: room.nightlyRateCents,
        totalCents: nights * room.nightlyRateCents,
        currency: room.currency,
        status: 'pending',
      });
      try {
        const saved = await this.reservations.save(reservation);
        return Object.assign(saved, { room });
      } catch (error) {
        if (isReferenceCollision(error) && attempt < MAX_REFERENCE_ATTEMPTS) continue;
        throw error;
      }
    }
  }
}
