'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Copy, Loader2 } from 'lucide-react';
import { loadSaved, lookupMany, privateLink, type BookingView } from '@/lib/client/saved-bookings';
import { BookingCard } from '@/components/BookingCard';

export function ConfirmedClient({ autoConfirm, whatsappHref }: { autoConfirm: boolean; whatsappHref: string | null }) {
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  const [booking, setBooking] = useState<BookingView | null>(null);
  const [key, setKey] = useState(''); const [link, setLink] = useState(''); const [copied, setCopied] = useState(false); const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const ref = new URLSearchParams(window.location.search).get('ref') ?? '';
    const saved = loadSaved().find((s) => s.reference === ref);
    if (!saved) { setState('missing'); return; }
    try {
      const [r] = await lookupMany([saved]);
      if (!r?.booking) { setState('missing'); return; }
      setBooking(r.booking); setKey(saved.key); setLink(privateLink(saved.reference, saved.key)); setState('ready');
    } catch (e) { setMsg((e as Error).message); setState('error'); }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (state === 'loading') return <p className="flex items-center gap-2 text-ink-600" role="status"><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading your booking...</p>;
  if (state === 'error') return <div role="alert" className="card p-6"><p className="text-red-800">{msg}</p><button className="btn-secondary mt-3" onClick={load}>Try again</button></div>;
  if (state === 'missing' || !booking) return (
    <div className="card p-6"><p className="font-medium">We could not open this booking on this device.</p>
      <p className="mt-2 text-sm text-ink-600">Use your private link, or enter your reference and access key in My Bookings.</p>
      <Link href="/my-bookings" className="btn-primary mt-4">Go to My Bookings</Link></div>
  );
  return (
    <div className="space-y-6">
      <div className="card flex items-start gap-4 border-emerald-200 bg-emerald-50/50 p-5">
        <CheckCircle2 className="mt-0.5 h-7 w-7 shrink-0 text-emerald-700" aria-hidden />
        <div><h2 className="text-xl font-bold">{booking.status === 'confirmed' ? 'Your booking is confirmed' : 'Booking request submitted'}</h2>
          <p className="mt-1 text-sm text-ink-700">{booking.status === 'confirmed' || autoConfirm ? 'Automatic confirmation is on, so your slot is reserved.' : 'It becomes confirmed only when the KaamSet team accepts it. Check My Bookings for updates.'} Payment is collected after the service.</p></div>
      </div>
      <BookingCard booking={booking} accessKey={key} onChanged={load} />
      <div className="card p-5">
        <h3 className="text-base font-semibold">Your private booking link</h3>
        <p className="mt-1 text-sm text-ink-600">Anyone with this link can view this booking. Keep it private. It is saved on this device, and you can use it to open the booking on another device.</p>
        <div className="mt-3 flex gap-2"><input readOnly aria-label="Private booking link" value={link} className="input font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
          <button className="btn-secondary shrink-0" onClick={async () => { try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ } }}><Copy className="h-4 w-4" aria-hidden /> {copied ? 'Copied' : 'Copy'}</button></div>
      </div>
      <div className="flex flex-wrap gap-3"><Link href="/my-bookings" className="btn-primary">My Bookings</Link><Link href="/services" className="btn-secondary">Book another service</Link>
        {whatsappHref && <a className="btn-secondary" href={whatsappHref} target="_blank" rel="noopener noreferrer">Chat on WhatsApp</a>}</div>
    </div>
  );
}
