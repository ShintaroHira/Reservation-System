import type { ComponentType, SVGProps } from 'react';
import { MultilineText } from '../ui/MultilineText';
import { ClocheIcon, DiamondIcon, PinIcon, StarOutlineIcon } from '../ui/icons';
import styles from './Features.module.scss';

interface Feature {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
  text: string;
}

const FEATURES: Feature[] = [
  { icon: DiamondIcon, title: 'Luxury Rooms', text: 'Elegant spaces designed\nfor your comfort.' },
  { icon: ClocheIcon, title: 'Exceptional Service', text: 'Our team is here to make\nyour stay special.' },
  { icon: PinIcon, title: 'Prime Location', text: 'Close to the best attractions,\ndining and shopping.' },
  { icon: StarOutlineIcon, title: 'Unforgettable Experiences', text: 'Create memories that\nlast a lifetime.' },
];

export function Features() {
  return (
    <section className={styles.features} aria-labelledby="features-title">
      <h2 id="features-title" className="visually-hidden">
        Why stay with us
      </h2>
      <ul className={styles.list}>
        {FEATURES.map(({ icon: Icon, title, text }) => (
          <li key={title} className={styles.item}>
            <Icon className={styles.icon} />
            <h3 className={styles.title}>{title}</h3>
            <p className={styles.text}>
              <MultilineText text={text} />
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
