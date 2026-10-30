import { Controller, Get } from '@nestjs/common';
import { RoomTypeDto, toRoomTypeDto } from './room-type.dto';
import { RoomsService } from './rooms.service';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  /** The room types shown on the landing page (the path predates individual rooms). */
  @Get()
  async list(): Promise<RoomTypeDto[]> {
    const roomTypes = await this.roomsService.findActiveTypes();
    return roomTypes.map(toRoomTypeDto);
  }
}
