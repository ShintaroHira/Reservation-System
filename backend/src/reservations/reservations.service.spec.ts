import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { QueryFailedError, type Repository } from 'typeorm';
import type { Env } from '../config/env';
import type { Room } from '../rooms/room.entity';
import type { RoomsService } from '../rooms/rooms.service';
import type { CreateReservationDto } from './dto/create-reservation.dto';
import type { Reservation } from './reservation.entity';
import { ReservationsService } from './reservations.service';

const NOW = new Date('2026-10-29T12:00:00Z');

const room = {
  id: '6f1c2a40-8b7e-4d4a-9a55-0d6c1f3e9b21',
  name: 'Deluxe Room',
  maxGuests: 2,
  nightlyRateCents: 16900,
  currency: 'USD',
} as Room;

function validDto(overrides: Partial<CreateReservationDto> = {}): CreateReservationDto {
  return {
    roomId: room.id,
    checkIn: '2026-11-05',
    checkOut: '2026-11-08',
    guests: 2,
    fullName: 'Emily Carter',
    email: 'emily@example.com',
    ...overrides,
  };
}

function setup(options: { roomExists?: boolean; timeZone?: string } = {}) {
  const save = jest.fn(async (entity: Partial<Reservation>) => ({
    ...entity,
    id: 'res-1',
    createdAt: NOW,
  }));
  const repository = {
    create: jest.fn((entity: Partial<Reservation>) => entity),
    save,
  } as unknown as Repository<Reservation>;
  const roomsService = {
    findActiveById: jest.fn(async () => (options.roomExists === false ? null : room)),
  } as unknown as RoomsService;
  const config = {
    get: jest.fn(() => options.timeZone ?? 'UTC'),
  } as unknown as ConfigService<Env, true>;
  return { service: new ReservationsService(repository, roomsService, config), save };
}

describe('ReservationsService.create', () => {
  it('stores a pending request with nights and total computed from the room rate', async () => {
    const { service, save } = setup();
    const result = await service.create(validDto({ phone: '+1 555 0100' }), NOW);

    expect(result.nights).toBe(3);
    expect(result.totalCents).toBe(3 * 16900);
    expect(result.nightlyRateCents).toBe(16900);
    expect(result.status).toBe('pending');
    expect(result.reference).toMatch(/^RSV-[A-HJ-NP-Z2-9]{6}$/);
    expect(result.room).toBe(room);
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ phone: '+1 555 0100', specialRequests: null }));
  });

  it('accepts a same-day check-in', async () => {
    const { service } = setup();
    await expect(service.create(validDto({ checkIn: '2026-10-29', checkOut: '2026-10-30' }), NOW)).resolves.toMatchObject({
      nights: 1,
    });
  });

  it('rejects an unknown or inactive room', async () => {
    const { service } = setup({ roomExists: false });
    await expect(service.create(validDto(), NOW)).rejects.toBeInstanceOf(NotFoundException);
  });

  it.each([
    ['check-in in the past', { checkIn: '2026-10-28', checkOut: '2026-10-30' }, 'past'],
    ['check-out on the check-in day', { checkOut: '2026-11-05' }, 'at least one night'],
    ['check-out before check-in', { checkOut: '2026-11-01' }, 'at least one night'],
    ['stay longer than 30 nights', { checkOut: '2026-12-06' }, '30 nights'],
    ['check-in beyond the booking window', { checkIn: '2027-10-30', checkOut: '2027-11-01' }, '365 days'],
    ['more guests than the room allows', { guests: 3 }, 'up to 2 guests'],
  ])('rejects %s', async (_label, overrides, message) => {
    const { service, save } = setup();
    const attempt = service.create(validDto(overrides), NOW);
    await expect(attempt).rejects.toBeInstanceOf(BadRequestException);
    await expect(attempt).rejects.toThrow(message);
    expect(save).not.toHaveBeenCalled();
  });

  it('uses the hotel time zone to decide what "today" is', async () => {
    // 23:30 UTC on Oct 29 is already Oct 30 in Tokyo, so Oct 29 is in the past there.
    const lateEvening = new Date('2026-10-29T23:30:00Z');
    const dto = validDto({ checkIn: '2026-10-29', checkOut: '2026-10-31' });
    await expect(setup({ timeZone: 'UTC' }).service.create(dto, lateEvening)).resolves.toBeDefined();
    await expect(setup({ timeZone: 'Asia/Tokyo' }).service.create(dto, lateEvening)).rejects.toThrow('past');
  });

  it('retries with a new reference when the generated one already exists', async () => {
    const { service, save } = setup();
    const collision = new QueryFailedError('INSERT', [], Object.assign(new Error('duplicate key'), {
      code: '23505',
      constraint: 'UQ_reservations_reference',
    }));
    save.mockRejectedValueOnce(collision);

    const result = await service.create(validDto(), NOW);
    expect(save).toHaveBeenCalledTimes(2);
    expect(result.reference).toMatch(/^RSV-/);
  });

  it('does not swallow unrelated database errors', async () => {
    const { service, save } = setup();
    save.mockRejectedValueOnce(new Error('connection lost'));
    await expect(service.create(validDto(), NOW)).rejects.toThrow('connection lost');
    expect(save).toHaveBeenCalledTimes(1);
  });
});
