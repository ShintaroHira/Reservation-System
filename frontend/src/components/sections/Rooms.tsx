import { Suspense } from 'react';
import { getRooms } from '@/lib/api';
import { RoomCard } from './RoomCard';
import styles from './Rooms.module.scss';

async function RoomGrid() {
  const rooms = await getRooms();
  if (!rooms?.length) {
    return (
      <p className={styles.unavailable} role="status">
        Our rooms are momentarily unavailable. Please refresh the page in a moment.
      </p>
    );
  }
  return (
    <ul className={styles.grid}>
      {rooms.map((room) => (
        <li key={room.id}>
          <RoomCard room={room} />
        </li>
      ))}
    </ul>
  );
}

function RoomGridSkeleton() {
  return (
    <ul className={styles.grid} aria-busy="true" aria-label="Loading rooms">
      {Array.from({ length: 4 }, (_, index) => (
        <li key={index}>
          <div className={`${styles.card} ${styles.skeleton}`} />
        </li>
      ))}
    </ul>
  );
}

export function Rooms() {
  return (
    <section id="rooms" className={styles.rooms} aria-labelledby="rooms-title">
      <p className={styles.eyebrow}>Our Rooms</p>
      <h2 id="rooms-title" className={styles.title}>
        A Room for Every Kind of Stay
      </h2>
      <p className={styles.lead}>From cozy retreats to luxurious suites, find the perfect space for your getaway.</p>
      <Suspense fallback={<RoomGridSkeleton />}>
        <RoomGrid />
      </Suspense>
    </section>
  );
}
