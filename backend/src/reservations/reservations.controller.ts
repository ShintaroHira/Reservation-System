import { BadRequestException, Body, Controller, Headers, HttpCode, HttpStatus, Post, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { isUUID } from 'class-validator';
import type { Response } from 'express';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { ReservationConfirmationDto, toReservationConfirmationDto } from './reservation-confirmation.dto';
import { ReservationsService } from './reservations.service';

@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  /**
   * Requires an `Idempotency-Key` header (a UUID, new for each booking attempt).
   * Sending the same request again with the same key returns the original
   * booking, marked with `Idempotent-Replayed: true`, instead of booking twice.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  // Booking requests are a write path open to the public: keep the rate tight.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async create(
    @Body() dto: CreateReservationDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ReservationConfirmationDto> {
    if (!idempotencyKey || !isUUID(idempotencyKey)) {
      throw new BadRequestException('Something went wrong while sending your request. Please refresh the page and try again.');
    }
    const { reservation, replayed } = await this.reservationsService.create(dto, idempotencyKey.toLowerCase());
    if (replayed) response.setHeader('Idempotent-Replayed', 'true');
    return toReservationConfirmationDto(reservation);
  }
}
