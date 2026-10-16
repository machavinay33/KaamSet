import Link from 'next/link';
import { Clock } from 'lucide-react';
import { ServiceIcon } from '@/components/ServiceIcon';
import { formatINR } from '@/lib/format';
import type { Service } from '@/lib/data/public';

export function ServiceCard({ service, bookingEnabled }: { service: Service; bookingEnabled: boolean }) {
  const available = service.is_bookable && bookingEnabled;
  return (
    <article className="card flex h-full flex-col p-5 transition-shadow hover:shadow-md">
      <div className="relative mb-4 aspect-[4/3] overflow-hidden rounded-xl bg-brand-50">
        {service.image_url
          ? <div role="img" aria-label={service.name} className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url("${service.image_url}")` }} />
          : <div className="flex h-full w-full items-center justify-center text-brand-700"><ServiceIcon name={service.icon} className="h-12 w-12" /></div>}
        {!available && <span className="badge absolute right-2 top-2 bg-stone-100 text-stone-700 ring-1 ring-stone-200">Temporarily unavailable</span>}
      </div>
      <h3 className="mt-4 text-lg font-semibold">{service.name}</h3>
      <p className="mt-1.5 flex-1 text-sm leading-relaxed text-ink-600">{service.description}</p>
      {!available && service.unavailable_message && <p className="mt-2 text-sm text-amber-800">{service.unavailable_message}</p>}
      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <p className="font-display text-xl font-bold text-ink-900">{formatINR(service.price_inr)}</p>
          <p className="text-xs text-ink-500">{service.price_note ?? ''}</p>
          {service.duration_minutes && <p className="mt-1 flex items-center gap-1 text-xs text-ink-500"><Clock className="h-3.5 w-3.5" aria-hidden /> About {service.duration_minutes} min</p>}
        </div>
        {available ? <Link href={`/book?service=${service.slug}`} className="btn-primary btn-sm">Book now</Link> : <span className="btn-secondary btn-sm pointer-events-none opacity-60" aria-disabled="true">Unavailable</span>}
      </div>
    </article>
  );
}
