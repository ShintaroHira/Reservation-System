import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Exclusion,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { RoomType } from '../rooms/room-type.entity';
import { Room } from '../rooms/room.entity';

export const RESERVATION_STATUSES = [
  'pending',
  'confirmed',
  'checked_in',
  'checked_out',
  'cancelled',
  'no_show',
] as const;

/**
 * Lifecycle: confirmed → checked_in → checked_out, or cancelled / no_show.
 * `pending` only exists on requests saved before bookings were confirmed
 * instantly; new bookings are never created as pending.
 */
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

/** Stages that hold the room's nights. Must match the WHERE clause of EX_reservations_no_overlap. */
export const BLOCKING_STATUSES: readonly ReservationStatus[] = ['pending', 'confirmed', 'checked_in'];

@Entity({ name: 'reservations' })
@Unique('UQ_reservations_reference', ['reference'])
@Unique('UQ_reservations_idempotency_key', ['idempotencyKey'])
@Check('CHK_reservations_dates', '"check_out" > "check_in"')
@Check('CHK_reservations_nights', '"nights" > 0')
@Check('CHK_reservations_guests', '"guests" > 0')
@Check('CHK_reservations_total', '"total_cents" >= 0')
@Check(
  'CHK_reservations_status',
  `"status" IN ('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show')`,
)
// Only requests saved before rooms existed may lack a room, and they never hold nights.
@Check('CHK_reservations_room_assigned', `"room_id" IS NOT NULL OR "status" IN ('pending', 'cancelled')`)
@Check('CHK_reservations_idempotency', '("idempotency_key" IS NULL) = ("request_fingerprint" IS NULL)')
// The guarantee against double bookings: the database itself rejects a second
// stay in the same room on any of the same nights, however the rows arrive.
// Ranges are half-open, so a check-out and a check-in on the same day don't clash.
@Exclusion(
  'EX_reservations_no_overlap',
  `USING gist ("room_id" WITH =, daterange("check_in", "check_out", '[)') WITH &&) WHERE ("status" IN ('pending', 'confirmed', 'checked_in'))`,
)
@Index('IDX_reservations_room_type_dates', ['roomTypeId', 'checkIn', 'checkOut'])
export class Reservation {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'PK_reservations' })
  id!: string;

  /** Human-friendly code shown to the guest, e.g. RSV-7KQ2MX. */
  @Column({ type: 'varchar', length: 16 })
  reference!: string;

  /** The room type the stay was priced from. */
  @Column({ name: 'room_type_id', type: 'uuid' })
  roomTypeId!: string;

  @ManyToOne(() => RoomType, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'room_type_id', foreignKeyConstraintName: 'FK_reservations_room_type' })
  roomType?: RoomType;

  /** The room the guest stays in. Null only on requests saved before rooms existed. */
  @Column({ name: 'room_id', type: 'uuid', nullable: true })
  roomId!: string | null;

  // The real foreign key is composite, (room_id, room_type_id) → rooms (id, room_type_id),
  // so a booking's room always belongs to its room type. TypeORM can't model a key that
  // shares a column with another relation, so it lives in the migration
  // (FK_reservations_room) and the relation here is read-only.
  @ManyToOne(() => Room, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'room_id' })
  room?: Room | null;

  /** Calendar dates (`YYYY-MM-DD`). TypeORM maps Postgres `date` to strings. */
  @Column({ name: 'check_in', type: 'date' })
  checkIn!: string;

  @Column({ name: 'check_out', type: 'date' })
  checkOut!: string;

  @Column({ type: 'smallint' })
  nights!: number;

  @Column({ type: 'smallint' })
  guests!: number;

  @Column({ name: 'full_name', type: 'varchar', length: 120 })
  fullName!: string;

  @Column({ type: 'varchar', length: 254 })
  email!: string;

  @Column({ type: 'varchar', length: 40, nullable: true })
  phone!: string | null;

  @Column({ name: 'special_requests', type: 'text', nullable: true })
  specialRequests!: string | null;

  /** Guest's expected arrival time at the hotel (`HH:MM:SS` as returned by Postgres). */
  @Column({ name: 'arrival_time', type: 'time', nullable: true })
  arrivalTime!: string | null;

  /** Rate at the time of booking, so later price changes don't alter it. */
  @Column({ name: 'nightly_rate_cents', type: 'integer' })
  nightlyRateCents!: number;

  @Column({ name: 'total_cents', type: 'integer' })
  totalCents!: number;

  @Column({ type: 'char', length: 3 })
  currency!: string;

  @Column({ type: 'varchar', length: 20, default: 'confirmed' })
  status!: ReservationStatus;

  /**
   * Client-generated key for one booking attempt (the Idempotency-Key header).
   * A repeated request with the same key returns this booking instead of a new one.
   */
  @Column({ name: 'idempotency_key', type: 'uuid', nullable: true })
  idempotencyKey!: string | null;

  /** SHA-256 of the request that used the key, to tell a true repeat from a reused key. */
  @Column({ name: 'request_fingerprint', type: 'char', length: 64, nullable: true })
  requestFingerprint!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
