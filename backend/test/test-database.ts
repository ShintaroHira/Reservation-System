import { loadDotEnv } from '../src/config/env';

/**
 * URL of the e2e database: TEST_DATABASE_URL, or DATABASE_URL with `_test` added
 * to the database name. The suite wipes this database, so anything not named
 * `*_test` is refused.
 */
export function testDatabaseUrl(): string {
  loadDotEnv();
  const base = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!base) throw new Error('Set DATABASE_URL or TEST_DATABASE_URL to run the e2e tests');

  const url = new URL(base);
  if (!process.env.TEST_DATABASE_URL && !url.pathname.endsWith('_test')) url.pathname += '_test';
  if (!url.pathname.endsWith('_test')) {
    throw new Error(`Refusing to run the e2e tests against "${url.pathname.slice(1)}": its name must end in _test`);
  }
  return url.toString();
}
