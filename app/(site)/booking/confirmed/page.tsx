import type { Metadata } from 'next';
import { getSettings } from '@/lib/data/public';
import { phoneLinks } from '@/lib/format';
import { ConfirmedClient } from '@/components/ConfirmedClient';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Booking submitted', robots: { index: false } };

export default async function ConfirmedPage() {
  const s = await getSettings();
  return (
    <div className="container-page max-w-3xl py-10 sm:py-14">
      <h1 className="mb-6 text-3xl font-bold">Booking summary</h1>
      <ConfirmedClient whatsappHref={phoneLinks(s['contact.whatsapp'])?.wa ?? null} />
    </div>
  );
}
