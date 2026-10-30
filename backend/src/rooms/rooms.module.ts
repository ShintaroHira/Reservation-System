import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoomBlock } from './room-block.entity';
import { RoomBlocksService } from './room-blocks.service';
import { RoomType } from './room-type.entity';
import { Room } from './room.entity';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';

@Module({
  imports: [TypeOrmModule.forFeature([RoomType, Room, RoomBlock])],
  controllers: [RoomsController],
  providers: [RoomsService, RoomBlocksService],
  exports: [RoomsService, RoomBlocksService, TypeOrmModule],
})
export class RoomsModule {}
