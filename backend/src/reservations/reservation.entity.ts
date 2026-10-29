import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Room } from '../rooms/room.entity';

export type ReservationStatus = 'pending' | 'confirmed' | 'cancelled';

@Entity({ name: 'reservations' })
@Unique('UQ_reservations_reference', ['reference'])
@Check('CHK_reservations_dates', '"check_out" > "check_in"')
@Check('CHK_reservations_nights', '"nights" > 0')
@Check('CHK_reservations_guests', '"guests" > 0')
@Check('CHK_reservations_total', '"total_cents" >= 0')
@Check('CHK_reservations_status', '"status" IN (\'pending\', \'confirmed\', \'cancelled\')')
@Index('IDX_reservations_room_dates', ['roomId', 'checkIn', 'checkOut'])
export class Reservation {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'PK_reservations' })
  id!: string;

  /** Human-friendly code shown to the guest, e.g. RSV-7KQ2MX. */
  @Column({ type: 'varchar', length: 16 })
  reference!: string;

  @Column({ name: 'room_id', type: 'uuid' })
  roomId!: string;

  @ManyToOne(() => Room, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'room_id', foreignKeyConstraintName: 'FK_reservations_room' })
  room?: Room;

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

  /** Rate at the time of the request, so later price changes don't alter it. */
  @Column({ name: 'nightly_rate_cents', type: 'integer' })
  nightlyRateCents!: number;

  @Column({ name: 'total_cents', type: 'integer' })
  totalCents!: number;

  @Column({ type: 'char', length: 3 })
  currency!: string;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status!: ReservationStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
