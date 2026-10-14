import { requireAdmin } from '@/lib/auth/admin';
import { Flash, flashFrom } from '@/components/admin/Flash';
import { ConfirmForm } from '@/components/admin/ConfirmForm';
import { WEEKDAYS, formatDate } from '@/lib/format';
import { addBlockedDateAction, deleteBlockedDateAction, deleteSlotAction, saveSlotAction } from '@/app/admin/actions';

export const metadata = { title: 'Availability', robots: { index: false } };

function SlotForm({ slot }: { slot?: any }) {
  const k = slot?.id ?? 'new'; const days: number[] = slot?.weekdays ?? [0, 1, 2, 3, 4, 5, 6];
  return (
    <form action={saveSlotAction} className="space-y-3">{slot && <input type="hidden" name="id" value={slot.id} />}
      <div className="grid gap-3 sm:grid-cols-5">
        <div className="sm:col-span-2"><label className="label" htmlFor={`l-${k}`}>Slot name</label><input id={`l-${k}`} name="label" required defaultValue={slot?.label} className="input" /></div>
        <div><label className="label" htmlFor={`s-${k}`}>Start</label><input id={`s-${k}`} name="start_time" type="time" required defaultValue={slot?.start_time?.slice(0, 5)} className="input" /></div>
        <div><label className="label" htmlFor={`e-${k}`}>End</label><input id={`e-${k}`} name="end_time" type="time" required defaultValue={slot?.end_time?.slice(0, 5)} className="input" /></div>
        <div><label className="label" htmlFor={`m-${k}`}>Max bookings</label><input id={`m-${k}`} name="max_bookings" type="number" min="1" required defaultValue={slot?.max_bookings ?? 3} className="input" /></div>
      </div>
      <fieldset><legend className="label">Operating days</legend><div className="flex flex-wrap gap-3">{WEEKDAYS.map((d, i) => <label key={d} className="flex items-center gap-2 text-sm"><input type="checkbox" name="weekdays" value={i} defaultChecked={days.includes(i)} className="h-4 w-4 accent-orange-600" />{d}</label>)}</div></fieldset>
      <div className="flex flex-wrap items-center gap-4"><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_active" defaultChecked={slot ? slot.is_active : true} className="h-4 w-4 accent-orange-600" /> Active</label>
        <div className="flex items-center gap-2"><label className="text-sm" htmlFor={`o-${k}`}>Order</label><input id={`o-${k}`} name="sort_order" type="number" min="0" defaultValue={slot?.sort_order ?? 0} className="input w-24" /></div>
        <button className="btn-primary btn-sm" type="submit">{slot ? 'Save slot' : 'Add slot'}</button></div>
    </form>
  );
}

export default async function AvailabilityAdmin({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const flash = flashFrom(await searchParams);
  const { supabase } = await requireAdmin();
  const [t, b, s] = await Promise.all([
    supabase.from('time_slots').select('*').order('sort_order').order('start_time'),
    supabase.from('blocked_dates').select('id, blocked_on, reason, service_id, services(name)').gte('blocked_on', new Date(Date.now() - 86400000).toISOString().slice(0, 10)).order('blocked_on'),
    supabase.from('services').select('id, name').order('name'),
  ]);
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Availability</h1>
      <Flash {...flash} />
      <p className="text-sm text-ink-600">Slots define operating days and capacity. Service-specific days and slot restrictions are set on each service. To pause all bookings, use Settings.</p>
      <section className="space-y-3" aria-labelledby="slots-h"><h2 id="slots-h" className="text-lg font-semibold">Time slots</h2>
        {(t.data ?? []).map((slot: any) => (
          <details key={slot.id} className="card p-4"><summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 font-semibold">{slot.label} <span className="text-sm font-normal text-ink-600">{slot.start_time.slice(0, 5)}-{slot.end_time.slice(0, 5)} · max {slot.max_bookings} · {slot.is_active ? 'Active' : 'Inactive'}</span></summary>
            <div className="mt-4 space-y-3 border-t border-line pt-4"><SlotForm slot={slot} />
              <ConfirmForm action={deleteSlotAction} variant="danger" label="Delete slot" title="Delete this slot?" description="Slots used by existing bookings cannot be deleted; deactivate them instead." confirmLabel="Delete slot"><input type="hidden" name="id" value={slot.id} /></ConfirmForm></div></details>
        ))}
        <details className="card p-4"><summary className="cursor-pointer font-semibold">Add a slot</summary><div className="mt-4"><SlotForm /></div></details>
      </section>
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
