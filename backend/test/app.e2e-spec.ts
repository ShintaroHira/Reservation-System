import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource, In } from 'typeorm';
import { AppModule } from '../src/app.module';
import { addDays, todayIn } from '../src/common/calendar-date';
import type { Env } from '../src/config/env';
import { configureApp } from '../src/main';
import { Reservation } from '../src/reservations/reservation.entity';

/**
 * Runs against the database in DATABASE_URL (seed it first: `npm run seed`).
 * Reservations created here are deleted afterwards.
 */
describe('Reservation API (e2e)', () => {
  let app: NestExpressApplication;
  let dataSource: DataSource;
  let origin: string;
  const createdReferences: string[] = [];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    const config = app.get<ConfigService<Env, true>>(ConfigService);
    configureApp(app, config);
    await app.init();
    dataSource = app.get(DataSource);
    origin = config.get('CORS_ORIGINS', { infer: true })[0];
  });

  afterAll(async () => {
    if (createdReferences.length) {
      await dataSource.getRepository(Reservation).delete({ reference: In(createdReferences) });
    }
    await app.close();
  });

  const http = () => request(app.getHttpServer());

  it('GET /api/health reports the database as up', async () => {
    await http().get('/api/health').expect(200, { status: 'ok', database: 'up' });
  });

  it('GET /api/rooms lists the four seeded rooms in display order without internal fields', async () => {
    const { body } = await http().get('/api/rooms').set('Origin', origin).expect(200).expect('access-control-allow-origin', origin);
    expect(body.map((room: { slug: string }) => room.slug)).toEqual([
      'standard-room',
      'deluxe-room',
      'executive-suite',
      'family-suite',
    ]);
    expect(body[0]).toEqual({
      id: expect.any(String),
      slug: 'standard-room',
      name: 'Standard Room',
      description: 'Comfort and style for\na relaxing stay.',
      bedLabel: '1 King Bed',
      maxGuests: 2,
      nightlyRateCents: 12900,
      currency: 'USD',
      imageUrl: '/images/rooms/standard-room.jpg',
      imageAlt: expect.any(String),
    });
  });

  it('GET /api/testimonials lists the published reviews', async () => {
    const { body } = await http().get('/api/testimonials').expect(200);
    expect(body.map((t: { authorName: string }) => t.authorName)).toEqual([
      'Emily Carter',
      'James Wilson',
      'Sophia Martinez',
    ]);
    expect(body[0]).not.toHaveProperty('slug');
  });

  describe('POST /api/reservations', () => {
    let roomId: string;
    const today = todayIn('UTC');

    beforeAll(async () => {
      const { body } = await http().get('/api/rooms');
      roomId = body.find((room: { slug: string }) => room.slug === 'executive-suite').id;
    });

    const payload = (overrides: Record<string, unknown> = {}) => ({
      roomId,
      checkIn: addDays(today, 10),
      checkOut: addDays(today, 13),
      guests: 3,
      fullName: '  Sophia Martinez  ',
      email: 'sophia@example.com',
      phone: '',
      specialRequests: 'Late arrival, around 11pm.',
      ...overrides,
    });

    it('creates a pending request, prices it and persists it', async () => {
      const { body } = await http().post('/api/reservations').send(payload()).expect(201);
      createdReferences.push(body.reference);

      expect(body).toMatchObject({
        status: 'pending',
        room: { id: roomId, name: 'Executive Suite' },
        nights: 3,
        guests: 3,
        fullName: 'Sophia Martinez',
        nightlyRateCents: 22900,
        totalCents: 68700,
        currency: 'USD',
      });
      expect(body.reference).toMatch(/^RSV-[A-HJ-NP-Z2-9]{6}$/);

      const stored = await dataSource.getRepository(Reservation).findOneByOrFail({ reference: body.reference });
      expect(stored).toMatchObject({
        checkIn: addDays(today, 10),
        checkOut: addDays(today, 13),
        phone: null,
        specialRequests: 'Late arrival, around 11pm.',
      });
    });

    it('rejects invalid input with readable messages', async () => {
      const { body } = await http()
        .post('/api/reservations')
        .send(payload({ email: 'not-an-email', checkIn: '2026-02-30', guests: 0 }))
        .expect(400);
      expect(body.message).toEqual(
        expect.arrayContaining([
          'Please enter a valid email address.',
          'Please choose a valid check-in date.',
          'At least one guest is required.',
        ]),
      );
    });

    it('rejects unknown fields', async () => {
      await http().post('/api/reservations').send(payload({ totalCents: 1 })).expect(400);
    });

    it('applies business rules (capacity, dates)', async () => {
      const tooMany = await http().post('/api/reservations').send(payload({ guests: 5 })).expect(400);
      expect(tooMany.body.message).toBe('The Executive Suite accommodates up to 3 guests.');

      const reversed = await http()
        .post('/api/reservations')
        .send(payload({ checkOut: addDays(today, 9) }))
        .expect(400);
      expect(reversed.body.message).toBe('Check-out must be at least one night after check-in.');
    });

    it('returns 404 for a room that does not exist', async () => {
      await http()
        .post('/api/reservations')
        .send(payload({ roomId: '6f1c2a40-8b7e-4d4a-9a55-0d6c1f3e9b21' }))
        .expect(404);
    });
  });
});
