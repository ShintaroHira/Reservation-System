import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Individual rooms, dated room closures and the database rule against double bookings.
 *
 * - `rooms` becomes `room_types` (the landing page keeps reading it unchanged).
 * - A new `rooms` table holds the physical rooms; `room_blocks` holds closures.
 * - Each reservation now belongs to a room. Requests saved before this migration
 *   keep their room type and get no room: they are left for the hotel to assign
 *   or cancel, and don't hold any nights.
 * - New stages, an arrival time, and an idempotency key for repeated requests.
 * - EX_reservations_no_overlap: no two active stays in the same room may share a night.
 */
export class RoomInventory1793318400000 implements MigrationInterface {
  name = 'RoomInventory1793318400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Nothing is guessed about bookings: rooms are seeded after migrations run, so a
    // confirmed booking would be left holding no room. Stop before changing anything.
    const confirmedWithoutRoom = (await queryRunner.query(
      `SELECT "reference" FROM "reservations" WHERE "status" = 'confirmed' ORDER BY "reference"`,
    )) as { reference: string }[];
    if (confirmedWithoutRoom.length > 0) {
      throw new Error(
        `Confirmed reservations have no room to move to: ${confirmedWithoutRoom.map((r) => r.reference).join(', ')}. ` +
          'Set them back to pending (or cancel them) and run the migration again.',
      );
    }

    // Lets a GiST index compare uuids with `=`, next to the date-range overlap.
    // btree_gist is a trusted extension, so the database owner may create it.
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS btree_gist`);

    // --- room types ---------------------------------------------------------
    await queryRunner.query(`ALTER TABLE "rooms" RENAME TO "room_types"`);
    await queryRunner.query(`ALTER TABLE "room_types" RENAME CONSTRAINT "PK_rooms" TO "PK_room_types"`);
    await queryRunner.query(`ALTER TABLE "room_types" RENAME CONSTRAINT "UQ_rooms_slug" TO "UQ_room_types_slug"`);
    await queryRunner.query(
      `ALTER TABLE "room_types" RENAME CONSTRAINT "CHK_rooms_max_guests" TO "CHK_room_types_max_guests"`,
    );
    await queryRunner.query(
      `ALTER TABLE "room_types" RENAME CONSTRAINT "CHK_rooms_nightly_rate" TO "CHK_room_types_nightly_rate"`,
    );

    // --- rooms --------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "rooms" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "room_number" character varying(10) NOT NULL,
        "room_type_id" uuid NOT NULL,
        "summary" character varying(160) NOT NULL,
        "is_bookable" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_rooms" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_rooms_room_number" UNIQUE ("room_number"),
        CONSTRAINT "UQ_rooms_id_room_type" UNIQUE ("id", "room_type_id"),
        CONSTRAINT "CHK_rooms_room_number" CHECK ("room_number" ~ '^[A-Za-z0-9-]{1,10}$'),
        CONSTRAINT "CHK_rooms_summary" CHECK (btrim("summary") <> ''),
        CONSTRAINT "FK_rooms_room_type" FOREIGN KEY ("room_type_id")
          REFERENCES "room_types" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_rooms_room_type" ON "rooms" ("room_type_id")`);

    // --- room closures ------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "room_blocks" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "room_id" uuid NOT NULL,
        "start_date" date NOT NULL,
        "end_date" date NOT NULL,
        "reason" character varying(255) NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_room_blocks" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_room_blocks_dates" CHECK ("end_date" > "start_date"),
        CONSTRAINT "CHK_room_blocks_reason" CHECK (btrim("reason") <> ''),
        CONSTRAINT "FK_room_blocks_room" FOREIGN KEY ("room_id")
          REFERENCES "rooms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_room_blocks_room_dates" ON "room_blocks" ("room_id", "start_date", "end_date")`,
    );

    // --- reservations -------------------------------------------------------
    // The existing column pointed at what is now a room type.
    await queryRunner.query(`ALTER TABLE "reservations" RENAME COLUMN "room_id" TO "room_type_id"`);
    await queryRunner.query(
      `ALTER TABLE "reservations" RENAME CONSTRAINT "FK_reservations_room" TO "FK_reservations_room_type"`,
    );
    await queryRunner.query(`ALTER INDEX "IDX_reservations_room_dates" RENAME TO "IDX_reservations_room_type_dates"`);

    await queryRunner.query(`
      ALTER TABLE "reservations"
        ADD COLUMN "room_id" uuid,
        ADD COLUMN "arrival_time" time without time zone,
        ADD COLUMN "idempotency_key" uuid,
        ADD COLUMN "request_fingerprint" character(64)
    `);
    // Composite, so a booking's room always belongs to the room type it was priced from.
    // RESTRICT on update: a room can't change type while bookings point at it.
    await queryRunner.query(`
      ALTER TABLE "reservations"
        ADD CONSTRAINT "FK_reservations_room" FOREIGN KEY ("room_id", "room_type_id")
          REFERENCES "rooms" ("id", "room_type_id") ON DELETE RESTRICT ON UPDATE RESTRICT,
        ADD CONSTRAINT "UQ_reservations_idempotency_key" UNIQUE ("idempotency_key"),
        ADD CONSTRAINT "CHK_reservations_idempotency"
          CHECK (("idempotency_key" IS NULL) = ("request_fingerprint" IS NULL))
    `);

    await queryRunner.query(`ALTER TABLE "reservations" DROP CONSTRAINT "CHK_reservations_status"`);
    await queryRunner.query(`
      ALTER TABLE "reservations"
        ADD CONSTRAINT "CHK_reservations_status"
          CHECK ("status" IN ('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show')),
        ADD CONSTRAINT "CHK_reservations_room_assigned"
          CHECK ("room_id" IS NOT NULL OR "status" IN ('pending', 'cancelled')),
        ALTER COLUMN "status" SET DEFAULT 'confirmed'
    `);

    await queryRunner.query(`
      ALTER TABLE "reservations"
        ADD CONSTRAINT "EX_reservations_no_overlap" EXCLUDE USING gist (
          "room_id" WITH =,
          daterange("check_in", "check_out", '[)') WITH &&
        ) WHERE ("status" IN ('pending', 'confirmed', 'checked_in'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Lossy by nature: room assignments, closures, arrival times and idempotency
    // keys have nowhere to go. Stages the old schema doesn't know are folded into
    // the nearest one it does.
    await queryRunner.query(`ALTER TABLE "reservations" DROP CONSTRAINT "EX_reservations_no_overlap"`);
    await queryRunner.query(`
      ALTER TABLE "reservations"
        DROP CONSTRAINT "CHK_reservations_room_assigned",
        DROP CONSTRAINT "CHK_reservations_status",
        DROP CONSTRAINT "CHK_reservations_idempotency",
        DROP CONSTRAINT "UQ_reservations_idempotency_key",
        DROP CONSTRAINT "FK_reservations_room"
    `);
    await queryRunner.query(`
      UPDATE "reservations" SET "status" = CASE "status"
        WHEN 'checked_in' THEN 'confirmed'
        WHEN 'checked_out' THEN 'confirmed'
        WHEN 'no_show' THEN 'cancelled'
        ELSE "status"
      END
    `);
    await queryRunner.query(`
      ALTER TABLE "reservations"
        ADD CONSTRAINT "CHK_reservations_status" CHECK ("status" IN ('pending', 'confirmed', 'cancelled')),
        ALTER COLUMN "status" SET DEFAULT 'pending',
        DROP COLUMN "request_fingerprint",
        DROP COLUMN "idempotency_key",
        DROP COLUMN "arrival_time",
        DROP COLUMN "room_id"
    `);
    await queryRunner.query(`ALTER INDEX "IDX_reservations_room_type_dates" RENAME TO "IDX_reservations_room_dates"`);
    await queryRunner.query(
      `ALTER TABLE "reservations" RENAME CONSTRAINT "FK_reservations_room_type" TO "FK_reservations_room"`,
    );
    await queryRunner.query(`ALTER TABLE "reservations" RENAME COLUMN "room_type_id" TO "room_id"`);

    await queryRunner.query(`DROP TABLE "room_blocks"`);
    await queryRunner.query(`DROP TABLE "rooms"`);

    await queryRunner.query(
      `ALTER TABLE "room_types" RENAME CONSTRAINT "CHK_room_types_nightly_rate" TO "CHK_rooms_nightly_rate"`,
    );
    await queryRunner.query(
      `ALTER TABLE "room_types" RENAME CONSTRAINT "CHK_room_types_max_guests" TO "CHK_rooms_max_guests"`,
    );
    await queryRunner.query(`ALTER TABLE "room_types" RENAME CONSTRAINT "UQ_room_types_slug" TO "UQ_rooms_slug"`);
    await queryRunner.query(`ALTER TABLE "room_types" RENAME CONSTRAINT "PK_room_types" TO "PK_rooms"`);
    await queryRunner.query(`ALTER TABLE "room_types" RENAME TO "rooms"`);
    // btree_gist stays installed: other objects may rely on it, and it is harmless.
  }
}
