'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { useBooking } from './BookingProvider';

interface BookButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'type'> {
  roomId?: string;
  children: ReactNode;
}

/** Any "Book" call to action on the page; opens the booking dialog. */
export function BookButton({ roomId, children, ...rest }: BookButtonProps) {
  const { openBooking } = useBooking();
  return (
    <button type="button" aria-haspopup="dialog" onClick={() => openBooking(roomId)} {...rest}>
      {children}
    </button>
  );
}
