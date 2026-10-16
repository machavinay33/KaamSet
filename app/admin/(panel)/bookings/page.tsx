import Link from 'next/link';
import { Download, Search } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/admin';
import { applyFilters, PAGE_SIZE, parseFilters } from '@/lib/admin/bookings-query';
import { STATUSES, STATUS_LABELS, PAYMENT_LABELS } from '@/lib/booking/rules';
import { formatDate, formatINR, formatTime } from '@/lib/format';
import { PaymentBadge, StatusBadge } from '@/components/StatusBadge';

export const metadata = { title: 'Bookings', robots: { index: false } };

export default async function BookingsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { supabase } = await requireAdmin();
  const f = parseFilters(await searchParams);
  const from = (f.page - 1) * PAGE_SIZE;
  const [{ data: services }, listRes] = await Promise.all([
    supabase.from('services').select('id, name').order('name'),
    applyFilters(supabase.from('bookings').select('id, reference, service_name, service_price_inr, customer_name, township, building_name, flat_number, flat_identifier, booking_date, preferred_time, slot_label, status, payment_status, created_at', { count: 'exact' }), f)
      .order('booking_date', { ascending: false }).order('created_at', { ascending: false }).range(from, from + PAGE_SIZE - 1),
  ]);
  const rows = (listRes.data ?? []) as any[];
  const total = listRes.count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qs = (over: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    const base: Record<string, any> = { q: f.q, status: f.status, payment: f.payment, service: f.service, from: f.from, to: f.to, ...over };
    Object.entries(base).forEach(([k, v]) => { if (v !== undefined && v !== '') p.set(k, String(v)); });
    return p.toString();
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Bookings <span className="text-base font-normal text-ink-500">({total})</span></h1>
        <a className="btn-secondary btn-sm" href={`/admin/bookings/export?${qs({})}`}><Download className="h-4 w-4" aria-hidden /> Export CSV</a>
      </div>
      <form method="get" className="card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6">
        <div className="lg:col-span-2"><label className="label" htmlFor="q">Search</label><div className="relative"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-ink-400" aria-hidden /><input id="q" name="q" defaultValue={f.q} placeholder="Reference, name, mobile, township, flat" className="input pl-9" /></div></div>
        <div><label className="label" htmlFor="status">Status</label><select id="status" name="status" defaultValue={f.status ?? ''} className="input"><option value="">All</option>{STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}</select></div>
        <div><label className="label" htmlFor="payment">Payment</label><select id="payment" name="payment" defaultValue={f.payment ?? ''} className="input"><option value="">All</option>{Object.entries(PAYMENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        <div><label className="label" htmlFor="service">Service</label><select id="service" name="service" defaultValue={f.service ?? ''} className="input"><option value="">All</option>{(services ?? []).map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
        <div className="grid grid-cols-2 gap-2"><div><label className="label" htmlFor="from">From</label><input id="from" name="from" type="date" defaultValue={f.from} className="input" /></div><div><label className="label" htmlFor="to">To</label><input id="to" name="to" type="date" defaultValue={f.to} className="input" /></div></div>
        <div className="flex gap-2 sm:col-span-2 lg:col-span-6"><button className="btn-primary btn-sm" type="submit">Apply filters</button><Link href="/admin/bookings" className="btn-secondary btn-sm">Clear</Link></div>
      </form>
      {listRes.error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">Could not load bookings. Please retry.</p>}
      {rows.length === 0 && !listRes.error ? <p className="card p-8 text-center text-ink-600">No bookings match these filters.</p> : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-line bg-brand-50/60 text-xs text-ink-600"><tr><th className="px-4 py-3 font-semibold">Booking</th><th className="px-4 py-3 font-semibold">Customer</th><th className="px-4 py-3 font-semibold">When</th><th className="px-4 py-3 font-semibold">Amount</th><th className="px-4 py-3 font-semibold">Status</th><th className="px-4 py-3 font-semibold">Payment</th></tr></thead>
            <tbody className="divide-y divide-line">
              {rows.map((b) => (
                <tr key={b.id} className="hover:bg-brand-50/40">
                  <td className="px-4 py-3"><Link className="font-semibold text-brand-800 underline" href={`/admin/bookings/${b.id}`}>{b.reference}</Link><div className="text-ink-600">{b.service_name}</div></td>
                  <td className="px-4 py-3">{b.customer_name}<div className="text-ink-500">{[b.township, b.building_name, b.flat_number ? `Flat ${b.flat_number}` : null].filter(Boolean).join(' · ') || b.flat_identifier}</div></td>
                  <td className="px-4 py-3">{formatDate(b.booking_date)}<div className="text-ink-500">{b.preferred_time ? formatTime(b.preferred_time) : b.slot_label}</div></td>
                  <td className="px-4 py-3">{formatINR(b.service_price_inr)}</td>
                  <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                  <td className="px-4 py-3"><PaymentBadge status={b.payment_status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {pages > 1 && (
        <nav aria-label="Pagination" className="flex items-center justify-between text-sm">
          {f.page > 1 ? <Link className="btn-secondary btn-sm" href={`/admin/bookings?${qs({ page: f.page - 1 })}`}>Previous</Link> : <span />}
          <span className="text-ink-600">Page {f.page} of {pages}</span>
          {f.page < pages ? <Link className="btn-secondary btn-sm" href={`/admin/bookings?${qs({ page: f.page + 1 })}`}>Next</Link> : <span />}
        </nav>
      )}
    </div>
  );
}
