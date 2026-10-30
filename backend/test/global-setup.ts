import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from '../src/database/data-source-options';
import { seedDatabase } from '../src/database/seed';
import { testDatabaseUrl } from './test-database';

/**
 * Rebuilds the test database before every run, which also proves on each run that
 * the migrations apply to an empty database and that the latest one can be undone.
 */
export default async function globalSetup(): Promise<void> {
  const dataSource = new DataSource(buildDataSourceOptions({ DATABASE_URL: testDatabaseUrl(), NODE_ENV: 'test' }));
  try {
    await dataSource.initialize();
  } catch (error) {
    throw new Error(`Cannot reach the test database. Is it created? Run "npm run db:start". (${String(error)})`);
  }
  try {
    await dataSource.query('DROP SCHEMA public CASCADE');
    await dataSource.query('CREATE SCHEMA public');
    await dataSource.runMigrations({ transaction: 'each' });
    await dataSource.undoLastMigration({ transaction: 'each' });
    await seedDatabase(dataSource);
  } finally {
    await dataSource.destroy();
  }
}
