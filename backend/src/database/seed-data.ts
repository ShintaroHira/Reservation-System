import type { Room } from '../rooms/room.entity';
import type { Testimonial } from '../testimonials/testimonial.entity';

type RoomSeed = Pick<
  Room,
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

type TestimonialSeed = Pick<
  Testimonial,
  'slug' | 'authorName' | 'location' | 'quote' | 'rating' | 'avatarUrl' | 'sortOrder' | 'isPublished'
>;

// Image paths point at the frontend's /public folder.
export const ROOM_SEEDS: RoomSeed[] = [
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
