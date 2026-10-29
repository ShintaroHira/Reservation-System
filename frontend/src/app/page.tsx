import { BookingProvider } from '@/components/booking/BookingProvider';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { Amenities } from '@/components/sections/Amenities';
import { CallToAction } from '@/components/sections/CallToAction';
import { Features } from '@/components/sections/Features';
import { Hero } from '@/components/sections/Hero';
import { Rooms } from '@/components/sections/Rooms';
import { Testimonials } from '@/components/sections/Testimonials';

export default function HomePage() {
  return (
    <BookingProvider>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Header />
      <main id="main">
        <Hero />
        <Features />
        <Rooms />
        <Amenities />
        <Testimonials />
        <CallToAction />
      </main>
      <Footer />
    </BookingProvider>
  );
}
