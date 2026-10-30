import { Check, Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';

/**
 * A kind of room the hotel sells (Standard Room, Deluxe Room, ...): the marketing
 * copy, photo, capacity and nightly rate shown on the landing page. The physical
 * rooms guests stay in are {@link Room} rows that point at a type.
 */
@Entity({ name: 'room_types' })
@Unique('UQ_room_types_slug', ['slug'])
@Check('CHK_room_types_max_guests', '"max_guests" BETWEEN 1 AND 20')
@Check('CHK_room_types_nightly_rate', '"nightly_rate_cents" >= 0')
export class RoomType {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'PK_room_types' })
  id!: string;

  @Column({ type: 'varchar', length: 64 })
  slug!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  /** Short marketing copy. A `\n` marks the preferred line break on wide screens. */
  @Column({ type: 'varchar', length: 255 })
  description!: string;

  @Column({ name: 'bed_label', type: 'varchar', length: 60 })
  bedLabel!: string;

  @Column({ name: 'max_guests', type: 'smallint' })
  maxGuests!: number;

  /** Price per night in minor units (cents) to avoid floating-point money. */
  @Column({ name: 'nightly_rate_cents', type: 'integer' })
  nightlyRateCents!: number;

  @Column({ type: 'char', length: 3, default: 'USD' })
  currency!: string;

  @Column({ name: 'image_url', type: 'varchar', length: 255 })
  imageUrl!: string;

  @Column({ name: 'image_alt', type: 'varchar', length: 255 })
  imageAlt!: string;

  @Column({ name: 'sort_order', type: 'smallint', default: 0 })
  sortOrder!: number;

  /** Shown on the site and open for booking. */
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
