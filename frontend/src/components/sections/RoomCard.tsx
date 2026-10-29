import Image from 'next/image';
import { formatPrice } from '@/lib/format';
import type { Room } from '@/lib/types';
import { BookButton } from '../booking/BookButton';
import { MultilineText } from '../ui/MultilineText';
import { BedIcon, GuestIcon } from '../ui/icons';
import styles from './Rooms.module.scss';

/** Only same-origin images go through the optimizer (see images.localPatterns). */
const isLocalImage = (url: string) => url.startsWith('/images/');

export function RoomCard({ room }: { room: Room }) {
  const titleId = `room-${room.slug}`;
  return (
    <article className={styles.card} aria-labelledby={titleId}>
      <div className={styles.media}>
        <Image
          src={room.imageUrl}
          alt={room.imageAlt}
          fill
          sizes="(max-width: 767px) calc(100vw - 40px), (max-width: 1199px) 45vw, 315px"
          unoptimized={!isLocalImage(room.imageUrl)}
          className={styles.image}
        />
      </div>
      <div className={styles.body}>
        <h3 id={titleId} className={styles.name}>
          {room.name}
        </h3>
        <p className={styles.description}>
          <MultilineText text={room.description} />
        </p>
        <ul className={styles.meta}>
          <li>
            <BedIcon className={styles.metaIcon} />
            {room.bedLabel}
          </li>
          <li>
            <GuestIcon className={`${styles.metaIcon} ${styles.guestIcon}`} />
            {room.maxGuests} {room.maxGuests === 1 ? 'Guest' : 'Guests'}
          </li>
        </ul>
        <p className={styles.price}>
          <span className={styles.amount}>{formatPrice(room.nightlyRateCents, room.currency)}</span>{' '}
          <span className={styles.per}>/ night</span>
        </p>
        <BookButton roomId={room.id} className={styles.book} aria-label={`Book Now: ${room.name}`}>
          Book Now
        </BookButton>
      </div>
    </article>
  );
}
