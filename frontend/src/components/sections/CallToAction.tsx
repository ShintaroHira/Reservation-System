import Image from 'next/image';
import ctaImage from '../../../public/images/cta.png';
import { BookButton } from '../booking/BookButton';
import { ArrowRightIcon } from '../ui/icons';
import styles from './CallToAction.module.scss';

// On phones the band is taller than the photo's proportions, so the photo is
// drawn wider than the screen: band height (up to ~375 px) × aspect ratio.
const CTA_SIZES = `(max-width: 767px) ${Math.ceil((375 * ctaImage.width) / ctaImage.height)}px, 100vw`;

export function CallToAction() {
  return (
    <section className={styles.cta} aria-labelledby="cta-title">
      <Image
        src={ctaImage}
        alt="Guest in a sun hat raising a glass to the sunset over the bay"
        fill
        sizes={CTA_SIZES}
        placeholder="blur"
        className={styles.image}
      />
      <div className={styles.inner}>
        <p className={styles.eyebrow}>Your perfect getaway awaits</p>
        <h2 id="cta-title" className={styles.title}>
          Book Your Stay Today
        </h2>
        <p className={styles.lead}>
          Indulge in luxury, comfort, and unforgettable moments. <br className="br-wide" />
          We can&rsquo;t wait to welcome you!
        </p>
        <BookButton className={styles.button}>
          Book Now
          <ArrowRightIcon className={styles.arrow} />
        </BookButton>
      </div>
    </section>
  );
}
