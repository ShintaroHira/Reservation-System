import type { Room } from './room.entity';

/** Public shape of a room. Keeps internal columns (timestamps, flags) out of the API. */
export interface RoomDto {
  id: string;
  slug: string;
  name: string;
  description: string;
  bedLabel: string;
  maxGuests: number;
  nightlyRateCents: number;
  currency: string;
  imageUrl: string;
  imageAlt: string;
}

export function toRoomDto(room: Room): RoomDto {
  return {
    id: room.id,
    slug: room.slug,
    name: room.name,
    description: room.description,
    bedLabel: room.bedLabel,
    maxGuests: room.maxGuests,
    nightlyRateCents: room.nightlyRateCents,
    currency: room.currency,
    imageUrl: room.imageUrl,
    imageAlt: room.imageAlt,
  };
}
