import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { isCalendarDate } from '../common/calendar-date';
import { RoomBlock } from './room-block.entity';
import { findBookingsHoldingNights, lockRoom } from './room-occupancy';

export interface CloseRoomInput {
  roomId: string;
  /** First closed night (`YYYY-MM-DD`). */
  startDate: string;
  /** First night the room is open again (`YYYY-MM-DD`). */
  endDate: string;
  reason: string;
}

/**
 * Closing rooms for dates. There is no endpoint yet: the staff screen that
 * calls this comes in a later stage.
 */
@Injectable()
export class RoomBlocksService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async closeRoom(input: CloseRoomInput): Promise<RoomBlock> {
    const reason = input.reason.trim();
    if (!isCalendarDate(input.startDate) || !isCalendarDate(input.endDate)) {
      throw new BadRequestException('Please choose valid dates.');
    }
    if (input.endDate <= input.startDate) {
      throw new BadRequestException('The room must be closed for at least one night.');
    }
    if (!reason) throw new BadRequestException('Please give a reason for closing the room.');

    return this.dataSource.transaction(async (manager) => {
      const room = await lockRoom(manager, input.roomId);
      if (!room) throw new NotFoundException('Room not found.');

      // Closing a room over existing bookings would strand those guests, so the
      // bookings have to be moved or cancelled first.
      const bookings = await findBookingsHoldingNights(manager, room.id, input.startDate, input.endDate);
      if (bookings.length > 0) {
        throw new ConflictException(
          `Room ${room.roomNumber} has bookings on those dates (${bookings.join(', ')}). Move or cancel them first.`,
        );
      }

      const repository = manager.getRepository(RoomBlock);
      return repository.save(
        repository.create({ roomId: room.id, startDate: input.startDate, endDate: input.endDate, reason }),
      );
    });
  }
}
