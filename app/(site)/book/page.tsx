import type { Metadata } from 'next';
import { getCatalog, getSettings } from '@/lib/data/public';
import { BookingForm } from '@/components/BookingForm';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Book a Service' };

export default async function BookPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const [{ services, error }, settings] = await Promise.all([getCatalog(), getSettings()]);
  const slug = typeof sp.service === 'string' ? sp.service : undefined;
  const initial = services.find((s) => s.slug === slug && s.is_bookable)?.id;
  return (
    <div className="container-page py-10 sm:py-14">
      <h1 className="text-3xl font-bold sm:text-4xl">Book a service</h1>
      <p className="mt-2 max-w-2xl text-ink-600">Services are available across MIHAN. Choose your township when booking. No account needed.</p>
      {error ? <p className="mt-6 rounded-2xl bg-amber-50 p-5 text-amber-900">We could not load services right now. Please refresh in a moment.</p> : (
        <div className="mt-8">
          <BookingForm
            services={services} initialServiceId={initial} bookingEnabled={settings['booking.enabled'] !== false}
            maxAdvanceDays={Number(settings['booking.max_advance_days']) || 14}
            paymentNote={String(settings['payments.note'] ?? '')}
          />
        </div>
      )}
    </div>
  );
}
