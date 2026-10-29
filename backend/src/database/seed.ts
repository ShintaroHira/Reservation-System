import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { loadDotEnv, validateEnv } from '../config/env';
import { Room } from '../rooms/room.entity';
import { Testimonial } from '../testimonials/testimonial.entity';
import { buildDataSourceOptions } from './data-source-options';
import { ROOM_SEEDS, TESTIMONIAL_SEEDS } from './seed-data';

/**
 * Idempotent seed: applies pending migrations, then upserts the rooms and
 * reviews shown on the landing page (keyed by slug). Safe to run repeatedly.
 */
async function seed(): Promise<void> {
  loadDotEnv();
  const dataSource = new DataSource(buildDataSourceOptions(validateEnv(process.env)));
  await dataSource.initialize();
  try {
    await dataSource.runMigrations({ transaction: 'each' });
    await dataSource.transaction(async (manager) => {
      await manager.getRepository(Room).upsert(ROOM_SEEDS, { conflictPaths: ['slug'] });
      await manager.getRepository(Testimonial).upsert(TESTIMONIAL_SEEDS, { conflictPaths: ['slug'] });
    });
    console.log(`Seeded ${ROOM_SEEDS.length} rooms and ${TESTIMONIAL_SEEDS.length} testimonials.`);
  } finally {
    await dataSource.destroy();
  }
}

seed().catch((error: unknown) => {
  console.error('Seeding failed:', error);
  process.exitCode = 1;
});
