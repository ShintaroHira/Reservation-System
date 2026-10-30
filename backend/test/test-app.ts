import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { getStorageToken } from '@nestjs/throttler';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import type { Env } from '../src/config/env';
import { configureApp } from '../src/main';

export interface TestApp {
  app: NestExpressApplication;
  dataSource: DataSource;
  config: ConfigService<Env, true>;
  http: () => ReturnType<typeof request>;
}

/**
 * Boots the real application on a real port, connected to the test database.
 * Rate limiting is off unless asked for, because these suites send far more
 * bookings per minute than a visitor may.
 */
export async function createTestApp(options: { rateLimit?: boolean } = {}): Promise<TestApp> {
  let builder = Test.createTestingModule({ imports: [AppModule] });
  if (!options.rateLimit) {
    builder = builder.overrideProvider(getStorageToken()).useValue({
      increment: async () => ({ totalHits: 1, timeToExpire: 60, isBlocked: false, timeToBlockExpire: 0 }),
    });
  }
  const moduleRef = await builder.compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>();
  const config = app.get<ConfigService<Env, true>>(ConfigService);
  configureApp(app, config);
  await app.listen(0, '127.0.0.1');
  return { app, config, dataSource: app.get(DataSource), http: () => request(app.getHttpServer()) };
}

/** Sends a booking with its own idempotency key unless one is given. */
export function postBooking(
  testApp: TestApp,
  body: Record<string, unknown>,
  idempotencyKey: string = randomUUID(),
): request.Test {
  return testApp.http().post('/api/reservations').set('Idempotency-Key', idempotencyKey).send(body);
}
