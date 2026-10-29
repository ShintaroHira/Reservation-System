import 'server-only';
import { cacheLife, cacheTag } from 'next/cache';
import type { Room, Testimonial } from './types';

/** Base URL the Next.js server uses to reach the API (can be an internal address). */
const API_URL = (process.env.API_URL ?? 'http://127.0.0.1:4100/api').replace(/\/$/, '');

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    // The surrounding 'use cache' scope is the only cache layer. Without this the
    // response would also land in .next/cache/fetch-cache, which is shared
    // between builds, so a rebuild could ship data older than the database.
    cache: 'no-store',
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error(`GET ${path} responded ${response.status}`);
  return (await response.json()) as T;
}

/**
 * Cached for minutes and baked into the static shell when the API is up.
 * When the API is down the failure is cached only for seconds: the section
 * turns into a request-time hole and recovers on its own once the API is back.
 */
export async function getRooms(): Promise<Room[] | null> {
  'use cache';
  cacheTag('rooms');
  try {
    const rooms = await getJson<Room[]>('/rooms');
    cacheLife('minutes');
    return rooms;
  } catch (error) {
    console.error('[api] Failed to load rooms:', error);
    cacheLife('seconds');
    return null;
  }
}

export async function getTestimonials(): Promise<Testimonial[] | null> {
  'use cache';
  cacheTag('testimonials');
  try {
    const testimonials = await getJson<Testimonial[]>('/testimonials');
    cacheLife('hours');
    return testimonials;
  } catch (error) {
    console.error('[api] Failed to load testimonials:', error);
    cacheLife('seconds');
    return null;
  }
}
