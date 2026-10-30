import type { RoomType } from './room-type.entity';

/**
 * Public shape of a room type, served at GET /api/rooms for the landing page.
 * Keeps internal columns (timestamps, flags) out of the API.
 */
export interface RoomTypeDto {
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

export function toRoomTypeDto(roomType: RoomType): RoomTypeDto {
  return {
    id: roomType.id,
    slug: roomType.slug,
    name: roomType.name,
    description: roomType.description,
    bedLabel: roomType.bedLabel,
    maxGuests: roomType.maxGuests,
    nightlyRateCents: roomType.nightlyRateCents,
    currency: roomType.currency,
    imageUrl: roomType.imageUrl,
    imageAlt: roomType.imageAlt,
  };
}
