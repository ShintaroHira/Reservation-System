import type { DataSourceOptions } from 'typeorm';
import type { Env } from '../config/env';
import { Reservation } from '../reservations/reservation.entity';
import { Room } from '../rooms/room.entity';
import { Testimonial } from '../testimonials/testimonial.entity';
import { InitialSchema1793232000000 } from './migrations/1793232000000-InitialSchema';

export const ENTITIES = [Room, Testimonial, Reservation];
export const MIGRATIONS = [InitialSchema1793232000000];

/** Single source of truth for the connection, shared by Nest, the CLI and the seed script. */
export function buildDataSourceOptions(env: Pick<Env, 'DATABASE_URL' | 'NODE_ENV'>): DataSourceOptions {
  return {
    type: 'postgres',
    url: env.DATABASE_URL,
    entities: ENTITIES,
    migrations: MIGRATIONS,
    migrationsTableName: 'typeorm_migrations',
    // Schema changes only ever happen through reviewed migrations.
    synchronize: false,
    // Matches the gen_random_uuid() defaults used in the migrations.
    uuidExtension: 'pgcrypto',
    logging: env.NODE_ENV === 'development' ? ['error', 'warn', 'migration'] : ['error', 'migration'],
  };
}
