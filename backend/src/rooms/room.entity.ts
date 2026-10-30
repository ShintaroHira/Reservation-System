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
  UpdateDateColumn,
} from 'typeorm';
import { RoomType } from './room-type.entity';

/** A physical room guests stay in, e.g. room 204, a Deluxe Room with an ocean view. */
@Entity({ name: 'rooms' })
@Unique('UQ_rooms_room_number', ['roomNumber'])
// Target of the reservations' composite foreign key, which keeps a booking's room
// and the room type it was priced from in agreement.
@Unique('UQ_rooms_id_room_type', ['id', 'roomTypeId'])
@Check('CHK_rooms_room_number', `"room_number" ~ '^[A-Za-z0-9-]{1,10}$'`)
@Check('CHK_rooms_summary', `btrim("summary") <> ''`)
@Index('IDX_rooms_room_type', ['roomTypeId'])
export class Room {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'PK_rooms' })
  id!: string;

  @Column({ name: 'room_number', type: 'varchar', length: 10 })
  roomNumber!: string;

  @Column({ name: 'room_type_id', type: 'uuid' })
  roomTypeId!: string;

  @ManyToOne(() => RoomType, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'room_type_id', foreignKeyConstraintName: 'FK_rooms_room_type' })
  roomType?: RoomType;

  /** What sets this room apart, e.g. "Ocean view, corner balcony". */
  @Column({ type: 'varchar', length: 160 })
  summary!: string;

  /** Off for rooms that are out of service indefinitely; dated closures are RoomBlocks. */
  @Column({ name: 'is_bookable', type: 'boolean', default: true })
  isBookable!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
