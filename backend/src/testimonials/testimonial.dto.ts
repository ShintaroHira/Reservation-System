import type { Testimonial } from './testimonial.entity';

export interface TestimonialDto {
  id: string;
  authorName: string;
  location: string;
  quote: string;
  rating: number;
  avatarUrl: string;
}

export function toTestimonialDto(testimonial: Testimonial): TestimonialDto {
  return {
    id: testimonial.id,
    authorName: testimonial.authorName,
    location: testimonial.location,
    quote: testimonial.quote,
    rating: testimonial.rating,
    avatarUrl: testimonial.avatarUrl,
  };
}
