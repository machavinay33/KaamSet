import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, CalendarCheck, IndianRupee, MapPin, MessageCircle, ShieldCheck, Phone, ListChecks, Handshake } from 'lucide-react';
import { getCatalog, getSettings } from '@/lib/data/public';
import { ServiceCard } from '@/components/ServiceCard';
import { Reveal } from '@/components/Reveal';
import { phoneLinks } from '@/lib/format';
import { pageMetadata, SITE_URL } from '@/lib/seo';

export const dynamic = 'force-dynamic';
export const metadata = pageMetadata(
  'Home Services in MIHAN, Nagpur',
  'Book home cleaning and everyday household services in MIHAN, Nagpur. Choose your township, request a preferred time, and get confirmation from KaamSet.',
  '/',
);

const FAQ = [
  ['Who can use KaamSet?', 'KaamSet services are available across MIHAN, including Shiv Khailasa township, Moraj Waterfalls, Bloomdale and First City.'],
  ['Do I need an account?', 'No. You book with your name, mobile number, township, wing/apartment name and flat number. We give you a private link to view or change your booking.'],
  ['When is my booking confirmed?', 'Your request is submitted first. It is confirmed when the KaamSet team reviews and accepts your preferred date and time.'],
  ['How do I pay?', 'There is no online payment on this site. You pay after the service is completed, using the methods listed on the Payments policy page.'],
  ['Can I cancel or reschedule?', 'Yes, from My Bookings, within the time limits shown there. After that, please contact us.'],
];

export default async function HomePage() {
  const [{ services, error }, settings] = await Promise.all([getCatalog(), getSettings()]);
  const bookingEnabled = settings['booking.enabled'] !== false;
  const wa = phoneLinks(settings['contact.whatsapp']);
  const phone = phoneLinks(settings['contact.phone']);
  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: 'KaamSet',
      alternateName: 'Kaam Set',
      url: SITE_URL,
      logo: `${SITE_URL}/logo-mark.png`,
      description: 'Home cleaning and household services across MIHAN, Nagpur.',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      name: 'KaamSet',
      alternateName: 'Kaam Set',
      url: SITE_URL,
      publisher: { '@id': `${SITE_URL}/#organization` },
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} />
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-100/70 blur-3xl" />
        <div className="container-page grid items-center gap-10 py-12 md:grid-cols-[1.15fr_1fr] md:py-20">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3.5 py-1.5 text-sm font-medium text-brand-800">
              <MapPin className="h-4 w-4" aria-hidden /> Serving MIHAN
            </p>
            <h1 className="mt-5 text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">Home services in MIHAN, Nagpur</h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-600">
              Home chores, sorted. Book cleaning and everyday home help in Shiv Khailasa township, Moraj Waterfalls, Bloomdale and First City. Request a preferred date and time, then pay after the work is done.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/book" className="btn-primary px-6 py-3 text-base">Book a Service <ArrowRight className="h-4 w-4" aria-hidden /></Link>
              <Link href="/my-bookings" className="btn-secondary px-6 py-3 text-base">My Bookings</Link>
            </div>
            {!bookingEnabled && <p role="status" className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">Bookings are paused for now. Please check back soon.</p>}
          </div>
          <div className="card relative p-6 sm:p-8">
            <Image src="/logo.png" alt="KaamSet - Home chores, sorted." width={520} height={147} className="mx-auto h-auto w-full max-w-sm" priority />
          </div>
        </div>
      </section>

      <section className="container-page py-12" aria-labelledby="services-h">
        <div className="flex items-end justify-between gap-4">
          <div><h2 id="services-h" className="text-2xl font-bold sm:text-3xl">Services for your home</h2><p className="mt-2 text-ink-600">Prices are set by KaamSet and shown before you confirm.</p></div>
          <Link href="/services" className="hidden text-sm font-semibold text-brand-800 underline sm:block">View all services</Link>
        </div>
        {error ? (
          <p className="mt-8 rounded-2xl bg-amber-50 p-5 text-amber-900">We could not load services right now. Please refresh in a moment.</p>
        ) : services.length === 0 ? (
          <p className="card mt-8 p-8 text-center text-ink-600">Services will appear here once they are added.</p>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.slice(0, 6).map((s, i) => <Reveal key={s.id} delay={i * 0.04}><ServiceCard service={s} bookingEnabled={bookingEnabled} /></Reveal>)}
          </div>
        )}
      </section>

      <section className="bg-white py-14" aria-labelledby="how-h">
        <div className="container-page">
          <h2 id="how-h" className="text-2xl font-bold sm:text-3xl">How it works</h2>
          <ol className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              [ListChecks, 'Choose a service', 'Pick what you need and see the price up front.'],
              [CalendarCheck, 'Share your preferred time', 'Tell us the date and time that works for you.'],
              [Handshake, 'We review and confirm', 'The team checks your request and confirms the time. You pay once the work is done.'],
            ].map(([Icon, t, d], i) => {
              const I = Icon as typeof ListChecks;
              return (
                <li key={i} className="rounded-2xl border border-line bg-paper p-6">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500 text-ink-900"><I className="h-5 w-5" aria-hidden /></span>
                  <h3 className="mt-4 text-lg font-semibold">{t as string}</h3><p className="mt-1.5 text-sm text-ink-600">{d as string}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <section className="container-page py-14" aria-labelledby="why-h">
        <h2 id="why-h" className="text-2xl font-bold sm:text-3xl">Why KaamSet</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            [CalendarCheck, 'Convenient', 'Book in a minute from your phone. No app download, no account.'],
            [IndianRupee, 'Clear pricing', 'The price you see is the price recorded on your booking.'],
            [ShieldCheck, 'Serving MIHAN communities', 'Book home services across MIHAN, with your township selected at booking.'],
          ].map(([Icon, t, d], i) => {
            const I = Icon as typeof ShieldCheck;
            return <div key={i} className="card p-6"><I className="h-6 w-6 text-brand-700" aria-hidden /><h3 className="mt-3 text-lg font-semibold">{t as string}</h3><p className="mt-1.5 text-sm text-ink-600">{d as string}</p></div>;
          })}
        </div>
      </section>

      <section className="container-page pb-6" aria-labelledby="faq-h">
        <h2 id="faq-h" className="text-2xl font-bold sm:text-3xl">Questions, answered</h2>
        <div className="mt-6 divide-y divide-line rounded-2xl border border-line bg-white">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group p-5"><summary className="cursor-pointer list-none font-semibold text-ink-900 marker:hidden">{q}</summary><p className="mt-2 text-sm leading-relaxed text-ink-600">{a}</p></details>
          ))}
        </div>
      </section>

      <section className="container-page py-10">
        <div className="rounded-3xl border border-brand-200 bg-brand-50 p-6 sm:p-8">
          <h2 className="text-xl font-bold sm:text-2xl">Service area</h2>
          <p className="mt-2 max-w-2xl text-ink-700">KaamSet services are available across MIHAN, including Shiv Khailasa township, Moraj Waterfalls, Bloomdale and First City.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/contact" className="btn-secondary">Contact details</Link>
            {wa && <a href={wa.wa} className="btn-primary" rel="noopener noreferrer" target="_blank"><MessageCircle className="h-4 w-4" aria-hidden /> Chat on WhatsApp</a>}
            {phone && <a href={phone.tel} className="btn-secondary"><Phone className="h-4 w-4" aria-hidden /> Call us</a>}
          </div>
        </div>
      </section>
    </>
  );
}
