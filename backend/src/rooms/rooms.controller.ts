import { Controller, Get } from '@nestjs/common';
import { RoomDto, toRoomDto } from './room.dto';
import { RoomsService } from './rooms.service';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get()
  async list(): Promise<RoomDto[]> {
    const rooms = await this.roomsService.findActive();
    return rooms.map(toRoomDto);
  }
}
