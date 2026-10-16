import { requireAdmin } from '@/lib/auth/admin';
import { Flash, flashFrom } from '@/components/admin/Flash';
import { ConfirmForm } from '@/components/admin/ConfirmForm';
import { formatDate } from '@/lib/format';
import { addBlockedDateAction, deleteBlockedDateAction } from '@/app/admin/actions';

export const metadata = { title: 'Availability', robots: { index: false } };

export default async function AvailabilityAdmin({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const flash = flashFrom(await searchParams);
  const { supabase } = await requireAdmin();
  const [b, s] = await Promise.all([
    supabase.from('blocked_dates').select('id, blocked_on, reason, service_id, services(name)').gte('blocked_on', new Date(Date.now() - 86400000).toISOString().slice(0, 10)).order('blocked_on'),
    supabase.from('services').select('id, name').order('name'),
  ]);
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Availability</h1>
      <Flash {...flash} />
      <p className="text-sm text-ink-600">Customers can request a preferred time, which the team confirms manually. You can block dates here for holidays or temporary closures. To pause all bookings, use Settings.</p>
      <section className="space-y-3" aria-labelledby="blk-h"><h2 id="blk-h" className="text-lg font-semibold">Blocked dates and holidays</h2>
        <form action={addBlockedDateAction} className="card grid gap-3 p-4 sm:grid-cols-4"><div><label className="label" htmlFor="bd">Date</label><input id="bd" name="blocked_on" type="date" required className="input" /></div>
          <div><label className="label" htmlFor="bs">Applies to</label><select id="bs" name="service_id" className="input"><option value="">All services</option>{(s.data ?? []).map((x: any) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></div>
          <div><label className="label" htmlFor="br">Reason</label><input id="br" name="reason" maxLength={120} className="input" placeholder="e.g. Holi" /></div>
          <div className="flex items-end"><button className="btn-primary btn-sm" type="submit">Block date</button></div></form>
        {(b.data ?? []).length === 0 ? <p className="card p-6 text-center text-sm text-ink-600">No upcoming blocked dates.</p> : (
          <ul className="card divide-y divide-line">{(b.data ?? []).map((d: any) => <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm"><span><strong>{formatDate(d.blocked_on)}</strong> · {d.services?.name ?? 'All services'}{d.reason ? ` · ${d.reason}` : ''}</span>
            <ConfirmForm action={deleteBlockedDateAction} variant="secondary" label="Remove" title="Remove this block?" confirmLabel="Remove"><input type="hidden" name="id" value={d.id} /></ConfirmForm></li>)}</ul>
        )}
      </section>
    </div>
  );
}
