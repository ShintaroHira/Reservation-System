import type { RoomType } from '../rooms/room-type.entity';
import type { Room } from '../rooms/room.entity';
import type { Testimonial } from '../testimonials/testimonial.entity';

type RoomTypeSeed = Pick<
  RoomType,
  | 'slug'
  | 'name'
  | 'description'
  | 'bedLabel'
  | 'maxGuests'
  | 'nightlyRateCents'
  | 'currency'
  | 'imageUrl'
  | 'imageAlt'
  | 'sortOrder'
  | 'isActive'
>;

type RoomSeed = Pick<Room, 'roomNumber' | 'summary' | 'isBookable'> & { roomTypeSlug: string };

type TestimonialSeed = Pick<
  Testimonial,
  'slug' | 'authorName' | 'location' | 'quote' | 'rating' | 'avatarUrl' | 'sortOrder' | 'isPublished'
>;

// Image paths point at the frontend's /public folder.
export const ROOM_TYPE_SEEDS: RoomTypeSeed[] = [
  {
    slug: 'standard-room',
    name: 'Standard Room',
    description: 'Comfort and style for\na relaxing stay.',
    bedLabel: '1 King Bed',
    maxGuests: 2,
    nightlyRateCents: 12900,
    currency: 'USD',
    imageUrl: '/images/rooms/standard-room.jpg',
    imageAlt: 'Standard room with a king bed, warm lighting and a sea view at sunset',
    sortOrder: 1,
    isActive: true,
  },
  {
    slug: 'deluxe-room',
    name: 'Deluxe Room',
    description: 'More space, more comfort,\nmore to love.',
    bedLabel: '1 King Bed',
    maxGuests: 2,
    nightlyRateCents: 16900,
    currency: 'USD',
    imageUrl: '/images/rooms/deluxe-room.jpg',
    imageAlt: 'Deluxe room with a king bed, armchair and a balcony overlooking the sea',
    sortOrder: 2,
    isActive: true,
  },
  {
    slug: 'executive-suite',
    name: 'Executive Suite',
    description: 'A perfect blend of elegance\nand functionality.',
    bedLabel: '1 King Bed',
    maxGuests: 3,
    nightlyRateCents: 22900,
    currency: 'USD',
    imageUrl: '/images/rooms/executive-suite.jpg',
    imageAlt: 'Executive suite with a king bed, lounge seating and an ocean-view terrace',
    sortOrder: 3,
    isActive: true,
  },
  {
    slug: 'family-suite',
    name: 'Family Suite',
    description: 'Spacious comfort for\nyour whole family.',
    bedLabel: '2 Queen Beds',
    maxGuests: 4,
    nightlyRateCents: 28900,
    currency: 'USD',
    imageUrl: '/images/rooms/family-suite.jpg',
    imageAlt: 'Family suite with wood-panelled walls, a sitting area and a sunset sea view',
    sortOrder: 4,
    isActive: true,
  },
];

// Placeholder rooms until the hotel's real room list arrives (numbers and summaries are made up).
export const ROOM_SEEDS: RoomSeed[] = [
  { roomNumber: '101', roomTypeSlug: 'standard-room', summary: 'Garden view, close to the lift', isBookable: true },
  { roomNumber: '102', roomTypeSlug: 'standard-room', summary: 'Garden view, quiet end of the hall', isBookable: true },
  { roomNumber: '103', roomTypeSlug: 'standard-room', summary: 'Partial sea view', isBookable: true },
  { roomNumber: '104', roomTypeSlug: 'standard-room', summary: 'Partial sea view, accessible bathroom', isBookable: true },
  { roomNumber: '201', roomTypeSlug: 'deluxe-room', summary: 'Ocean view, private balcony', isBookable: true },
  { roomNumber: '202', roomTypeSlug: 'deluxe-room', summary: 'Ocean view, corner balcony', isBookable: true },
  { roomNumber: '203', roomTypeSlug: 'deluxe-room', summary: 'Pool view, private balcony', isBookable: true },
  { roomNumber: '301', roomTypeSlug: 'executive-suite', summary: 'Ocean-view terrace, separate lounge', isBookable: true },
  { roomNumber: '302', roomTypeSlug: 'executive-suite', summary: 'Sunset-facing terrace, work desk', isBookable: true },
  { roomNumber: '401', roomTypeSlug: 'family-suite', summary: 'Two bedrooms, sea view', isBookable: true },
  { roomNumber: '402', roomTypeSlug: 'family-suite', summary: 'Two bedrooms, next to the kids’ pool', isBookable: true },
];

export const TESTIMONIAL_SEEDS: TestimonialSeed[] = [
  {
    slug: 'emily-carter',
    authorName: 'Emily Carter',
    location: 'New York, USA',
    quote: 'The atmosphere was incredible, the\nstaff was so friendly, and the room\nwas absolutely beautiful!',
    rating: 5,
    avatarUrl: '/images/guests/emily-carter.770c789c.jpg',
    sortOrder: 1,
    isPublished: true,
  },
  {
    slug: 'james-wilson',
    authorName: 'James Wilson',
    location: 'Chicago, USA',
    quote: 'A truly wonderful experience!\nThe location is perfect, and the\namenities are top-notch.',
    rating: 5,
    avatarUrl: '/images/guests/james-wilson.b2921a37.jpg',
    sortOrder: 2,
    isPublished: true,
  },
  {
    slug: 'sophia-martinez',
    authorName: 'Sophia Martinez',
    location: 'Los Angeles, USA',
    quote: 'I’ve stayed at many hotels, but\nthis one is by far the best. The service,\nfood, and comfort were exceptional!',
    rating: 5,
    avatarUrl: '/images/guests/sophia-martinez.83ddf54f.jpg',
    sortOrder: 3,
    isPublished: true,
  },
];
