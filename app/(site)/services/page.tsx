import type { Metadata } from 'next';
import { getCatalog, getSettings } from '@/lib/data/public';
import { ServiceCard } from '@/components/ServiceCard';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Services', description: 'Home services available across MIHAN, with prices.' };

export default async function ServicesPage() {
  const [{ categories, services, error }, settings] = await Promise.all([getCatalog(), getSettings()]);
  const enabled = settings['booking.enabled'] !== false;
  const groups = [...categories.map((c) => ({ id: c.id, name: c.name, items: services.filter((s) => s.category_id === c.id) })),
    { id: 'other', name: 'Other services', items: services.filter((s) => !s.category_id || !categories.some((c) => c.id === s.category_id)) }].filter((g) => g.items.length);
  return (
    <div className="container-page py-10 sm:py-14">
      <h1 className="text-3xl font-bold sm:text-4xl">Services</h1>
      <p className="mt-2 text-ink-600">Available across MIHAN. Prices are shown in rupees; you pay after the service.</p>
      {!enabled && <p role="status" className="mt-5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">Bookings are paused for now. You can still browse services.</p>}
      {error && <p className="mt-6 rounded-2xl bg-amber-50 p-5 text-amber-900">We could not load services right now. Please refresh in a moment.</p>}
      {!error && groups.length === 0 && <p className="card mt-8 p-8 text-center text-ink-600">No services are listed yet. Please check back soon.</p>}
      {groups.map((g) => (
        <section key={g.id} className="mt-10" aria-labelledby={`cat-${g.id}`}>
          <h2 id={`cat-${g.id}`} className="text-xl font-semibold">{g.name}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{g.items.map((s) => <ServiceCard key={s.id} service={s} bookingEnabled={enabled} />)}</div>
        </section>
      ))}
    </div>
  );
}
