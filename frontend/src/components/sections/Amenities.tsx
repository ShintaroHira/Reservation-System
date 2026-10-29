import Image from 'next/image';
import type { ComponentType, SVGProps } from 'react';
import amenitiesImage from '../../../public/images/amenities.jpg';
import { DiningIcon, FitnessIcon, PoolIcon, SpaIcon } from '../ui/icons';
import styles from './Amenities.module.scss';

interface Amenity {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
  text: string;
}

const AMENITIES: Amenity[] = [
  { icon: DiningIcon, title: 'Fine Dining Restaurant', text: 'Enjoy exquisite cuisine with a view.' },
  { icon: PoolIcon, title: 'Outdoor Pool', text: 'Relax and unwind in our stunning pool.' },
  { icon: FitnessIcon, title: 'Fitness Center', text: 'Stay active during your visit.' },
  { icon: SpaIcon, title: 'Spa & Wellness', text: 'Rejuvenate your mind and body.' },
];

export function Amenities() {
  return (
    <section className={styles.amenities} aria-labelledby="amenities-title">
      <Image
        src={amenitiesImage}
        alt="Sunlit hotel restaurant with set tables and a view over the city skyline"
        fill
        sizes="100vw"
        placeholder="blur"
        className={styles.image}
      />
      <div className={styles.inner}>
        <h2 id="amenities-title" className={styles.title}>
          World-Class Amenities
        </h2>
        <p className={styles.lead}>Everything you need for a perfect stay.</p>
        <ul className={styles.list}>
          {AMENITIES.map(({ icon: Icon, title, text }) => (
            <li key={title} className={styles.item}>
              <span className={styles.ring}>
                <Icon className={styles.icon} />
              </span>
              <div>
                <h3 className={styles.itemTitle}>{title}</h3>
                <p className={styles.itemText}>{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
