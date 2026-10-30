import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { todayIn } from '../common/calendar-date';
import { isPostgresError, PG_EXCLUSION_VIOLATION, PG_UNIQUE_VIOLATION } from '../common/postgres-error';
import type { Env } from '../config/env';
import { findBookingsHoldingNights, isRoomClosed, lockRoom } from '../rooms/room-occupancy';
import { RoomType } from '../rooms/room-type.entity';
import { Room } from '../rooms/room.entity';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { generateReference } from './reference';
import { requestFingerprint } from './request-fingerprint';
import { BLOCKING_STATUSES, Reservation } from './reservation.entity';
import { assertStayAllowed } from './stay-rules';

const MAX_REFERENCE_ATTEMPTS = 5;

/** Room numbers in natural order: 9 before 10, 101 before 1001. */
const roomNumberOrder = new Intl.Collator('en', { numeric: true });

export type CreatedReservation = Reservation & { roomType: RoomType; room: Room };

export interface BookingResult {
  reservation: CreatedReservation;
  /** True when the request repeated an earlier one and the earlier booking was returned. */
  replayed: boolean;
}

interface BookingTarget {
  roomType: RoomType;
  /** Set when the guest asked for one specific room. */
  room: Room | null;
}

/** Why a room couldn't take the stay: taken or closed, or a copy of this request got there first. */
type AttemptOutcome = Reservation | 'unavailable' | 'duplicate';

@Injectable()
export class ReservationsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(Reservation) private readonly reservations: Repository<Reservation>,
    @InjectRepository(RoomType) private readonly roomTypes: Repository<RoomType>,
    @InjectRepository(Room) private readonly rooms: Repository<Room>,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /**
   * Books a stay and confirms it at once (there is no payment step yet).
   *
   * - Repeats: a request whose idempotency key was already used returns that
   *   booking (or 422 if the key came with different details).
   * - Room type: the first free room of the type, in room-number order, is booked.
   * - Double bookings: the database rejects overlapping stays in the same room
   *   (EX_reservations_no_overlap). If another guest takes a room between our
   *   check and our insert, the next room is tried; when none is left, 409.
   */
  async create(dto: CreateReservationDto, idempotencyKey: string, now: Date = new Date()): Promise<BookingResult> {
    const fingerprint = requestFingerprint(dto);
    const earlier = await this.findEarlierBooking(idempotencyKey, fingerprint);
    if (earlier) return { reservation: earlier, replayed: true };

    const { roomType, room: requestedRoom } = await this.resolveTarget(dto);
    const today = todayIn(this.config.get('HOTEL_TIMEZONE', { infer: true }), now);
    // The stay rules run before any availability is looked at (or revealed).
    const nights = assertStayAllowed(dto, roomType, today);

    const candidates = requestedRoom ? [requestedRoom] : await this.findFreeRooms(roomType.id, dto.checkIn, dto.checkOut);
    for (const room of candidates) {
      const outcome = await this.tryBook(room, roomType, dto, nights, idempotencyKey, fingerprint);
      if (outcome === 'unavailable') continue;
      if (outcome === 'duplicate') break;
      return { reservation: Object.assign(outcome, { roomType, room }), replayed: false };
    }

    // A simultaneous copy of this request may have taken the last room.
    const raced = await this.findEarlierBooking(idempotencyKey, fingerprint);
    if (raced) return { reservation: raced, replayed: true };
    throw new ConflictException(
      requestedRoom
        ? `Sorry, room ${requestedRoom.roomNumber} is not available for those dates. Please choose different dates.`
        : `Sorry, there is no ${roomType.name} available for those dates. Please try different dates or another room.`,
    );
  }

  private async findEarlierBooking(idempotencyKey: string, fingerprint: string): Promise<CreatedReservation | null> {
    const existing = await this.reservations.findOne({
      where: { idempotencyKey },
      relations: { roomType: true, room: true },
    });
    if (!existing) return null;
    if (existing.requestFingerprint !== fingerprint) {
      throw new UnprocessableEntityException(
        'This booking was already sent with different details. Please refresh the page and try again.',
      );
    }
    // Bookings made through this API always have a room.
    return existing as CreatedReservation;
  }

  private async resolveTarget(dto: CreateReservationDto): Promise<BookingTarget> {
    if (dto.roomId) {
      const room = await this.rooms.findOne({ where: { id: dto.roomId }, relations: { roomType: true } });
      if (!room?.roomType?.isActive) throw new NotFoundException('The selected room is not available.');
      return { roomType: room.roomType, room };
    }
    const roomType = await this.roomTypes.findOneBy({ id: dto.roomTypeId, isActive: true });
    if (!roomType) throw new NotFoundException('The selected room is not available.');
    return { roomType, room: null };
  }

  /** Bookable rooms of the type with no booking or closure on any night of the stay. */
  private async findFreeRooms(roomTypeId: string, checkIn: string, checkOut: string): Promise<Room[]> {
    const rooms = await this.rooms
      .createQueryBuilder('room')
      .where('room.roomTypeId = :roomTypeId', { roomTypeId })
      .andWhere('room.isBookable = true')
      .andWhere(
        `NOT EXISTS (
          SELECT 1 FROM "reservations" "booking"
           WHERE "booking"."room_id" = "room"."id"
             AND "booking"."status" = ANY(CAST(:statuses AS varchar[]))
             AND daterange("booking"."check_in", "booking"."check_out", '[)')
                 && daterange(CAST(:checkIn AS date), CAST(:checkOut AS date), '[)'))`,
      )
      .andWhere(
        `NOT EXISTS (
          SELECT 1 FROM "room_blocks" "block"
           WHERE "block"."room_id" = "room"."id"
             AND "block"."start_date" < CAST(:checkOut AS date)
             AND "block"."end_date" > CAST(:checkIn AS date))`,
      )
      .setParameters({ statuses: BLOCKING_STATUSES, checkIn, checkOut })
      .getMany();
    return rooms.sort((a, b) => roomNumberOrder.compare(a.roomNumber, b.roomNumber));
  }

  /**
   * One attempt at one room, in its own transaction. The room's row is locked
   * first, so bookings and closures for a room are decided one at a time and a
   * taken room is noticed here, as an ordinary outcome. The exclusion constraint
   * is what guarantees it: it holds even if something writes around this code.
   */
  private async tryBook(
    room: Room,
    roomType: RoomType,
    dto: CreateReservationDto,
    nights: number,
    idempotencyKey: string,
    requestFingerprint: string,
  ): Promise<AttemptOutcome> {
    for (let attempt = 1; ; attempt += 1) {
      try {
        return await this.dataSource.transaction(async (manager): Promise<AttemptOutcome> => {
          const locked = await lockRoom(manager, room.id);
          if (!locked?.isBookable) return 'unavailable';
          if (await isRoomClosed(manager, room.id, dto.checkIn, dto.checkOut)) return 'unavailable';
          const holders = await findBookingsHoldingNights(manager, room.id, dto.checkIn, dto.checkOut);
          if (holders.length > 0) return 'unavailable';

          const repository = manager.getRepository(Reservation);
          return repository.save(
            repository.create({
              reference: generateReference(),
              roomTypeId: roomType.id,
              roomId: room.id,
              checkIn: dto.checkIn,
              checkOut: dto.checkOut,
              nights,
              guests: dto.guests,
              fullName: dto.fullName,
              email: dto.email,
              phone: dto.phone ?? null,
              specialRequests: dto.specialRequests ?? null,
              arrivalTime: dto.arrivalTime ?? null,
              nightlyRateCents: roomType.nightlyRateCents,
              totalCents: nights * roomType.nightlyRateCents,
              currency: roomType.currency,
              status: 'confirmed',
              idempotencyKey,
              requestFingerprint,
            }),
          );
        });
      } catch (error) {
        if (isPostgresError(error, PG_EXCLUSION_VIOLATION, 'EX_reservations_no_overlap')) return 'unavailable';
        if (isPostgresError(error, PG_UNIQUE_VIOLATION, 'UQ_reservations_idempotency_key')) return 'duplicate';
        if (isPostgresError(error, PG_UNIQUE_VIOLATION, 'UQ_reservations_reference') && attempt < MAX_REFERENCE_ATTEMPTS) {
          continue;
        }
        throw error;
      }
    }
  }
}
