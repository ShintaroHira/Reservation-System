import Image from 'next/image';
import { Suspense } from 'react';
import { getTestimonials } from '@/lib/api';
import type { Testimonial } from '@/lib/types';
import { MultilineText } from '../ui/MultilineText';
import { RatingStarIcon } from '../ui/icons';
import styles from './Testimonials.module.scss';

const isLocalImage = (url: string) => url.startsWith('/images/');

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <figure className={styles.card}>
      <Image
        src={testimonial.avatarUrl}
        alt=""
        width={75}
        height={75}
        // Faces show compression first; portraits get the higher allowed quality.
        quality={85}
        unoptimized={!isLocalImage(testimonial.avatarUrl)}
        className={styles.avatar}
      />
      <div className={styles.body}>
        <blockquote className={styles.quote}>
          <p>
            &ldquo;
            <MultilineText text={testimonial.quote} />
            &rdquo;
          </p>
        </blockquote>
        <figcaption className={styles.caption}>
          <span className={styles.name}>{testimonial.authorName}</span>
          <span className={styles.location}>{testimonial.location}</span>
          <span className={styles.rating} role="img" aria-label={`Rated ${testimonial.rating} out of 5`}>
            {Array.from({ length: testimonial.rating }, (_, index) => (
              <RatingStarIcon key={index} className={styles.star} />
            ))}
          </span>
        </figcaption>
      </div>
    </figure>
  );
}

async function TestimonialList() {
  const testimonials = await getTestimonials();
  if (!testimonials?.length) {
    return (
      <p className={styles.unavailable} role="status">
        Guest reviews will be back shortly.
      </p>
    );
  }
  return (
    <ul className={styles.grid}>
      {testimonials.map((testimonial) => (
        <li key={testimonial.id}>
          <TestimonialCard testimonial={testimonial} />
        </li>
      ))}
    </ul>
  );
}

function TestimonialListSkeleton() {
  return (
    <ul className={styles.grid} aria-busy="true" aria-label="Loading guest reviews">
      {Array.from({ length: 3 }, (_, index) => (
        <li key={index}>
          <div className={`${styles.card} ${styles.skeleton}`} />
        </li>
      ))}
    </ul>
  );
}

export function Testimonials() {
  return (
    <section className={styles.testimonials} aria-labelledby="testimonials-title">
      <h2 id="testimonials-title" className={styles.title}>
        What Our Guests Say
      </h2>
      <p className={styles.lead}>Real experiences. Lasting impressions.</p>
      <Suspense fallback={<TestimonialListSkeleton />}>
        <TestimonialList />
      </Suspense>
    </section>
  );
}
