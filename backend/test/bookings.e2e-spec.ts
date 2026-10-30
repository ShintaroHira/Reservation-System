import { randomUUID } from 'node:crypto';
import { ConflictException } from '@nestjs/common';
import { QueryFailedError, Repository } from 'typeorm';
import { addDays, todayIn } from '../src/common/calendar-date';
import { Reservation, type ReservationStatus } from '../src/reservations/reservation.entity';
import { RoomBlocksService } from '../src/rooms/room-blocks.service';
import { RoomBlock } from '../src/rooms/room-block.entity';
import { RoomType } from '../src/rooms/room-type.entity';
import { Room } from '../src/rooms/room.entity';
import { createTestApp, postBooking, TestApp } from './test-app';

/**
 * The guarantees the booking system stands on, tested against real PostgreSQL,
 * with real simultaneous requests over HTTP. Seeded rooms used here:
 * Family Suite 401 and 402, Executive Suite 301 and 302, Deluxe Room 201 to 203.
 */
describe('Bookings (e2e)', () => {
  let testApp: TestApp;
  let reservations: Repository<Reservation>;
  let roomBlocks: RoomBlocksService;
  let roomId: Record<string, string>;
  let roomTypeId: Record<string, string>;

  const today = todayIn('UTC');
  const day = (offset: number) => addDays(today, 30 + offset);

  beforeAll(async () => {
    testApp = await createTestApp();
    reservations = testApp.dataSource.getRepository(Reservation);
    roomBlocks = testApp.app.get(RoomBlocksService);
    const rooms = await testApp.dataSource.getRepository(Room).find();
    roomId = Object.fromEntries(rooms.map((room) => [room.roomNumber, room.id]));
    const types = await testApp.dataSource.getRepository(RoomType).find();
    roomTypeId = Object.fromEntries(types.map((type) => [type.slug, type.id]));
  });

  afterAll(async () => {
    await testApp.app.close();
  });

  beforeEach(async () => {
    await testApp.dataSource.query('TRUNCATE "reservations", "room_blocks"');
    await testApp.dataSource.query('UPDATE "rooms" SET "is_bookable" = true');
  });

  const guest = { guests: 2, fullName: 'Emily Carter', email: 'emily@example.com' };
  const stayInRoom = (number: string, from: number, to: number) => ({
    ...guest,
    roomId: roomId[number],
    checkIn: day(from),
    checkOut: day(to),
  });
  const stayOfType = (slug: string, from: number, to: number) => ({
    ...guest,
    roomTypeId: roomTypeId[slug],
    checkIn: day(from),
    checkOut: day(to),
  });
  const book = (body: Record<string, unknown>, key?: string) => postBooking(testApp, body, key);
  const setStatus = (reference: string, status: ReservationStatus) => reservations.update({ reference }, { status });

  describe('the same room on the same nights', () => {
    it.each([
      ['the exact same dates', 0, 3],
      ['a stay inside the booked one', 1, 2],
      ['a stay around the booked one', -1, 4],
      ['a stay overlapping the start', -2, 1],
      ['a stay overlapping the end', 2, 5],
    ])('rejects %s with a clear message', async (_label, from, to) => {
      await book(stayInRoom('401', 0, 3)).expect(201);
      const { body } = await book(stayInRoom('401', from, to)).expect(409);
      expect(body.message).toBe('Sorry, room 401 is not available for those dates. Please choose different dates.');
      expect(await reservations.count()).toBe(1);
    });

    it('allows the same dates in a different room', async () => {
      await book(stayInRoom('401', 0, 3)).expect(201);
      await book(stayInRoom('402', 0, 3)).expect(201);
    });

    it('allows back-to-back stays: check-out and check-in on the same day', async () => {
      await book(stayInRoom('401', 3, 6)).expect(201);
      await book(stayInRoom('401', 6, 8)).expect(201); // starts the day the first ends
      await book(stayInRoom('401', 1, 3)).expect(201); // ends the day the first starts
      expect(await reservations.count()).toBe(3);
    });
  });

  describe('booking stages', () => {
    it.each<[ReservationStatus, number]>([
      ['cancelled', 201],
      ['no_show', 201],
      ['checked_out', 201],
      ['confirmed', 409],
      ['checked_in', 409],
    ])('after a booking becomes %s, the dates answer %i', async (status, expected) => {
      const { body } = await book(stayInRoom('401', 0, 3)).expect(201);
      await setStatus(body.reference, status);
      await book(stayInRoom('401', 0, 3)).expect(expected);
    });

    it('a cancelled booking cannot come back on top of a newer one', async () => {
      const first = await book(stayInRoom('401', 0, 3)).expect(201);
      await setStatus(first.body.reference, 'cancelled');
      await book(stayInRoom('401', 0, 3)).expect(201);
      await expect(setStatus(first.body.reference, 'confirmed')).rejects.toBeInstanceOf(QueryFailedError);
    });
  });

  describe('booking by room type', () => {
    it('gives each guest the next free room, then answers 409 when the type is full', async () => {
      const first = await book(stayOfType('family-suite', 0, 3)).expect(201);
      const second = await book(stayOfType('family-suite', 0, 3)).expect(201);
      expect([first.body.room.number, second.body.room.number]).toEqual(['401', '402']);

      const third = await book(stayOfType('family-suite', 0, 3)).expect(409);
      expect(third.body.message).toBe(
        'Sorry, there is no Family Suite available for those dates. Please try different dates or another room.',
      );
    });

    it('skips rooms that are taken, closed or not bookable', async () => {
      await book(stayInRoom('201', 0, 3)).expect(201);
      await roomBlocks.closeRoom({ roomId: roomId['202'], startDate: day(1), endDate: day(2), reason: 'Repairs' });
      const { body } = await book(stayOfType('deluxe-room', 0, 3)).expect(201);
      expect(body.room.number).toBe('203');

      await testApp.dataSource.getRepository(Room).update({ roomNumber: '402' }, { isBookable: false });
      await book(stayOfType('family-suite', 0, 3)).expect(201);
      await book(stayOfType('family-suite', 0, 3)).expect(409);
    });

    it('fits a stay into a room that is free for all of it', async () => {
      await book(stayInRoom('401', 0, 2)).expect(201);
      await book(stayInRoom('402', 2, 4)).expect(201);
      // 401 is free from night 2, 402 is free up to night 2.
      expect((await book(stayOfType('family-suite', 2, 4)).expect(201)).body.room.number).toBe('401');
      expect((await book(stayOfType('family-suite', 0, 2)).expect(201)).body.room.number).toBe('402');
      await book(stayOfType('family-suite', 1, 3)).expect(409);
    });
  });

  describe('booking a specific room', () => {
    it('books exactly that room', async () => {
      const { body } = await book(stayInRoom('402', 0, 1)).expect(201);
      expect(body.room).toEqual({ id: roomId['402'], number: '402' });
      expect(body.roomType.name).toBe('Family Suite');
    });

    it('refuses a room that is not bookable', async () => {
      await testApp.dataSource.getRepository(Room).update({ roomNumber: '401' }, { isBookable: false });
      await book(stayInRoom('401', 0, 1)).expect(409);
    });

    it('refuses a room whose type is hidden', async () => {
      const types = testApp.dataSource.getRepository(RoomType);
      await types.update({ slug: 'family-suite' }, { isActive: false });
      try {
        await book(stayInRoom('401', 0, 1)).expect(404);
      } finally {
        await types.update({ slug: 'family-suite' }, { isActive: true });
      }
    });

    it('takes capacity and price from the room type', async () => {
      const tooMany = await book({ ...stayInRoom('201', 0, 1), guests: 3 }).expect(400);
      expect(tooMany.body.message).toBe('The Deluxe Room accommodates up to 2 guests.');

      const { body } = await book(stayInRoom('201', 0, 2)).expect(201);
      expect(body).toMatchObject({ nightlyRateCents: 16900, totalCents: 33800 });
    });

    it('rejects naming both a room type and a room', async () => {
      const { body } = await book({ ...stayInRoom('401', 0, 1), roomTypeId: roomTypeId['family-suite'] }).expect(400);
      expect(body.message).toEqual(['Choose either a room type or a specific room, not both.']);
    });
  });

  describe('the price of a booking', () => {
    it('stays as booked when the room rate changes later', async () => {
      const types = testApp.dataSource.getRepository(RoomType);
      const { body } = await book(stayInRoom('401', 0, 2)).expect(201);
      await types.update({ slug: 'family-suite' }, { nightlyRateCents: 99900 });
      try {
        const stored = await reservations.findOneByOrFail({ reference: body.reference });
        expect(stored).toMatchObject({ nightlyRateCents: 28900, totalCents: 57800 });
      } finally {
        await types.update({ slug: 'family-suite' }, { nightlyRateCents: 28900 });
      }
    });
  });

  describe('closing a room', () => {
    const close = (number: string, from: number, to: number) =>
      roomBlocks.closeRoom({ roomId: roomId[number], startDate: day(from), endDate: day(to), reason: 'Repairs' });

    it('stops bookings on any closed night', async () => {
      await close('401', 2, 4);
      await book(stayInRoom('401', 3, 3 + 1)).expect(409);
      await book(stayInRoom('401', 0, 3)).expect(409);
      await book(stayInRoom('401', 3, 6)).expect(409);
      await book(stayInRoom('401', 1, 5)).expect(409);
    });

    it('allows stays that end the day the closure starts, or start the day it ends', async () => {
      await close('401', 2, 4);
      await book(stayInRoom('401', 0, 2)).expect(201);
      await book(stayInRoom('401', 4, 6)).expect(201);
    });

    it('answers 409 for a type whose rooms are all closed', async () => {
      await close('401', 0, 5);
      await close('402', 0, 5);
      await book(stayOfType('family-suite', 1, 2)).expect(409);
    });

    it('refuses to close a room over a booking, and names the booking', async () => {
      const { body } = await book(stayInRoom('401', 1, 3)).expect(201);
      const attempt = close('401', 2, 4);
      await expect(attempt).rejects.toBeInstanceOf(ConflictException);
      await expect(attempt).rejects.toThrow(body.reference);
      expect(await testApp.dataSource.getRepository(RoomBlock).count()).toBe(0);
    });

    it('can close a room around a cancelled booking, or right after a stay', async () => {
      const { body } = await book(stayInRoom('401', 1, 3)).expect(201);
      await close('401', 3, 5);
      await setStatus(body.reference, 'cancelled');
      await close('401', 1, 3);
      expect(await testApp.dataSource.getRepository(RoomBlock).count()).toBe(2);
    });

    it('validates the dates and reason', async () => {
      const input = { roomId: roomId['401'], startDate: day(0), endDate: day(1), reason: 'Repairs' };
      await expect(roomBlocks.closeRoom({ ...input, endDate: day(0) })).rejects.toThrow('at least one night');
      await expect(roomBlocks.closeRoom({ ...input, startDate: 'soon' })).rejects.toThrow('valid dates');
      await expect(roomBlocks.closeRoom({ ...input, reason: '   ' })).rejects.toThrow('reason');
      await expect(roomBlocks.closeRoom({ ...input, roomId: randomUUID() })).rejects.toThrow('Room not found');
    });
  });

  describe('two guests at the same moment', () => {
    // Repeated because a race can pass by luck once, but not every time.
    const ROUNDS = 10;

    it('lets exactly one of many simultaneous bookings for a room through', async () => {
      for (let round = 0; round < ROUNDS; round += 1) {
        const stay = stayInRoom('401', round * 2, round * 2 + 2);
        const responses = await Promise.all(Array.from({ length: 10 }, () => book(stay)));
        const statuses = responses.map((response) => response.status).sort();
        expect(statuses).toEqual([201, ...Array(9).fill(409)]);
      }
      expect(await reservations.count()).toBe(ROUNDS);
    });

    it('lets simultaneous overlapping stays through only where they do not clash', async () => {
      for (let round = 0; round < ROUNDS; round += 1) {
        await testApp.dataSource.query('TRUNCATE "reservations"');
        // [0,4) clashes with both others, while [0,2) and [2,4) don't clash with each other.
        const responses = await Promise.all([
          book(stayInRoom('401', 0, 4)),
          book(stayInRoom('401', 0, 2)),
          book(stayInRoom('401', 2, 4)),
        ]);
        const booked = await reservations.find({ where: { roomId: roomId['401'] } });
        const nights = booked.reduce((total, reservation) => total + reservation.nights, 0);
        expect(responses.filter((response) => response.status === 201)).toHaveLength(booked.length);
        expect(nights).toBeLessThanOrEqual(4);
        expect(booked.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('fills a room type exactly, with no two guests in one room', async () => {
      for (let round = 0; round < ROUNDS; round += 1) {
        const stay = stayOfType('deluxe-room', round * 2, round * 2 + 2);
        const responses = await Promise.all(Array.from({ length: 8 }, () => book(stay)));
        const booked = responses.filter((response) => response.status === 201);
        expect(booked).toHaveLength(3);
        expect(responses.filter((response) => response.status === 409)).toHaveLength(5);
        expect(booked.map((response) => response.body.room.number).sort()).toEqual(['201', '202', '203']);
      }
    });

    it('never lets a booking and a closure both win', async () => {
      // The two go through different tables, so only the room lock keeps them apart.
      // A booking takes longer to arrive, so the closure starts at varying delays.
      for (let delay = 0; delay < 40; delay += 1) {
        await testApp.dataSource.query('TRUNCATE "reservations", "room_blocks"');
        const [booking, closure] = await Promise.allSettled([
          book(stayInRoom('401', 0, 2)).then((response) => response.status),
          new Promise((resolve) => setTimeout(resolve, delay / 4)).then(() =>
            roomBlocks.closeRoom({ roomId: roomId['401'], startDate: day(1), endDate: day(3), reason: 'Repairs' }),
          ),
        ]);
        const booked = booking.status === 'fulfilled' && booking.value === 201;
        expect(booked).toBe(closure.status === 'rejected');
      }
    });
  });

  describe('the same request sent twice', () => {
    it('returns the same booking and marks it as a repeat', async () => {
      const key = randomUUID();
      const first = await book(stayInRoom('401', 0, 2), key).expect(201);
      expect(first.headers['idempotent-replayed']).toBeUndefined();

      const second = await book(stayInRoom('401', 0, 2), key).expect(201);
      expect(second.headers['idempotent-replayed']).toBe('true');
      expect(second.body).toEqual(first.body);
      expect(await reservations.count()).toBe(1);
    });

    it('returns the same booking for a room-type request, without taking a second room', async () => {
      const key = randomUUID();
      const first = await book(stayOfType('family-suite', 0, 2), key).expect(201);
      const second = await book(stayOfType('family-suite', 0, 2), key).expect(201);
      expect(second.body.room).toEqual(first.body.room);
      expect(await reservations.count()).toBe(1);
    });

    it('treats the key the same in upper case', async () => {
      const key = randomUUID();
      await book(stayInRoom('401', 0, 2), key).expect(201);
      await book(stayInRoom('401', 0, 2), key.toUpperCase()).expect(201);
      expect(await reservations.count()).toBe(1);
    });

    it('keeps a single booking when many copies arrive at the same moment', async () => {
      for (let round = 0; round < 10; round += 1) {
        await testApp.dataSource.query('TRUNCATE "reservations"');
        const key = randomUUID();
        // Executive Suite has two rooms, so without the key two copies would both succeed.
        const responses = await Promise.all(Array.from({ length: 6 }, () => book(stayOfType('executive-suite', 0, 2), key)));
        expect(responses.map((response) => response.status)).toEqual(Array(6).fill(201));
        expect(new Set(responses.map((response) => response.body.reference)).size).toBe(1);
        expect(await reservations.count()).toBe(1);
      }
    });

    it('still returns the booking to a copy that finds the type full', async () => {
      await book(stayInRoom('402', 0, 2)).expect(201);
      for (let round = 0; round < 10; round += 1) {
        await reservations.delete({ roomId: roomId['401'] });
        const key = randomUUID();
        // Only room 401 is left, so the losing copies run out of rooms.
        const responses = await Promise.all(Array.from({ length: 6 }, () => book(stayOfType('family-suite', 0, 2), key)));
        expect(responses.map((response) => response.status)).toEqual(Array(6).fill(201));
        expect(new Set(responses.map((response) => response.body.reference)).size).toBe(1);
      }
    });

    it('rejects a key reused for different details', async () => {
      const key = randomUUID();
      await book(stayInRoom('401', 0, 2), key).expect(201);
      const { body } = await book(stayInRoom('401', 5, 7), key).expect(422);
      expect(body.message).toContain('different details');
      expect(await reservations.count()).toBe(1);
    });

    it('lets a guest try again with the same key after a refused booking', async () => {
      const key = randomUUID();
      const taken = await book(stayInRoom('401', 0, 2)).expect(201);
      await book(stayInRoom('401', 0, 2), key).expect(409);
      await setStatus(taken.body.reference, 'cancelled');
      await book(stayInRoom('401', 0, 2), key).expect(201);
    });

    it('needs a valid key', async () => {
      const stay = stayInRoom('401', 0, 2);
      await testApp.http().post('/api/reservations').send(stay).expect(400);
      await book(stay, 'not-a-uuid').expect(400);
      expect(await reservations.count()).toBe(0);
    });
  });

  describe('the database rules on their own, without the API', () => {
    const row = (overrides: Partial<Reservation> = {}): Partial<Reservation> => ({
      reference: `RSV-${randomUUID().slice(0, 6)}`,
      roomTypeId: roomTypeId['family-suite'],
      roomId: roomId['401'],
      checkIn: day(0),
      checkOut: day(2),
      nights: 2,
      guests: 2,
      fullName: 'Emily Carter',
      email: 'emily@example.com',
      nightlyRateCents: 28900,
      totalCents: 57800,
      currency: 'USD',
      status: 'confirmed',
      ...overrides,
    });
    const constraintOf = async (attempt: Promise<unknown>) => {
      const error = (await attempt.then(
        () => null,
        (reason: unknown) => reason,
      )) as QueryFailedError | null;
      return (error?.driverError as { constraint?: string } | undefined)?.constraint;
    };

    it('refuses an overlapping stay even when the code is bypassed', async () => {
      await reservations.insert(row());
      expect(await constraintOf(reservations.insert(row({ checkIn: day(1), checkOut: day(3) })))).toBe(
        'EX_reservations_no_overlap',
      );
    });

    it('allows a back-to-back stay and a stay over a cancelled one', async () => {
      await reservations.insert(row());
      await reservations.insert(row({ checkIn: day(2), checkOut: day(4) }));
      await reservations.insert(row({ status: 'cancelled' }));
      expect(await reservations.count()).toBe(3);
    });

    it('refuses a room that does not belong to the booked room type', async () => {
      const wrongType = row({ roomTypeId: roomTypeId['deluxe-room'] });
      expect(await constraintOf(reservations.insert(wrongType))).toBe('FK_reservations_room');
    });

    it('refuses an unknown stage', async () => {
      const unknown = row({ status: 'lost' as ReservationStatus });
      expect(await constraintOf(reservations.insert(unknown))).toBe('CHK_reservations_status');
    });

    it('refuses a confirmed booking with no room', async () => {
      expect(await constraintOf(reservations.insert(row({ roomId: null })))).toBe('CHK_reservations_room_assigned');
    });

    it('keeps an old request with no room, which holds no nights', async () => {
      await reservations.insert(row({ roomId: null, status: 'pending' }));
      await book(stayInRoom('401', 0, 2)).expect(201);
    });

    it('refuses to delete a room that has bookings, or to move it to another type', async () => {
      await reservations.insert(row());
      const rooms = testApp.dataSource.getRepository(Room);
      expect(await constraintOf(rooms.delete({ roomNumber: '401' }))).toBe('FK_reservations_room');
      expect(await constraintOf(rooms.update({ roomNumber: '401' }, { roomTypeId: roomTypeId['deluxe-room'] }))).toBe(
        'FK_reservations_room',
      );
    });

    it('refuses duplicate room numbers', async () => {
      const rooms = testApp.dataSource.getRepository(Room);
      const duplicate = { roomNumber: '401', roomTypeId: roomTypeId['family-suite'], summary: 'Copy' };
      expect(await constraintOf(rooms.insert(duplicate))).toBe('UQ_rooms_room_number');
    });
  });
});
