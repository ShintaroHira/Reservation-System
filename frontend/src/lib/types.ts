// Response shapes of the NestJS API (backend/src/**/*.dto.ts).

export interface Room {
  id: string;
  slug: string;
  name: string;
  /** May contain `\n` where the design breaks the line on wide screens. */
  description: string;
  bedLabel: string;
  maxGuests: number;
  nightlyRateCents: number;
  currency: string;
  imageUrl: string;
  imageAlt: string;
}

export interface Testimonial {
  id: string;
  authorName: string;
  location: string;
  /** Quote text without quotation marks; may contain `\n` line breaks. */
  quote: string;
  rating: number;
  avatarUrl: string;
}

export interface ReservationRequest {
  roomId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  fullName: string;
  email: string;
  phone?: string;
  specialRequests?: string;
}

export interface ReservationConfirmation {
  reference: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  room: { id: string; name: string };
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  fullName: string;
  email: string;
  nightlyRateCents: number;
  totalCents: number;
  currency: string;
  createdAt: string;
}

/** NestJS error body: validation errors arrive as a list of messages. */
export interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  error?: string;
}
