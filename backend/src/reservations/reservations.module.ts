import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoomsModule } from '../rooms/rooms.module';
import { Reservation } from './reservation.entity';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';

@Module({
  // RoomsModule re-exports the room and room type repositories.
  imports: [TypeOrmModule.forFeature([Reservation]), RoomsModule],
  controllers: [ReservationsController],
  providers: [ReservationsService],
})
export class ReservationsModule {}
