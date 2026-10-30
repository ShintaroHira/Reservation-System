import { BadRequestException, ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { QueryFailedError, type DataSource, type EntityManager, type Repository } from 'typeorm';
import type { Env } from '../config/env';
import type { RoomType } from '../rooms/room-type.entity';
import type { Room } from '../rooms/room.entity';
import type { CreateReservationDto } from './dto/create-reservation.dto';
import { requestFingerprint } from './request-fingerprint';
import type { Reservation } from './reservation.entity';
import { ReservationsService } from './reservations.service';

// Unit tests for the booking flow with the database mocked out. The real
// concurrency guarantees are exercised against PostgreSQL in test/*.e2e-spec.ts.

const NOW = new Date('2026-10-29T12:00:00Z');
const KEY = '0b6f0c55-8d4e-4b8a-a6f1-3f1c2d4e5a6b';

const roomType = {
  id: '6f1c2a40-8b7e-4d4a-9a55-0d6c1f3e9b21',
  name: 'Deluxe Room',
  maxGuests: 2,
  nightlyRateCents: 16900,
  currency: 'USD',
  isActive: true,
} as RoomType;

const room = (roomNumber: string): Room =>
  ({ id: `room-${roomNumber}`, roomNumber, roomTypeId: roomType.id, isBookable: true }) as Room;

function validDto(overrides: Partial<CreateReservationDto> = {}): CreateReservationDto {
  return {
    roomTypeId: roomType.id,
    checkIn: '2026-11-05',
    checkOut: '2026-11-08',
    guests: 2,
    fullName: 'Emily Carter',
    email: 'emily@example.com',
    ...overrides,
  };
}

function pgError(code: string, constraint: string): QueryFailedError {
  return new QueryFailedError('INSERT', [], Object.assign(new Error(constraint), { code, constraint }));
}

interface SetupOptions {
  freeRooms?: Room[];
  roomTypeExists?: boolean;
  closedRoomIds?: string[];
  takenRoomIds?: string[];
  earlier?: Partial<Reservation> | null;
  timeZone?: string;
}

function setup(options: SetupOptions = {}) {
  const save = jest.fn(async (entity: Partial<Reservation>) => ({ ...entity, id: 'res-1', createdAt: NOW }));
  const manager = {
    query: jest.fn(async (sql: string, params: unknown[]) => {
      if (sql.includes('FOR UPDATE')) return [{ id: params[0], roomNumber: 'x', isBookable: true }];
      if (sql.includes('room_blocks')) return options.closedRoomIds?.includes(params[0] as string) ? [{}] : [];
      if (sql.includes('"reservations"')) {
        return options.takenRoomIds?.includes(params[0] as string) ? [{ reference: 'RSV-TAKEN1' }] : [];
      }
      throw new Error(`Unexpected query: ${sql}`);
    }),
    getRepository: () => ({ create: (entity: Partial<Reservation>) => entity, save }),
  } as unknown as EntityManager;
  const dataSource = {
    transaction: jest.fn(async (work: (m: EntityManager) => Promise<unknown>) => work(manager)),
  } as unknown as DataSource;

  const findOne = jest.fn(async () => options.earlier ?? null);
  const reservations = { findOne } as unknown as Repository<Reservation>;
  const roomTypes = {
    findOneBy: jest.fn(async () => (options.roomTypeExists === false ? null : roomType)),
  } as unknown as Repository<RoomType>;
  const getMany = jest.fn(async () => [...(options.freeRooms ?? [room('201')])]);
  const queryBuilder: Record<string, unknown> = { getMany };
  for (const method of ['where', 'andWhere', 'setParameters']) queryBuilder[method] = () => queryBuilder;
  const rooms = { createQueryBuilder: () => queryBuilder } as unknown as Repository<Room>;
  const config = { get: jest.fn(() => options.timeZone ?? 'UTC') } as unknown as ConfigService<Env, true>;

  const service = new ReservationsService(dataSource, reservations, roomTypes, rooms, config);
  return { service, save, findOne, getMany };
}

describe('ReservationsService.create', () => {
  it('confirms the stay in the first free room of the type, in natural room-number order', async () => {
    const { service, save } = setup({ freeRooms: [room('210'), room('29')] });
    const dto = validDto({ phone: '+1 555 0100', arrivalTime: '15:30' });
    const { reservation, replayed } = await service.create(dto, KEY, NOW);

    expect(replayed).toBe(false);
    expect(reservation.room.roomNumber).toBe('29');
    expect(reservation).toMatchObject({
      status: 'confirmed',
      roomTypeId: roomType.id,
      roomId: 'room-29',
      nights: 3,
      nightlyRateCents: 16900,
      totalCents: 3 * 16900,
      arrivalTime: '15:30',
      idempotencyKey: KEY,
      requestFingerprint: requestFingerprint(dto),
    });
    expect(reservation.reference).toMatch(/^RSV-[A-HJ-NP-Z2-9]{6}$/);
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ phone: '+1 555 0100', specialRequests: null }));
  });

  it('moves on to the next room when the first is found taken once it is locked', async () => {
    const { service, save } = setup({ freeRooms: [room('201'), room('202')], takenRoomIds: ['room-201'] });
    const { reservation } = await service.create(validDto(), KEY, NOW);
    expect(save).toHaveBeenCalledTimes(1);
    expect(reservation.room.roomNumber).toBe('202');
  });

  it('treats a rejection by the database rule the same way', async () => {
    const { service, save } = setup({ freeRooms: [room('201'), room('202')] });
    save.mockRejectedValueOnce(pgError('23P01', 'EX_reservations_no_overlap'));

    const { reservation } = await service.create(validDto(), KEY, NOW);
    expect(save).toHaveBeenCalledTimes(2);
    expect(reservation.room.roomNumber).toBe('202');
  });

  it('skips a room that is closed on those dates', async () => {
    const { service, save } = setup({ freeRooms: [room('201'), room('202')], closedRoomIds: ['room-201'] });
    const { reservation } = await service.create(validDto(), KEY, NOW);
    expect(save).toHaveBeenCalledTimes(1);
    expect(reservation.room.roomNumber).toBe('202');
  });

  it('answers 409 when no room of the type is left', async () => {
    const { service, save } = setup({ freeRooms: [room('201')] });
    save.mockRejectedValueOnce(pgError('23P01', 'EX_reservations_no_overlap'));
    const attempt = service.create(validDto(), KEY, NOW);
    await expect(attempt).rejects.toBeInstanceOf(ConflictException);
    await expect(attempt).rejects.toThrow('Sorry, there is no Deluxe Room available for those dates.');
  });

  it('answers 409 when the type has no free room at all', async () => {
    const { service, save } = setup({ freeRooms: [] });
    await expect(service.create(validDto(), KEY, NOW)).rejects.toBeInstanceOf(ConflictException);
    expect(save).not.toHaveBeenCalled();
  });

  it('returns the earlier booking for a repeated request, without booking again', async () => {
    const dto = validDto();
    const earlier = { reference: 'RSV-ABCDEF', requestFingerprint: requestFingerprint(dto) };
    const { service, save } = setup({ earlier });
    const result = await service.create(dto, KEY, NOW);
    expect(result).toEqual({ reservation: earlier, replayed: true });
    expect(save).not.toHaveBeenCalled();
  });

  it('rejects a key that was already used for different details', async () => {
    const earlier = { reference: 'RSV-ABCDEF', requestFingerprint: requestFingerprint(validDto()) };
    const { service, save } = setup({ earlier });
    await expect(service.create(validDto({ guests: 1 }), KEY, NOW)).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
    expect(save).not.toHaveBeenCalled();
  });

  it('returns the booking made by a simultaneous copy of the same request', async () => {
    const dto = validDto();
    const { service, save, findOne } = setup();
    const winner = { reference: 'RSV-WINNER', requestFingerprint: requestFingerprint(dto) };
    save.mockRejectedValueOnce(pgError('23505', 'UQ_reservations_idempotency_key'));
    findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(winner as never);

    await expect(service.create(dto, KEY, NOW)).resolves.toEqual({ reservation: winner, replayed: true });
  });

  it('retries with a new reference when the generated one already exists', async () => {
    const { service, save } = setup();
    save.mockRejectedValueOnce(pgError('23505', 'UQ_reservations_reference'));
    const { reservation } = await service.create(validDto(), KEY, NOW);
    expect(save).toHaveBeenCalledTimes(2);
    expect(reservation.reference).toMatch(/^RSV-/);
  });

  it('does not swallow unrelated database errors', async () => {
    const { service, save } = setup();
    save.mockRejectedValueOnce(new Error('connection lost'));
    await expect(service.create(validDto(), KEY, NOW)).rejects.toThrow('connection lost');
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('rejects an unknown or inactive room type', async () => {
    const { service } = setup({ roomTypeExists: false });
    await expect(service.create(validDto(), KEY, NOW)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('checks the booking rules before looking at availability', async () => {
    const { service, getMany, save } = setup();
    await expect(service.create(validDto({ guests: 3 }), KEY, NOW)).rejects.toBeInstanceOf(BadRequestException);
    expect(getMany).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
  });

  it('uses the hotel time zone to decide what "today" is', async () => {
    // 23:30 UTC on Oct 29 is already Oct 30 in Tokyo, so Oct 29 is in the past there.
    const lateEvening = new Date('2026-10-29T23:30:00Z');
    const dto = validDto({ checkIn: '2026-10-29', checkOut: '2026-10-31' });
    await expect(setup({ timeZone: 'UTC' }).service.create(dto, KEY, lateEvening)).resolves.toBeDefined();
    await expect(setup({ timeZone: 'Asia/Tokyo' }).service.create(dto, KEY, lateEvening)).rejects.toThrow('past');
  });
});
