/**
 * Typed, validated environment configuration.
 *
 * Used by Nest's ConfigModule (`validate`) and by the standalone TypeORM CLI /
 * seed scripts, so every entry point fails fast with the same clear message.
 */
export interface Env {
  NODE_ENV: 'development' | 'production' | 'test';
  HOST: string;
  PORT: number;
  DATABASE_URL: string;
  DB_RUN_MIGRATIONS: boolean;
  CORS_ORIGINS: string[];
  HOTEL_TIMEZONE: string;
  TRUST_PROXY: boolean;
}

const NODE_ENVS: ReadonlyArray<Env['NODE_ENV']> = ['development', 'production', 'test'];

function readString(raw: Record<string, unknown>, key: string, fallback?: string): string {
  const value = raw[key];
  if (typeof value === 'string' && value.trim() !== '') return value.trim();
  if (fallback !== undefined) return fallback;
  throw new Error(`Missing required environment variable ${key}`);
}

function readBoolean(raw: Record<string, unknown>, key: string, fallback: boolean): boolean {
  const value = raw[key];
  if (value === undefined || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes'].includes(normalized)) return true;
  if (['false', '0', 'no'].includes(normalized)) return false;
  throw new Error(`Environment variable ${key} must be a boolean (true/false), got "${String(value)}"`);
}

function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

export function validateEnv(raw: Record<string, unknown>): Env {
  const nodeEnv = readString(raw, 'NODE_ENV', 'development') as Env['NODE_ENV'];
  if (!NODE_ENVS.includes(nodeEnv)) {
    throw new Error(`NODE_ENV must be one of ${NODE_ENVS.join(', ')}`);
  }

  const port = Number(readString(raw, 'PORT', '4100'));
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }

  const databaseUrl = readString(raw, 'DATABASE_URL');
  if (!/^postgres(ql)?:\/\//.test(databaseUrl)) {
    throw new Error('DATABASE_URL must be a postgres:// connection string');
  }

  const hotelTimeZone = readString(raw, 'HOTEL_TIMEZONE', 'UTC');
  if (!isValidTimeZone(hotelTimeZone)) {
    throw new Error(`HOTEL_TIMEZONE "${hotelTimeZone}" is not a valid IANA time zone`);
  }

  const corsOrigins = readString(raw, 'CORS_ORIGINS', 'http://localhost:3100')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);

  return {
    NODE_ENV: nodeEnv,
    HOST: readString(raw, 'HOST', '127.0.0.1'),
    PORT: port,
    DATABASE_URL: databaseUrl,
    DB_RUN_MIGRATIONS: readBoolean(raw, 'DB_RUN_MIGRATIONS', true),
    CORS_ORIGINS: corsOrigins,
    HOTEL_TIMEZONE: hotelTimeZone,
    TRUST_PROXY: readBoolean(raw, 'TRUST_PROXY', false),
  };
}

/** Loads `.env` into process.env for scripts that run outside Nest (CLI, seed). */
export function loadDotEnv(path = '.env'): void {
  try {
    process.loadEnvFile(path);
  } catch (error) {
    // A missing file is fine (variables may come from the real environment).
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
}
