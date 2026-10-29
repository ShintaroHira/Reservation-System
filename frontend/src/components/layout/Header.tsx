import Link from 'next/link';
import { BookButton } from '../booking/BookButton';
import { LogoMark } from '../ui/icons';
import styles from './Header.module.scss';

export function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" className={styles.brand}>
          <LogoMark className={styles.mark} />
          <span className={styles.wordmark}>Reservation</span>
        </Link>
        <BookButton className={styles.cta}>Book Now</BookButton>
      </div>
    </header>
  );
}
