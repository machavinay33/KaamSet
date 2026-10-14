import Link from 'next/link';
import { requireAdmin } from '@/lib/auth/admin';
import { formatDate, formatINR } from '@/lib/format';
import { StatusBadge } from '@/components/StatusBadge';

export const metadata = { title: 'Admin overview', robots: { index: false } };

export default async function AdminHome() {
  const { supabase } = await requireAdmin();
  const [{ data: stats, error }, { data: pending }] = await Promise.all([
    supabase.rpc('admin_dashboard_stats'),
    supabase.from('bookings').select('id, reference, service_name, customer_name, booking_date, slot_label, status').eq('status', 'pending').order('booking_date').limit(8),
  ]);
  if (error || !stats) return <p role="alert" className="card p-6 text-red-800">Could not load statistics. Please refresh.</p>;
  const cards: [string, number, string?][] = [
    ["Today's bookings", stats.today], ['Pending requests', stats.pending, '/admin/bookings?status=pending'], ['Confirmed', stats.confirmed, '/admin/bookings?status=confirmed'],
    ['Completed', stats.completed, '/admin/bookings?status=completed'], ['Cancelled', stats.cancelled, '/admin/bookings?status=cancelled'], ['Upcoming', stats.upcoming],
  ];
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Overview</h1>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {cards.map(([label, n, href]) => {
          const inner = <><p className="text-sm text-ink-600">{label}</p><p className="mt-1 font-display text-3xl font-bold">{n}</p></>;
          return href ? <Link key={label} href={href} className="card p-4 hover:bg-brand-50">{inner}</Link> : <div key={label} className="card p-4">{inner}</div>;
        })}
      </div>
      <section aria-labelledby="rev-h">
        <h2 id="rev-h" className="text-lg font-semibold">Revenue</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="card border-emerald-200 p-5"><p className="text-sm text-ink-600">Collected (recorded payments, net of refunds)</p><p className="mt-1 font-display text-2xl font-bold">{formatINR(stats.revenue_collected)}</p></div>
          <div className="card p-5"><p className="text-sm text-ink-600">Expected (open bookings, unpaid)</p><p className="mt-1 font-display text-2xl font-bold">{formatINR(stats.expected_open)}</p></div>
          <div className="card p-5"><p className="text-sm text-ink-600">Completed but not yet paid</p><p className="mt-1 font-display text-2xl font-bold">{formatINR(stats.completed_unpaid)}</p></div>
        </div>
        <p className="mt-2 text-xs text-ink-500">Expected amounts are prices on bookings that have not been paid yet; they are not revenue until a payment is recorded.</p>
      </section>
      <section aria-labelledby="pend-h">
        <h2 id="pend-h" className="text-lg font-semibold">Pending requests</h2>
        {(pending ?? []).length === 0 ? <p className="card mt-3 p-6 text-sm text-ink-600">No pending requests right now.</p> : (
          <ul className="card mt-3 divide-y divide-line">
            {(pending ?? []).map((b: any) => (
              <li key={b.id}><Link href={`/admin/bookings/${b.id}`} className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 hover:bg-brand-50">
                <span><span className="font-semibold">{b.reference}</span> <span className="text-ink-600">- {b.service_name} for {b.customer_name}</span></span>
                <span className="flex items-center gap-3 text-sm text-ink-600">{formatDate(b.booking_date)}, {b.slot_label} <StatusBadge status={b.status} /></span></Link></li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
