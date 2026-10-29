import { Check, Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'rooms' })
@Unique('UQ_rooms_slug', ['slug'])
@Check('CHK_rooms_max_guests', '"max_guests" BETWEEN 1 AND 20')
@Check('CHK_rooms_nightly_rate', '"nightly_rate_cents" >= 0')
export class Room {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'PK_rooms' })
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

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
