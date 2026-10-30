import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoomType } from './room-type.entity';

@Injectable()
export class RoomsService {
  constructor(@InjectRepository(RoomType) private readonly roomTypes: Repository<RoomType>) {}

  findActiveTypes(): Promise<RoomType[]> {
    return this.roomTypes.find({ where: { isActive: true }, order: { sortOrder: 'ASC', name: 'ASC' } });
  }
}
