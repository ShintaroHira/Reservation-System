'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { BookingDialog } from './BookingDialog';

interface BookingContextValue {
  /** Opens the booking dialog, optionally with a room preselected. */
  openBooking: (roomId?: string) => void;
}

const BookingContext = createContext<BookingContextValue | null>(null);

export function useBooking(): BookingContextValue {
  const context = useContext(BookingContext);
  if (!context) throw new Error('useBooking must be used inside <BookingProvider>');
  return context;
}

export function BookingProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [requestedRoomId, setRequestedRoomId] = useState<string | undefined>();
  const [openCount, setOpenCount] = useState(0);

  const openBooking = useCallback((roomId?: string) => {
    setRequestedRoomId(roomId);
    setOpenCount((count) => count + 1);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => setIsOpen(false), []);
  const value = useMemo(() => ({ openBooking }), [openBooking]);

  return (
    <BookingContext value={value}>
      {children}
      <BookingDialog open={isOpen} requestedRoomId={requestedRoomId} openCount={openCount} onClose={close} />
    </BookingContext>
  );
}
