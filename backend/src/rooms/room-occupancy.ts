import type { EntityManager } from 'typeorm';
import { BLOCKING_STATUSES } from '../reservations/reservation.entity';

/*
 * Queries shared by bookings and room closures. Both run inside a transaction
 * that first locks the room's row with `lockRoom`, so a booking and a closure
 * for the same room can never be decided at the same time. (The exclusion
 * constraint covers booking against booking on its own, but no constraint can
 * compare rows of two different tables.)
 *
 * Date ranges are half-open everywhere: [check-in, check-out), [start, end).
 */

export interface LockedRoom {
  id: string;
  roomNumber: string;
  isBookable: boolean;
}

/** Locks the room's row until the transaction ends. Returns null if the room doesn't exist. */
export async function lockRoom(manager: EntityManager, roomId: string): Promise<LockedRoom | null> {
  const rows = (await manager.query(
    `SELECT "id", "room_number" AS "roomNumber", "is_bookable" AS "isBookable"
       FROM "rooms" WHERE "id" = $1 FOR UPDATE`,
    [roomId],
  )) as LockedRoom[];
  return rows[0] ?? null;
}

export async function isRoomClosed(
  manager: EntityManager,
  roomId: string,
  start: string,
  end: string,
): Promise<boolean> {
  const rows = (await manager.query(
    `SELECT 1 FROM "room_blocks"
      WHERE "room_id" = $1 AND "start_date" < $3::date AND "end_date" > $2::date
      LIMIT 1`,
    [roomId, start, end],
  )) as unknown[];
  return rows.length > 0;
}

/** References of the bookings that hold any of the room's nights in [start, end). */
export async function findBookingsHoldingNights(
  manager: EntityManager,
  roomId: string,
  start: string,
  end: string,
): Promise<string[]> {
  const rows = (await manager.query(
    `SELECT "reference" FROM "reservations"
      WHERE "room_id" = $1
        AND "status" = ANY($4::varchar[])
        AND daterange("check_in", "check_out", '[)') && daterange($2::date, $3::date, '[)')
      ORDER BY "check_in"`,
    [roomId, start, end, BLOCKING_STATUSES],
  )) as { reference: string }[];
  return rows.map((row) => row.reference);
}
