import { preload } from 'react-dom';
import { heroPreview, heroSourceSize, heroVariants } from '@/assets/hero/hero-image';
import { BookButton } from '../booking/BookButton';
import { ArrowRightIcon } from '../ui/icons';
import styles from './Hero.module.scss';

// The hero is the largest paint on the page, so it bypasses the on-demand image
// optimiser: pre-sized WebP files (scripts/generate-hero-images.mjs) are served
// as hashed static assets, requested from <head> at the highest priority, with
// an inline preview of the photo visible from the very first paint.

// The photo covers the hero, so where the hero is taller than the photo's
// proportions it is drawn wider than the screen: hero height × aspect ratio.
// Heights mirror Hero.module.scss (on phones they follow the copy, up to ~800 px).
// A 1% allowance (invisible) stops the browser jumping to the next, heavier
// file when a variant falls a few pixels short of the drawn width.
const coverWidth = (heroHeight: number) =>
  Math.ceil((heroHeight * heroSourceSize.width) / heroSourceSize.height / 1.01);
const HERO_SIZES = [
  `(max-width: 767px) ${Math.max(768, coverWidth(800))}px`,
  `(max-width: 1199.98px) ${Math.max(1200, coverWidth(720))}px`,
  `(max-width: ${coverWidth(819)}px) ${coverWidth(819)}px`,
  '100vw',
].join(', ');
const HERO_SRCSET = heroVariants.map((variant) => `${variant.src} ${variant.width}w`).join(', ');
const HERO_FALLBACK = heroVariants[heroVariants.length - 1];

export function Hero() {
  preload(HERO_FALLBACK.src, {
    as: 'image',
    imageSrcSet: HERO_SRCSET,
    imageSizes: HERO_SIZES,
    fetchPriority: 'high',
  });

  return (
    <section className={styles.hero} aria-labelledby="hero-title">
      <div className={styles.preview} style={{ backgroundImage: `url(${heroPreview})` }} aria-hidden="true" />
      {/* eslint-disable-next-line @next/next/no-img-element -- pre-sized static variants, see comment above */}
      <img
        src={HERO_FALLBACK.src}
        srcSet={HERO_SRCSET}
        sizes={HERO_SIZES}
        width={HERO_FALLBACK.width}
        height={HERO_FALLBACK.height}
        alt="Couple relaxing beside an infinity pool overlooking the sea at sunset"
        fetchPriority="high"
        loading="eager"
        decoding="async"
        className={styles.image}
      />
      <div className={styles.inner}>
        <h1 id="hero-title" className={styles.title}>
          <span className={styles.titleMain}>More Than a Stay</span>{' '}
          <span className={styles.titleAccent}>It&rsquo;s an Experience</span>
        </h1>
        <p className={styles.lead}>
          Discover the perfect blend of luxury, comfort, <br className="br-wide" />
          and unforgettable moments.
        </p>
        <BookButton className={styles.cta}>
          Book Your Stay
          <ArrowRightIcon className={styles.arrow} />
        </BookButton>
      </div>
    </section>
  );
}
