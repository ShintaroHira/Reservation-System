import { randomInt } from 'node:crypto';

// No 0/O or 1/I, so codes can be read aloud or typed without ambiguity.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const LENGTH = 6;

/** Booking reference such as `RSV-7KQ2MX` (32^6 ≈ 1.07 billion combinations). */
export function generateReference(): string {
  let code = '';
  for (let i = 0; i < LENGTH; i += 1) code += ALPHABET[randomInt(ALPHABET.length)];
  return `RSV-${code}`;
}
