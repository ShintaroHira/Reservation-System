import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { ReservationConfirmationDto, toReservationConfirmationDto } from './reservation-confirmation.dto';
import { ReservationsService } from './reservations.service';

@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  // Booking requests are a write path open to the public: keep the rate tight.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async create(@Body() dto: CreateReservationDto): Promise<ReservationConfirmationDto> {
    const reservation = await this.reservationsService.create(dto);
    return toReservationConfirmationDto(reservation);
  }
}
