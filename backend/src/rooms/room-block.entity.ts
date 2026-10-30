import { Check, Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Room } from './room.entity';

/**
 * Dates a room is closed, e.g. for repairs. Like a stay, the range is half-open:
 * `startDate` is the first closed night and `endDate` the first night the room
 * is open again.
 */
@Entity({ name: 'room_blocks' })
@Check('CHK_room_blocks_dates', '"end_date" > "start_date"')
@Check('CHK_room_blocks_reason', `btrim("reason") <> ''`)
@Index('IDX_room_blocks_room_dates', ['roomId', 'startDate', 'endDate'])
export class RoomBlock {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'PK_room_blocks' })
  id!: string;

  @Column({ name: 'room_id', type: 'uuid' })
  roomId!: string;

  @ManyToOne(() => Room, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'room_id', foreignKeyConstraintName: 'FK_room_blocks_room' })
  room?: Room;

  @Column({ name: 'start_date', type: 'date' })
  startDate!: string;

  @Column({ name: 'end_date', type: 'date' })
  endDate!: string;

  @Column({ type: 'varchar', length: 255 })
  reason!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
