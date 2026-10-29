import { Check, Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'testimonials' })
@Unique('UQ_testimonials_slug', ['slug'])
@Check('CHK_testimonials_rating', '"rating" BETWEEN 1 AND 5')
export class Testimonial {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'PK_testimonials' })
  id!: string;

  /** Stable key so the seed script can upsert without duplicating rows. */
  @Column({ type: 'varchar', length: 64 })
  slug!: string;

  @Column({ name: 'author_name', type: 'varchar', length: 120 })
  authorName!: string;

  @Column({ type: 'varchar', length: 120 })
  location!: string;

  /** Review text without surrounding quotes. A `\n` marks a preferred line break. */
  @Column({ type: 'text' })
  quote!: string;

  @Column({ type: 'smallint' })
  rating!: number;

  @Column({ name: 'avatar_url', type: 'varchar', length: 255 })
  avatarUrl!: string;

  @Column({ name: 'sort_order', type: 'smallint', default: 0 })
  sortOrder!: number;

  @Column({ name: 'is_published', type: 'boolean', default: true })
  isPublished!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
