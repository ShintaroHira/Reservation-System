import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1793232000000 implements MigrationInterface {
  name = 'InitialSchema1793232000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // gen_random_uuid() is built into PostgreSQL 13+, so no extension is required.
    await queryRunner.query(`
      CREATE TABLE "rooms" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "slug" character varying(64) NOT NULL,
        "name" character varying(120) NOT NULL,
        "description" character varying(255) NOT NULL,
        "bed_label" character varying(60) NOT NULL,
        "max_guests" smallint NOT NULL,
        "nightly_rate_cents" integer NOT NULL,
        "currency" character(3) NOT NULL DEFAULT 'USD',
        "image_url" character varying(255) NOT NULL,
        "image_alt" character varying(255) NOT NULL,
        "sort_order" smallint NOT NULL DEFAULT 0,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_rooms" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_rooms_slug" UNIQUE ("slug"),
        CONSTRAINT "CHK_rooms_max_guests" CHECK ("max_guests" BETWEEN 1 AND 20),
        CONSTRAINT "CHK_rooms_nightly_rate" CHECK ("nightly_rate_cents" >= 0)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "testimonials" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "slug" character varying(64) NOT NULL,
        "author_name" character varying(120) NOT NULL,
        "location" character varying(120) NOT NULL,
        "quote" text NOT NULL,
        "rating" smallint NOT NULL,
        "avatar_url" character varying(255) NOT NULL,
        "sort_order" smallint NOT NULL DEFAULT 0,
        "is_published" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_testimonials" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_testimonials_slug" UNIQUE ("slug"),
        CONSTRAINT "CHK_testimonials_rating" CHECK ("rating" BETWEEN 1 AND 5)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "reservations" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "reference" character varying(16) NOT NULL,
        "room_id" uuid NOT NULL,
        "check_in" date NOT NULL,
        "check_out" date NOT NULL,
        "nights" smallint NOT NULL,
        "guests" smallint NOT NULL,
        "full_name" character varying(120) NOT NULL,
        "email" character varying(254) NOT NULL,
        "phone" character varying(40),
        "special_requests" text,
        "nightly_rate_cents" integer NOT NULL,
        "total_cents" integer NOT NULL,
        "currency" character(3) NOT NULL,
        "status" character varying(20) NOT NULL DEFAULT 'pending',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_reservations" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_reservations_reference" UNIQUE ("reference"),
        CONSTRAINT "CHK_reservations_dates" CHECK ("check_out" > "check_in"),
        CONSTRAINT "CHK_reservations_nights" CHECK ("nights" > 0),
        CONSTRAINT "CHK_reservations_guests" CHECK ("guests" > 0),
        CONSTRAINT "CHK_reservations_total" CHECK ("total_cents" >= 0),
        CONSTRAINT "CHK_reservations_status" CHECK ("status" IN ('pending', 'confirmed', 'cancelled')),
        CONSTRAINT "FK_reservations_room" FOREIGN KEY ("room_id")
          REFERENCES "rooms" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_reservations_room_dates" ON "reservations" ("room_id", "check_in", "check_out")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_reservations_room_dates"`);
    await queryRunner.query(`DROP TABLE "reservations"`);
    await queryRunner.query(`DROP TABLE "testimonials"`);
    await queryRunner.query(`DROP TABLE "rooms"`);
  }
}
