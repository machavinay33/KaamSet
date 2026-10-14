'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Info, Loader2 } from 'lucide-react';
import { loadSaved, lookupMany, removeSaved, saveBooking, type BookingView } from '@/lib/client/saved-bookings';
import { BookingCard } from '@/components/BookingCard';

type Item = { reference: string; key: string; booking: BookingView | null };

export function MyBookingsClient({ otpConfigured }: { otpConfigured: boolean }) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ref, setRef] = useState(''); const [key, setKey] = useState(''); const [formMsg, setFormMsg] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const saved = loadSaved();
      const results = await lookupMany(saved);
      const byRef = new Map(results.map((r) => [r.reference, r.booking]));
      setItems(saved.map((s) => ({ ...s, booking: byRef.get(s.reference) ?? null })));
    } catch (e) { setError((e as Error).message); } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    // Import a private link: /my-bookings#ref=KS-XXXXXXXX&key=...  (the fragment is never sent to the server)
    const h = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const r = h.get('ref'); const k = h.get('key');
    if (r && k && /^KS-[A-Z0-9]{8}$/.test(r) && /^[A-Za-z0-9_-]{32}$/.test(k)) {
      saveBooking(r, k);
      history.replaceState(null, '', window.location.pathname);
    }
    refresh();
  }, [refresh]);

  async function addManual(e: React.FormEvent) {
    e.preventDefault(); setFormMsg('');
    const r = ref.trim().toUpperCase(); const k = key.trim();
    if (!/^KS-[A-Z0-9]{8}$/.test(r) || !/^[A-Za-z0-9_-]{32}$/.test(k)) { setFormMsg('Check the reference (KS-XXXXXXXX) and the 32-character access key.'); return; }
    try {
      const [res] = await lookupMany([{ reference: r, key: k }]);
      if (!res?.booking) { setFormMsg('We could not find a booking with those details.'); return; }
      saveBooking(r, k); setRef(''); setKey(''); refresh();
    } catch (err) { setFormMsg((err as Error).message); }
  }

  const found = items.filter((i) => i.booking);
  const missing = items.filter((i) => !i.booking);

  return (
    <div className="space-y-8">
      <div className="flex gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-4 text-sm text-ink-800">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" aria-hidden />
        <p>{otpConfigured ? 'Verify with a one-time code sent to your mobile.' : 'SMS and WhatsApp verification codes are not enabled yet. To keep your bookings private, KaamSet uses a private access link created when you book. Bookings are never shown for a mobile number or reference alone.'}</p>
      </div>

      {loading && <p className="flex items-center gap-2 text-ink-600" role="status"><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading your bookings...</p>}
      {error && <div role="alert" className="card p-5"><p className="text-red-800">{error}</p><button className="btn-secondary mt-3" onClick={refresh}>Try again</button></div>}

      {!loading && !error && found.length === 0 && (
        <div className="card p-8 text-center"><h2 className="text-lg font-semibold">No bookings on this device yet</h2>
          <p className="mt-1 text-sm text-ink-600">Book a service, or open your private link or enter your reference and access key below.</p>
          <Link href="/book" className="btn-primary mt-4">Book a Service</Link></div>
      )}
      <div className="space-y-4">{found.map((i) => <BookingCard key={i.reference} booking={i.booking!} accessKey={i.key} onChanged={refresh} />)}</div>
      {missing.length > 0 && (
        <div className="card p-5 text-sm"><p className="font-medium">Some saved bookings could not be opened.</p>
          <ul className="mt-2 space-y-1">{missing.map((m) => <li key={m.reference} className="flex items-center justify-between gap-3"><span>{m.reference}</span><button className="font-semibold text-brand-800 underline" onClick={() => { removeSaved(m.reference); refresh(); }}>Remove</button></li>)}</ul></div>
      )}

      <form onSubmit={addManual} className="card space-y-4 p-5" noValidate>
        <h2 className="text-lg font-semibold">Open a booking with its access key</h2>
        <p className="text-sm text-ink-600">Use this on a new device. Your access key is the part after <code>key=</code> in your private link.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label" htmlFor="ref">Booking reference</label><input id="ref" className="input" placeholder="KS-XXXXXXXX" autoCapitalize="characters" value={ref} onChange={(e) => setRef(e.target.value)} /></div>
          <div><label className="label" htmlFor="key">Access key</label><input id="key" className="input font-mono" autoComplete="off" value={key} onChange={(e) => setKey(e.target.value)} /></div>
        </div>
        {formMsg && <p role="alert" className="text-sm text-red-700">{formMsg}</p>}
        <button className="btn-primary" type="submit">View booking</button>
      </form>
    </div>
  );
}
