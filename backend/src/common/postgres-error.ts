import { QueryFailedError } from 'typeorm';

/** SQLSTATE codes the services react to. */
export const PG_UNIQUE_VIOLATION = '23505';
export const PG_EXCLUSION_VIOLATION = '23P01';

/** True when `error` is a PostgreSQL error with this SQLSTATE (and, if given, this constraint). */
export function isPostgresError(error: unknown, code: string, constraint?: string): boolean {
  if (!(error instanceof QueryFailedError)) return false;
  const driverError = error.driverError as { code?: string; constraint?: string } | undefined;
  return driverError?.code === code && (constraint === undefined || driverError.constraint === constraint);
}
