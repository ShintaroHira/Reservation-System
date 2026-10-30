import { addDays, todayIn } from '../src/common/calendar-date';
import { Reservation } from '../src/reservations/reservation.entity';
import { createTestApp, postBooking, TestApp } from './test-app';

/** The API as the landing page uses it. Runs against the test database (see global-setup.ts). */
describe('Reservation API (e2e)', () => {
  let testApp: TestApp;
  let origin: string;

  beforeAll(async () => {
    testApp = await createTestApp();
    origin = testApp.config.get('CORS_ORIGINS', { infer: true })[0];
  });

  afterAll(async () => {
    await testApp.app.close();
  });

  const http = () => testApp.http();

  it('GET /api/health reports the database as up', async () => {
    await http().get('/api/health').expect(200, { status: 'ok', database: 'up' });
  });

  it('GET /api/rooms still lists the four room types in display order without internal fields', async () => {
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

  it('allows the Idempotency-Key header from the site', async () => {
    await http()
      .options('/api/reservations')
      .set('Origin', origin)
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'content-type,idempotency-key')
      .expect(204)
      .expect('access-control-allow-headers', /Idempotency-Key/);
  });

  describe('POST /api/reservations', () => {
    let roomTypeId: string;
    const today = todayIn('UTC');

    beforeAll(async () => {
      const { body } = await http().get('/api/rooms');
      roomTypeId = body.find((room: { slug: string }) => room.slug === 'executive-suite').id;
    });

    beforeEach(async () => {
      await testApp.dataSource.query('TRUNCATE "reservations"');
    });

    const payload = (overrides: Record<string, unknown> = {}) => ({
      roomTypeId,
      checkIn: addDays(today, 10),
      checkOut: addDays(today, 13),
      guests: 3,
      fullName: '  Sophia Martinez  ',
      email: 'sophia@example.com',
      phone: '',
      specialRequests: 'Late arrival, around 11pm.',
      ...overrides,
    });

    it('books a room of the chosen type, confirms it, prices it and persists it', async () => {
      const { body } = await postBooking(testApp, payload({ arrivalTime: '23:15' })).expect(201);

      expect(body).toMatchObject({
        status: 'confirmed',
        roomType: { id: roomTypeId, name: 'Executive Suite' },
        room: { id: expect.any(String), number: '301' },
        nights: 3,
        guests: 3,
        fullName: 'Sophia Martinez',
        arrivalTime: '23:15',
        nightlyRateCents: 22900,
        totalCents: 68700,
        currency: 'USD',
      });
      expect(body.reference).toMatch(/^RSV-[A-HJ-NP-Z2-9]{6}$/);

      const stored = await testApp.dataSource.getRepository(Reservation).findOneByOrFail({ reference: body.reference });
      expect(stored).toMatchObject({
        status: 'confirmed',
        roomTypeId,
        roomId: body.room.id,
        checkIn: addDays(today, 10),
        checkOut: addDays(today, 13),
        phone: null,
        specialRequests: 'Late arrival, around 11pm.',
        arrivalTime: '23:15:00',
      });
    });

    it('leaves the arrival time empty when the guest gives none', async () => {
      const { body } = await postBooking(testApp, payload()).expect(201);
      expect(body.arrivalTime).toBeNull();
    });

    it('rejects invalid input with readable messages', async () => {
      const { body } = await postBooking(
        testApp,
        payload({ email: 'not-an-email', checkIn: '2026-02-30', guests: 0, arrivalTime: '25:00' }),
      ).expect(400);
      expect(body.message).toEqual(
        expect.arrayContaining([
          'Please enter a valid email address.',
          'Please choose a valid check-in date.',
          'At least one guest is required.',
          'Please enter a valid arrival time (HH:MM).',
        ]),
      );
    });

    it('rejects unknown fields', async () => {
      await postBooking(testApp, payload({ totalCents: 1 })).expect(400);
    });

    it('asks for a room exactly once when none is chosen', async () => {
      const { body } = await postBooking(testApp, payload({ roomTypeId: undefined })).expect(400);
      expect(body.message).toEqual(['Please choose a room.']);
    });

    it('applies business rules (capacity, dates)', async () => {
      const tooMany = await postBooking(testApp, payload({ guests: 5 })).expect(400);
      expect(tooMany.body.message).toBe('The Executive Suite accommodates up to 3 guests.');

      const reversed = await postBooking(testApp, payload({ checkOut: addDays(today, 9) })).expect(400);
      expect(reversed.body.message).toBe('Check-out must be at least one night after check-in.');

      const past = await postBooking(testApp, payload({ checkIn: addDays(today, -1) })).expect(400);
      expect(past.body.message).toBe('Check-in date cannot be in the past.');

      const tooFar = await postBooking(
        testApp,
        payload({ checkIn: addDays(today, 366), checkOut: addDays(today, 367) }),
      ).expect(400);
      expect(tooFar.body.message).toBe('Reservations open 365 days in advance.');

      const tooLong = await postBooking(testApp, payload({ checkOut: addDays(today, 41) })).expect(400);
      expect(tooLong.body.message).toBe('Online requests are limited to 30 nights.');
    });

    it('returns 404 for a room type that does not exist', async () => {
      await postBooking(testApp, payload({ roomTypeId: '6f1c2a40-8b7e-4d4a-9a55-0d6c1f3e9b21' })).expect(404);
    });
  });
});

describe('Rate limit (e2e)', () => {
  it('stops a visitor after 10 booking requests in a minute', async () => {
    const testApp = await createTestApp({ rateLimit: true });
    try {
      // Invalid bodies count too, and leave nothing behind in the database.
      for (let sent = 0; sent < 10; sent += 1) await postBooking(testApp, {}).expect(400);
      await postBooking(testApp, {}).expect(429);
    } finally {
      await testApp.app.close();
    }
  });
});
