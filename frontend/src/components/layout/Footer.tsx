import { LogoMark } from '../ui/icons';
import styles from './Footer.module.scss';

export function Footer() {
  return (
    <footer className={styles.footer}>
      <p className={styles.brand}>
        <LogoMark className={styles.mark} />
        <span className={styles.wordmark}>Reservation</span>
      </p>
      <p className={styles.tagline}>Luxury Stays. Lasting Memories.</p>
    </footer>
  );
}
