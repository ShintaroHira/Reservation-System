import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Room } from './room.entity';

@Injectable()
export class RoomsService {
  constructor(@InjectRepository(Room) private readonly rooms: Repository<Room>) {}

  findActive(): Promise<Room[]> {
    return this.rooms.find({ where: { isActive: true }, order: { sortOrder: 'ASC', name: 'ASC' } });
  }

  findActiveById(id: string): Promise<Room | null> {
    return this.rooms.findOne({ where: { id, isActive: true } });
  }
}
