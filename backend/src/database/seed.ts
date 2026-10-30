import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { loadDotEnv, validateEnv } from '../config/env';
import { RoomType } from '../rooms/room-type.entity';
import { Room } from '../rooms/room.entity';
import { Testimonial } from '../testimonials/testimonial.entity';
import { buildDataSourceOptions } from './data-source-options';
import { ROOM_SEEDS, ROOM_TYPE_SEEDS, TESTIMONIAL_SEEDS } from './seed-data';

/**
 * Idempotent seed: applies pending migrations, then upserts the room types and
 * reviews shown on the landing page (keyed by slug) and the rooms (keyed by
 * room number). Safe to run repeatedly; rows it doesn't list are left alone.
 */
export async function seedDatabase(dataSource: DataSource): Promise<void> {
  await dataSource.runMigrations({ transaction: 'each' });
  await dataSource.transaction(async (manager) => {
    await manager.getRepository(RoomType).upsert(ROOM_TYPE_SEEDS, { conflictPaths: ['slug'] });

    const types = await manager.getRepository(RoomType).find({ select: { id: true, slug: true } });
    const typeIdBySlug = new Map(types.map((type) => [type.slug, type.id]));
    const rooms = ROOM_SEEDS.map(({ roomTypeSlug, ...room }) => {
      const roomTypeId = typeIdBySlug.get(roomTypeSlug);
      if (!roomTypeId) throw new Error(`Room ${room.roomNumber} refers to unknown room type "${roomTypeSlug}"`);
      return { ...room, roomTypeId };
    });
    await manager.getRepository(Room).upsert(rooms, { conflictPaths: ['roomNumber'] });

    await manager.getRepository(Testimonial).upsert(TESTIMONIAL_SEEDS, { conflictPaths: ['slug'] });
  });
}

async function main(): Promise<void> {
  loadDotEnv();
  const dataSource = new DataSource(buildDataSourceOptions(validateEnv(process.env)));
  await dataSource.initialize();
  try {
    await seedDatabase(dataSource);
    console.log(
      `Seeded ${ROOM_TYPE_SEEDS.length} room types, ${ROOM_SEEDS.length} rooms and ${TESTIMONIAL_SEEDS.length} testimonials.`,
    );
  } finally {
    await dataSource.destroy();
  }
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error('Seeding failed:', error);
    process.exitCode = 1;
  });
}
