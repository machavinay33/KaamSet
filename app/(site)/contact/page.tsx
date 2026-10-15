import type { Metadata } from 'next';
import Link from 'next/link';
import { Clock, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { getSettings } from '@/lib/data/public';
import { phoneLinks } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Contact' };

export default async function ContactPage() {
  const s = await getSettings();
  const phone = phoneLinks(s['contact.phone']); const waNumber = String(s['contact.whatsapp'] || '+91 95293 41654'); const wa = phoneLinks(waNumber);
  const email = String(s['contact.email'] || ''); const hours = String(s['contact.hours'] || '');
  const any = phone || wa || email || hours;
  return (
    <div className="container-page max-w-3xl py-10 sm:py-14">
      <h1 className="text-3xl font-bold sm:text-4xl">Contact</h1>
      <p className="mt-2 text-ink-600">KaamSet services are available across MIHAN.</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {phone && <a className="card flex items-center gap-3 p-5 hover:bg-brand-50" href={phone.tel}><Phone className="h-5 w-5 text-brand-700" aria-hidden /><span><span className="block text-sm text-ink-500">Call</span><span className="font-semibold">{s['contact.phone']}</span></span></a>}
        {wa && <a className="card flex items-center gap-3 p-5 hover:bg-brand-50" href={wa.wa} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-5 w-5 text-brand-700" aria-hidden /><span><span className="block text-sm text-ink-500">WhatsApp chat</span><span className="font-semibold">{waNumber}</span></span></a>}
        {email && <a className="card flex items-center gap-3 p-5 hover:bg-brand-50" href={`mailto:${email}`}><Mail className="h-5 w-5 text-brand-700" aria-hidden /><span><span className="block text-sm text-ink-500">Email</span><span className="font-semibold">{email}</span></span></a>}
        {hours && <div className="card flex items-center gap-3 p-5"><Clock className="h-5 w-5 text-brand-700" aria-hidden /><span><span className="block text-sm text-ink-500">Operating hours</span><span className="font-semibold">{hours}</span></span></div>}
        <div className="card flex items-center gap-3 p-5"><MapPin className="h-5 w-5 text-brand-700" aria-hidden /><span><span className="block text-sm text-ink-500">Service area</span><span className="font-semibold">MIHAN</span></span></div>
      </div>
      {!any && <p className="card mt-6 p-5 text-sm text-ink-600">Contact details have not been published yet. You can still <Link className="font-semibold text-brand-800 underline" href="/book">book a service</Link> and track it in My Bookings.</p>}
      <p className="mt-6 text-sm text-ink-500">WhatsApp links open a normal chat. KaamSet does not send automated WhatsApp messages.</p>
    </div>
  );
}
