import type { Metadata, Viewport } from 'next';
import { Cormorant_Garamond, Lora, Nunito_Sans } from 'next/font/google';
import { heroOgImage } from '@/assets/hero/hero-image';
import './globals.scss';

// Fonts matched to the design: Lora (headings), Cormorant Garamond italic
// (hero accent line) and Nunito Sans (body). Lora and Nunito Sans are variable.
const lora = Lora({ subsets: ['latin'], variable: '--font-lora', display: 'swap' });
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: '600',
  style: 'italic',
  variable: '--font-cormorant',
  display: 'swap',
});
const nunitoSans = Nunito_Sans({ subsets: ['latin'], variable: '--font-nunito-sans', display: 'swap' });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3100';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Reservation | Luxury Stays. Lasting Memories.',
  description:
    'Discover the perfect blend of luxury, comfort, and unforgettable moments. Seaside rooms and suites, fine dining, an outdoor pool and spa.',
  openGraph: {
    type: 'website',
    title: 'Reservation | More Than a Stay, It’s an Experience',
    description: 'Seaside rooms and suites with world-class amenities. Book your stay today.',
    images: [
      {
        url: heroOgImage.src,
        width: heroOgImage.width,
        height: heroOgImage.height,
        alt: 'Infinity pool overlooking the sea at sunset',
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: '#fefbf5',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${lora.variable} ${cormorant.variable} ${nunitoSans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
