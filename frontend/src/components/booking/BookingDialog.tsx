'use client';

import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { PUBLIC_API_URL } from '@/lib/config';
import { addDaysIso, formatPrice, formatStayDate, localIsoDate, nightsBetweenIso } from '@/lib/format';
import { newIdempotencyKey } from '@/lib/idempotency';
import type { ApiErrorBody, ReservationConfirmation, ReservationRequest, Room } from '@/lib/types';
import { CheckCircleIcon, CloseIcon } from '../ui/icons';
import styles from './BookingDialog.module.scss';

const MAX_NIGHTS = 30;

interface FormState {
  roomId: string;
  checkIn: string;
  checkOut: string;
  guests: string;
  fullName: string;
  email: string;
  phone: string;
  specialRequests: string;
}

type FieldErrors = Partial<Record<keyof FormState, string>>;

const EMPTY_FORM: FormState = {
  roomId: '',
  checkIn: '',
  checkOut: '',
  guests: '2',
  fullName: '',
  email: '',
  phone: '',
  specialRequests: '',
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(form: FormState, room: Room | undefined, today: string): FieldErrors {
  const errors: FieldErrors = {};
  if (!room) errors.roomId = 'Please choose a room.';
  if (!form.checkIn) errors.checkIn = 'Please choose a check-in date.';
  else if (form.checkIn < today) errors.checkIn = 'Check-in date cannot be in the past.';
  if (!form.checkOut) errors.checkOut = 'Please choose a check-out date.';
  else if (form.checkIn && form.checkOut <= form.checkIn) {
    errors.checkOut = 'Check-out must be after check-in.';
  } else if (form.checkIn && nightsBetweenIso(form.checkIn, form.checkOut) > MAX_NIGHTS) {
    errors.checkOut = `Online requests are limited to ${MAX_NIGHTS} nights.`;
  }
  if (room && Number(form.guests) > room.maxGuests) {
    errors.guests = `The ${room.name} accommodates up to ${room.maxGuests} guests.`;
  }
  if (form.fullName.trim().length < 2) errors.fullName = 'Please enter your full name.';
  if (!EMAIL_PATTERN.test(form.email.trim())) errors.email = 'Please enter a valid email address.';
  if (form.phone.trim() && !/^\+?[0-9()\-.\s]{6,40}$/.test(form.phone.trim())) {
    errors.phone = 'Please enter a valid phone number.';
  }
  return errors;
}

function messageFromError(status: number, body: ApiErrorBody | null): string[] {
  if (status === 429) return ['Too many requests in a short time. Please wait a minute and try again.'];
  if (body?.message) return Array.isArray(body.message) ? body.message : [body.message];
  return ['Something went wrong while sending your request. Please try again.'];
}

interface BookingDialogProps {
  open: boolean;
  requestedRoomId?: string;
  /** Increments on every open request so the dialog can react to it. */
  openCount: number;
  onClose: () => void;
}

export function BookingDialog({ open, requestedRoomId, openCount, onClose }: BookingDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const roomSelectRef = useRef<HTMLSelectElement>(null);
  const checkInRef = useRef<HTMLInputElement>(null);
  const uid = useId();
  const fieldId = (name: keyof FormState) => `${uid}-${name}`;

  const [rooms, setRooms] = useState<Room[] | undefined>();
  const [roomsError, setRoomsError] = useState(false);
  const [roomsAttempt, setRoomsAttempt] = useState(0);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverErrors, setServerErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<ReservationConfirmation | null>(null);

  // One key per booking attempt: sending the same details again (a retry after a
  // lost connection, say) reuses it, so the API can't book the stay twice.
  const attemptRef = useRef<{ body: string; key: string } | null>(null);

  // The visitor's local date, captured when the dialog opens (never during prerender).
  const [today, setToday] = useState('');

  // React to a new open request (adjusting state during render, not in an effect).
  const [handledOpenCount, setHandledOpenCount] = useState(openCount);
  if (openCount !== handledOpenCount) {
    setHandledOpenCount(openCount);
    setToday(localIsoDate());
    if (confirmation) {
      setConfirmation(null);
      setForm(EMPTY_FORM);
    }
    if (requestedRoomId) setForm((current) => ({ ...current, roomId: requestedRoomId }));
    setFieldErrors({});
    setServerErrors([]);
  }

  // Sync the native dialog with the `open` prop.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      (requestedRoomId ? checkInRef.current : roomSelectRef.current)?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, requestedRoomId, openCount]);

  // Load the room list the first time the dialog opens.
  useEffect(() => {
    if (!open || rooms) return;
    const controller = new AbortController();
    fetch(`${PUBLIC_API_URL}/rooms`, { signal: controller.signal, headers: { Accept: 'application/json' } })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<Room[]>;
      })
      .then((data) => setRooms(data))
      .catch(() => {
        if (!controller.signal.aborted) setRoomsError(true);
      });
    return () => controller.abort();
  }, [open, rooms, roomsAttempt]);

  const room = rooms?.find((candidate) => candidate.id === form.roomId);
  const maxGuests = room?.maxGuests ?? 4;
  const nights =
    form.checkIn && form.checkOut && form.checkOut > form.checkIn ? nightsBetweenIso(form.checkIn, form.checkOut) : 0;

  const update = <K extends keyof FormState>(name: K, value: FormState[K]) => {
    setForm((current) => {
      const next = { ...current, [name]: value };
      if (name === 'checkIn' && value && next.checkOut && next.checkOut <= value) next.checkOut = '';
      if (name === 'roomId') {
        const nextRoom = rooms?.find((candidate) => candidate.id === value);
        if (nextRoom && Number(next.guests) > nextRoom.maxGuests) next.guests = String(nextRoom.maxGuests);
      }
      return next;
    });
    setFieldErrors((current) => (current[name] ? { ...current, [name]: undefined } : current));
  };

  const retryRooms = () => {
    setRoomsError(false);
    setRoomsAttempt((attempt) => attempt + 1);
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const errors = validate(form, room, today);
    setFieldErrors(errors);
    setServerErrors([]);
    const firstInvalid = (Object.keys(errors) as (keyof FormState)[])[0];
    if (firstInvalid) {
      document.getElementById(fieldId(firstInvalid))?.focus();
      return;
    }

    const payload: ReservationRequest = {
      roomTypeId: form.roomId,
      checkIn: form.checkIn,
      checkOut: form.checkOut,
      guests: Number(form.guests),
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      ...(form.phone.trim() ? { phone: form.phone.trim() } : {}),
      ...(form.specialRequests.trim() ? { specialRequests: form.specialRequests.trim() } : {}),
    };

    const requestBody = JSON.stringify(payload);
    if (attemptRef.current?.body !== requestBody) {
      attemptRef.current = { body: requestBody, key: newIdempotencyKey() };
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${PUBLIC_API_URL}/reservations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'Idempotency-Key': attemptRef.current.key,
        },
        body: requestBody,
      });
      const body = (await response.json().catch(() => null)) as ReservationConfirmation | ApiErrorBody | null;
      if (!response.ok) {
        setServerErrors(messageFromError(response.status, body as ApiErrorBody | null));
        return;
      }
      attemptRef.current = null;
      setConfirmation(body as ReservationConfirmation);
    } catch {
      setServerErrors(['We could not reach the reservation service. Please check your connection and try again.']);
    } finally {
      setSubmitting(false);
    }
  }

  const describedBy = (name: keyof FormState) => (fieldErrors[name] ? `${fieldId(name)}-error` : undefined);
  const fieldError = (name: keyof FormState) =>
    fieldErrors[name] ? (
      <p className={styles.fieldError} id={`${fieldId(name)}-error`}>
        {fieldErrors[name]}
      </p>
    ) : null;

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby={`${uid}-title`}
      onClose={onClose}
      onClick={(event) => {
        // A click on the backdrop lands on the <dialog> element itself.
        if (event.target === dialogRef.current) onClose();
      }}
    >
      <div className={styles.panel}>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Close booking dialog">
          <CloseIcon width={20} height={20} />
        </button>

        {confirmation ? (
          <div className={styles.confirmation} role="status">
            <CheckCircleIcon className={styles.confirmationIcon} width={56} height={56} />
            <p className={styles.eyebrow}>Booking confirmed</p>
            <h2 id={`${uid}-title`} className={styles.title}>
              Thank you, {confirmation.fullName.split(' ')[0]}
            </h2>
            <p className={styles.lead}>
              Your reservation is <strong>confirmed</strong>. Please keep your reference for any questions about your
              stay.
            </p>
            <p className={styles.reference}>
              <span>Reference</span>
              <strong>{confirmation.reference}</strong>
            </p>
            <dl className={styles.summary}>
              <div>
                <dt>Room</dt>
                <dd>{confirmation.roomType.name}</dd>
              </div>
              <div>
                <dt>Check-in</dt>
                <dd>{formatStayDate(confirmation.checkIn)}</dd>
              </div>
              <div>
                <dt>Check-out</dt>
                <dd>{formatStayDate(confirmation.checkOut)}</dd>
              </div>
              <div>
                <dt>Guests</dt>
                <dd>{confirmation.guests}</dd>
              </div>
              <div>
                <dt>
                  {confirmation.nights} {confirmation.nights === 1 ? 'night' : 'nights'} ×{' '}
                  {formatPrice(confirmation.nightlyRateCents, confirmation.currency)}
                </dt>
                <dd>{formatPrice(confirmation.totalCents, confirmation.currency)}</dd>
              </div>
            </dl>
            <button type="button" className={styles.submit} onClick={onClose}>
              Done
            </button>
          </div>
        ) : (
          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <p className={styles.eyebrow}>Reservation request</p>
            <h2 id={`${uid}-title`} className={styles.title}>
              Book Your Stay
            </h2>
            <p className={styles.lead}>Choose your room and dates. No payment is taken at this step.</p>

            <div className={styles.grid}>
              <div className={`${styles.field} ${styles.full}`}>
                <label htmlFor={fieldId('roomId')}>Room</label>
                <select
                  id={fieldId('roomId')}
                  ref={roomSelectRef}
                  value={form.roomId}
                  onChange={(event) => update('roomId', event.target.value)}
                  aria-invalid={Boolean(fieldErrors.roomId)}
                  aria-describedby={describedBy('roomId')}
                  aria-busy={!rooms && !roomsError}
                >
                  <option value="">{rooms ? 'Select a room' : roomsError ? 'Rooms unavailable' : 'Loading rooms…'}</option>
                  {rooms?.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name} · {formatPrice(option.nightlyRateCents, option.currency)} / night · up to{' '}
                      {option.maxGuests} guests
                    </option>
                  ))}
                </select>
                {roomsError && (
                  <p className={styles.fieldError}>
                    We couldn&rsquo;t load the rooms.{' '}
                    <button type="button" className={styles.linkButton} onClick={retryRooms}>
                      Try again
                    </button>
                  </p>
                )}
                {fieldError('roomId')}
              </div>

              <div className={styles.field}>
                <label htmlFor={fieldId('checkIn')}>Check-in</label>
                <input
                  id={fieldId('checkIn')}
                  ref={checkInRef}
                  type="date"
                  min={today || undefined}
                  value={form.checkIn}
                  onChange={(event) => update('checkIn', event.target.value)}
                  aria-invalid={Boolean(fieldErrors.checkIn)}
                  aria-describedby={describedBy('checkIn')}
                  required
                />
                {fieldError('checkIn')}
              </div>

              <div className={styles.field}>
                <label htmlFor={fieldId('checkOut')}>Check-out</label>
                <input
                  id={fieldId('checkOut')}
                  type="date"
                  min={form.checkIn ? addDaysIso(form.checkIn, 1) : today ? addDaysIso(today, 1) : undefined}
                  value={form.checkOut}
                  onChange={(event) => update('checkOut', event.target.value)}
                  aria-invalid={Boolean(fieldErrors.checkOut)}
                  aria-describedby={describedBy('checkOut')}
                  required
                />
                {fieldError('checkOut')}
              </div>

              <div className={styles.field}>
                <label htmlFor={fieldId('guests')}>Guests</label>
                <select
                  id={fieldId('guests')}
                  value={form.guests}
                  onChange={(event) => update('guests', event.target.value)}
                  aria-invalid={Boolean(fieldErrors.guests)}
                  aria-describedby={describedBy('guests')}
                >
                  {Array.from({ length: maxGuests }, (_, index) => String(index + 1)).map((count) => (
                    <option key={count} value={count}>
                      {count} {count === '1' ? 'guest' : 'guests'}
                    </option>
                  ))}
                </select>
                {fieldError('guests')}
              </div>

              <div className={styles.field}>
                <label htmlFor={fieldId('fullName')}>Full name</label>
                <input
                  id={fieldId('fullName')}
                  type="text"
                  autoComplete="name"
                  maxLength={120}
                  value={form.fullName}
                  onChange={(event) => update('fullName', event.target.value)}
                  aria-invalid={Boolean(fieldErrors.fullName)}
                  aria-describedby={describedBy('fullName')}
                  required
                />
                {fieldError('fullName')}
              </div>

              <div className={styles.field}>
                <label htmlFor={fieldId('email')}>Email</label>
                <input
                  id={fieldId('email')}
                  type="email"
                  autoComplete="email"
                  maxLength={254}
                  value={form.email}
                  onChange={(event) => update('email', event.target.value)}
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={describedBy('email')}
                  required
                />
                {fieldError('email')}
              </div>

              <div className={styles.field}>
                <label htmlFor={fieldId('phone')}>
                  Phone <span className={styles.optional}>(optional)</span>
                </label>
                <input
                  id={fieldId('phone')}
                  type="tel"
                  autoComplete="tel"
                  maxLength={40}
                  value={form.phone}
                  onChange={(event) => update('phone', event.target.value)}
                  aria-invalid={Boolean(fieldErrors.phone)}
                  aria-describedby={describedBy('phone')}
                />
                {fieldError('phone')}
              </div>

              <div className={`${styles.field} ${styles.full}`}>
                <label htmlFor={fieldId('specialRequests')}>
                  Special requests <span className={styles.optional}>(optional)</span>
                </label>
                <textarea
                  id={fieldId('specialRequests')}
                  rows={3}
                  maxLength={1000}
                  value={form.specialRequests}
                  onChange={(event) => update('specialRequests', event.target.value)}
                />
              </div>
            </div>

            <div className={styles.estimate} aria-live="polite">
              {room && nights > 0 ? (
                <>
                  <span>
                    {nights} {nights === 1 ? 'night' : 'nights'} × {formatPrice(room.nightlyRateCents, room.currency)}
                  </span>
                  <strong>{formatPrice(nights * room.nightlyRateCents, room.currency)}</strong>
                </>
              ) : (
                <span>Select a room and dates to see your estimated total.</span>
              )}
            </div>

            {serverErrors.length > 0 && (
              <div className={styles.alert} role="alert">
                {serverErrors.map((message) => (
                  <p key={message}>{message}</p>
                ))}
              </div>
            )}

            <button type="submit" className={styles.submit} disabled={submitting}>
              {submitting ? 'Sending request…' : 'Request Reservation'}
            </button>
            <p className={styles.note}>Estimated total before taxes. Requests are subject to availability.</p>
          </form>
        )}
      </div>
    </dialog>
  );
}
