import type { SVGProps } from 'react';

// Decorative line icons drawn to match the design. They default to
// aria-hidden; give them a <title> or aria-label if one ever carries meaning.
type IconProps = SVGProps<SVGSVGElement>;

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
} as const;

/** Hotel building used for the wordmark and favicon. */
export function LogoMark(props: IconProps) {
  return (
    <svg viewBox="0 0 64 56" strokeWidth={2.6} {...base} {...props}>
      <path d="M32 3.2V1" />
      <path d="M17 54V4.5h30V54" />
      <path d="M17 54V21.5c0-1.2-.9-2-2-2H7.2c-1.2 0-2 .8-2 2V54" />
      <path d="M47 54V21.5c0-1.2.9-2 2-2h7.8c1.2 0 2 .8 2 2V54" />
      <path d="M2.5 54.2h59" />
      <path d="M26.5 54v-7.6a5.5 5.5 0 0 1 11 0V54" />
      <path d="M24.2 41.6 32 37.4l7.8 4.2" />
      <g fill="currentColor" stroke="none">
        {[24, 32, 40].map((x) =>
          [10.5, 18, 25.5, 33].map((y) => <rect key={`${x}-${y}`} x={x - 1.7} y={y} width={3.4} height={4.4} rx={1.1} />),
        )}
        {[11.2, 52.8].map((x) =>
          [26, 34, 42].map((y) => <rect key={`w-${x}-${y}`} x={x - 1.6} y={y} width={3.2} height={4.4} rx={1.1} />),
        )}
      </g>
    </svg>
  );
}

export function DiamondIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 46 44" strokeWidth={2.4} {...base} {...props}>
      <path d="M13.6 4.5h18.8l8.6 11.2L23 40.5 5 15.7Z" />
      <path d="M5.4 15.7h35.2" />
      <path d="M13.6 4.5l4.6 11.2L23 4.5l4.8 11.2 4.6-11.2" />
      <path d="M18.2 15.7 23 40.2l4.8-24.5" />
    </svg>
  );
}

export function ClocheIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 51 44" strokeWidth={2.4} {...base} {...props}>
      <circle cx="25.5" cy="7.6" r="3.3" />
      <path d="M9 32.6a16.5 18.3 0 0 1 33 0" />
      <path d="M6.6 32.8h37.8" />
      <path d="M32.7 17.6a12.6 14 0 0 1 4.8 9.6" />
      <path d="M5.2 40h40.6" />
    </svg>
  );
}

export function PinIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 34 44" strokeWidth={2.4} {...base} {...props}>
      <path d="M17 41.5S4.2 27.4 4.2 16.6a12.8 12.8 0 0 1 25.6 0C29.8 27.4 17 41.5 17 41.5Z" />
      <circle cx="17" cy="16.6" r="5" />
    </svg>
  );
}

export function StarOutlineIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 46 44" strokeWidth={2.4} {...base} {...props}>
      <path d="M23 2.8 28.6 15.9l14.2 1.2-10.8 9.4 3.3 13.9L23 32.9l-12.3 7.5L14 26.5 3.2 17.1l14.2-1.2Z" />
    </svg>
  );
}

export function BedIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 22" strokeWidth={1.8} {...base} {...props}>
      <path d="M4.2 10V4.6c0-1 .7-1.7 1.7-1.7h12.2c1 0 1.7.7 1.7 1.7V10" />
      <path d="M7.3 10V7.6c0-.5.4-.9.9-.9h7.6c.5 0 .9.4.9.9V10" />
      <path d="M2.4 17v-5c0-1.2.9-2 2-2h15.2c1.1 0 2 .8 2 2v5Z" />
      <path d="M2.4 14h19.2" />
      <path d="M3.6 17v2.3M20.4 17v2.3" />
    </svg>
  );
}

export function GuestIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 22 22" strokeWidth={1.8} {...base} {...props}>
      <circle cx="11" cy="6.6" r="4.2" />
      <path d="M3.4 20.2a7.6 7.6 0 0 1 15.2 0" />
    </svg>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 16 12" strokeWidth={1.7} {...base} {...props}>
      <path d="M1 6h13.2M9.4 1.4 14.2 6l-4.8 4.6" />
    </svg>
  );
}

export function RatingStarIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 19" aria-hidden focusable={false} {...props}>
      <path
        fill="currentColor"
        d="M10 .9l2.7 5.6 6.1.8-4.5 4.3 1.1 6.1L10 14.8l-5.4 2.9 1.1-6.1L1.2 7.3l6.1-.8Z"
      />
    </svg>
  );
}

// Amenity marks (white, drawn inside a ring).
export function DiningIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 32 32" strokeWidth={2.6} {...base} {...props}>
      <path d="M9.5 4v8.5a3 3 0 0 0 3 3v12.5" />
      <path d="M15.5 4v8.5a3 3 0 0 1-3 3" />
      <path d="M12.5 4v7.5" />
      <path d="M22.5 28V4.2c-2.8 1.6-4.3 4.9-4.3 9.2v4.2h4.3" />
    </svg>
  );
}

export function PoolIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 32 32" strokeWidth={2.6} {...base} {...props}>
      <path d="M10.5 18.5V8.2a3 3 0 0 1 6 0" />
      <path d="M18.5 18.5V8.2a3 3 0 0 1 6 0" />
      <path d="M10.5 12h8M10.5 16h8" />
      <path d="M3.5 22.5c2 1.5 4 1.5 6 0s4-1.5 6 0 4 1.5 6 0 4-1.5 6 0" />
      <path d="M3.5 27c2 1.5 4 1.5 6 0s4-1.5 6 0 4 1.5 6 0 4-1.5 6 0" />
    </svg>
  );
}

export function FitnessIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 32 32" strokeWidth={2.6} {...base} {...props}>
      <path d="M10.5 16h11" />
      <rect x="6.5" y="9" width="4" height="14" rx="1.6" />
      <rect x="21.5" y="9" width="4" height="14" rx="1.6" />
      <path d="M3.5 12.5v7M28.5 12.5v7" />
    </svg>
  );
}

export function SpaIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 32 32" strokeWidth={2.6} {...base} {...props}>
      <path d="M16 25.5c-3.6-2.4-5.3-5.6-5.3-9.4 0-3.3 1.8-6.4 5.3-9.1 3.5 2.7 5.3 5.8 5.3 9.1 0 3.8-1.7 7-5.3 9.4Z" />
      <path d="M16 25.5c-5.2.3-9.4-2.3-11.4-7.4 2.4-.8 4.6-.8 6.4-.2" />
      <path d="M16 25.5c5.2.3 9.4-2.3 11.4-7.4-2.4-.8-4.6-.8-6.4-.2" />
    </svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" strokeWidth={1.8} {...base} {...props}>
      <path d="M4.5 4.5l11 11M15.5 4.5l-11 11" />
    </svg>
  );
}

export function CheckCircleIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 48 48" strokeWidth={2.2} {...base} {...props}>
      <circle cx="24" cy="24" r="21" />
      <path d="M15 24.5l6.2 6.2L33.5 18" />
    </svg>
  );
}
