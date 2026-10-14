import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MessageCircle, Phone } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/admin';
import { Flash, flashFrom } from '@/components/admin/Flash';
import { ConfirmForm } from '@/components/admin/ConfirmForm';
import { PaymentBadge, StatusBadge } from '@/components/StatusBadge';
import { STATUS_LABELS, TRANSITIONS, reasonRequired, type BookingStatus } from '@/lib/booking/rules';
import { formatDate, formatDateTime, formatINR, formatTime, phoneLinks, todayIST } from '@/lib/format';
import { addNoteAction, assignWorkerAction, changeStatusAction, recordPaymentAction, rescheduleAction } from '@/app/admin/actions';

export const metadata = { title: 'Booking', robots: { index: false } };
const VERB: Record<string, string> = { confirmed: 'Confirm', rejected: 'Reject', in_progress: 'Mark in progress', completed: 'Mark completed', cancelled: 'Cancel booking' };

export default async function BookingDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params;
  const flash = flashFrom(await searchParams);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase } = await requireAdmin();
  const { data: b } = await supabase.from('bookings').select('*').eq('id', id).maybeSingle();
  if (!b) notFound();
  const [hist, pays, notes, assigned, workers, slots] = await Promise.all([
    supabase.from('booking_status_history').select('*').eq('booking_id', id).order('created_at'),
    supabase.from('payment_records').select('*').eq('booking_id', id).order('recorded_at'),
    supabase.from('booking_notes').select('*').eq('booking_id', id).order('created_at', { ascending: false }),
    supabase.from('booking_assignments').select('worker_id, workers(name)').eq('booking_id', id),
    supabase.from('workers').select('id, name').eq('is_active', true).order('name'),
    supabase.from('time_slots').select('id, label, start_time, end_time').eq('is_active', true).order('sort_order'),
  ]);
  const status = b.status as BookingStatus;
  const links = phoneLinks(b.customer_phone);
  const canReschedule = status === 'pending' || status === 'confirmed';
  const assignedIds = new Set((assigned.data ?? []).map((a: any) => a.worker_id));
  const payable = ['confirmed', 'in_progress', 'completed'].includes(status);

  return (
    <div className="space-y-6">
      <Link href="/admin/bookings" className="text-sm font-medium text-brand-800 underline">Back to bookings</Link>
      <Flash {...flash} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="font-display text-2xl font-bold">{b.reference}</h1><p className="text-sm text-ink-600">Created {formatDateTime(b.created_at)} · Updated {formatDateTime(b.updated_at)}</p></div>
        <div className="flex gap-2"><StatusBadge status={status} /><PaymentBadge status={b.payment_status} /></div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="card p-5"><h2 className="text-base font-semibold">Details</h2>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <div><dt className="text-ink-500">Service (price snapshot)</dt><dd className="font-medium">{b.service_name} · {formatINR(b.service_price_inr)}</dd></div>
              <div><dt className="text-ink-500">When</dt><dd className="font-medium">{formatDate(b.booking_date)}, {b.slot_label} ({formatTime(b.slot_start_time)} - {formatTime(b.slot_end_time)})</dd></div>
              <div><dt className="text-ink-500">Customer</dt><dd className="font-medium">{b.customer_name}</dd></div>
              <div><dt className="text-ink-500">Flat</dt><dd className="font-medium">{b.flat_identifier}</dd></div>
              <div><dt className="text-ink-500">Mobile</dt><dd className="font-medium">{b.customer_phone}</dd></div>
              <div><dt className="text-ink-500">Terms accepted</dt><dd className="font-medium">{formatDateTime(b.terms_accepted_at)}</dd></div>
              {b.instructions && <div className="sm:col-span-2"><dt className="text-ink-500">Customer instructions</dt><dd className="whitespace-pre-line font-medium">{b.instructions}</dd></div>}
              {b.cancellation_reason && <div className="sm:col-span-2"><dt className="text-ink-500">{status === 'rejected' ? 'Rejection' : 'Cancellation'} reason ({b.cancelled_by})</dt><dd className="font-medium">{b.cancellation_reason}</dd></div>}
            </dl>
            {links && <div className="mt-4 flex gap-2"><a className="btn-secondary btn-sm" href={links.tel}><Phone className="h-4 w-4" aria-hidden /> Call</a><a className="btn-secondary btn-sm" href={links.wa} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-4 w-4" aria-hidden /> WhatsApp</a></div>}
          </section>

          <section className="card p-5"><h2 className="text-base font-semibold">Payments</h2>
            {(pays.data ?? []).length === 0 ? <p className="mt-2 text-sm text-ink-600">No payment recorded. Amount due: {formatINR(b.service_price_inr)}.</p> : (
              <ul className="mt-3 divide-y divide-line text-sm">{(pays.data ?? []).map((p: any) => <li key={p.id} className="flex justify-between gap-3 py-2"><span>{p.kind === 'payment' ? 'Payment' : 'Refund'} via {p.method.replace('_', ' ')}{p.note ? ` - ${p.note}` : ''}</span><span className="text-right font-medium">{p.kind === 'refund' ? '-' : ''}{formatINR(p.amount)}<span className="block text-xs font-normal text-ink-500">{formatDateTime(p.recorded_at)}</span></span></li>)}</ul>
            )}
            {payable && b.payment_status !== 'refunded' && (
              <div className="mt-4">
                {b.payment_status === 'unpaid' ? (
                  <ConfirmForm action={recordPaymentAction} label="Record payment" title="Record payment received" description="Payment is collected manually after service. This does not charge anyone." confirmLabel="Save payment">
                    <input type="hidden" name="id" value={b.id} /><input type="hidden" name="kind" value="payment" />
                    <div><label className="label" htmlFor="amt">Amount (INR)</label><input id="amt" name="amount" type="number" step="0.01" min="0.01" required defaultValue={Number(b.service_price_inr)} className="input" /></div>
                    <div><label className="label" htmlFor="meth">Method</label><select id="meth" name="method" className="input"><option value="cash">Cash</option><option value="upi">UPI</option><option value="card">Card</option><option value="bank_transfer">Bank transfer</option><option value="other">Other</option></select></div>
                    <div><label className="label" htmlFor="pnote">Note (optional)</label><input id="pnote" name="note" maxLength={300} className="input" /></div>
                  </ConfirmForm>
                ) : (
                  <ConfirmForm action={recordPaymentAction} variant="danger" label="Record refund" title="Record a refund" description="Marks this booking as refunded. Refunds are recorded manually." confirmLabel="Record refund">
                    <input type="hidden" name="id" value={b.id} /><input type="hidden" name="kind" value="refund" />
                    <div><label className="label" htmlFor="ramt">Refund amount (INR)</label><input id="ramt" name="amount" type="number" step="0.01" min="0.01" required defaultValue={Number(b.service_price_inr)} className="input" /></div>
                    <div><label className="label" htmlFor="rmeth">Method</label><select id="rmeth" name="method" className="input"><option value="cash">Cash</option><option value="upi">UPI</option><option value="card">Card</option><option value="bank_transfer">Bank transfer</option><option value="other">Other</option></select></div>
                    <div><label className="label" htmlFor="rnote">Note</label><input id="rnote" name="note" maxLength={300} className="input" /></div>
                  </ConfirmForm>
                )}
              </div>
            )}
          </section>

          <section className="card p-5"><h2 className="text-base font-semibold">Internal notes <span className="text-xs font-normal text-ink-500">(never shown to customers)</span></h2>
            <form action={addNoteAction} className="mt-3 space-y-2"><input type="hidden" name="id" value={b.id} /><label className="sr-only" htmlFor="note">New note</label><textarea id="note" name="body" required maxLength={2000} rows={3} className="input" placeholder="Add a note for the team" /><button className="btn-secondary btn-sm" type="submit">Add note</button></form>
            <ul className="mt-4 space-y-3 text-sm">{(notes.data ?? []).map((n: any) => <li key={n.id} className="rounded-xl bg-brand-50/60 p-3"><p className="whitespace-pre-line">{n.body}</p><p className="mt-1 text-xs text-ink-500">{formatDateTime(n.created_at)}</p></li>)}</ul>
          </section>

          <section className="card p-5"><h2 className="text-base font-semibold">History</h2>
            <ol className="mt-3 space-y-3 text-sm">{(hist.data ?? []).map((h: any) => <li key={h.id} className="border-l-2 border-brand-300 pl-3"><p className="font-medium">{h.from_status ? `${STATUS_LABELS[h.from_status as BookingStatus]} → ` : ''}{STATUS_LABELS[h.to_status as BookingStatus]} <span className="font-normal text-ink-500">by {h.actor}</span></p>{h.reason && <p className="text-ink-600">{h.reason}</p>}<p className="text-xs text-ink-500">{formatDateTime(h.created_at)}</p></li>)}</ol>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="card p-5"><h2 className="text-base font-semibold">Actions</h2>
            {TRANSITIONS[status].length === 0 ? <p className="mt-2 text-sm text-ink-600">This booking is {STATUS_LABELS[status].toLowerCase()}; no further status changes.</p> : (
              <div className="mt-3 flex flex-wrap gap-2">
                {TRANSITIONS[status].map((to) => (
                  <ConfirmForm key={to} action={changeStatusAction} label={VERB[to]} variant={to === 'cancelled' || to === 'rejected' ? 'danger' : 'primary'} title={`${VERB[to]}?`}
                    description={`${b.reference} will move from ${STATUS_LABELS[status]} to ${STATUS_LABELS[to]}.`} confirmLabel={VERB[to]}>
                    <input type="hidden" name="id" value={b.id} /><input type="hidden" name="to" value={to} />
                    <div><label className="label" htmlFor={`reason-${to}`}>Reason {reasonRequired(to) ? '(required)' : '(optional)'}</label><input id={`reason-${to}`} name="reason" maxLength={300} required={reasonRequired(to)} className="input" /></div>
                  </ConfirmForm>
                ))}
              </div>
            )}
          </section>
          {canReschedule && (
            <section className="card p-5"><h2 className="text-base font-semibold">Reschedule</h2>
              <ConfirmForm action={rescheduleAction} label="Change date or slot" variant="secondary" title="Reschedule booking" description="Capacity and blocked dates are still enforced." confirmLabel="Reschedule">
                <input type="hidden" name="id" value={b.id} />
                <div><label className="label" htmlFor="rdate">New date</label><input id="rdate" name="date" type="date" required min={todayIST()} defaultValue={b.booking_date} className="input" /></div>
                <div><label className="label" htmlFor="rslot">Slot</label><select id="rslot" name="slot" className="input" defaultValue={b.slot_id}>{(slots.data ?? []).map((s: any) => <option key={s.id} value={s.id}>{s.label} ({formatTime(s.start_time)} - {formatTime(s.end_time)})</option>)}</select></div>
                <div><label className="label" htmlFor="rreason">Reason (optional)</label><input id="rreason" name="reason" maxLength={300} className="input" /></div>
              </ConfirmForm>
            </section>
          )}
          <section className="card p-5"><h2 className="text-base font-semibold">Assigned workers</h2>
            <ul className="mt-2 space-y-2 text-sm">{(assigned.data ?? []).map((a: any) => <li key={a.worker_id} className="flex items-center justify-between gap-2"><span>{a.workers?.name}</span>
              <form action={assignWorkerAction}><input type="hidden" name="id" value={b.id} /><input type="hidden" name="worker" value={a.worker_id} /><input type="hidden" name="op" value="remove" /><button className="text-xs font-semibold text-red-700 underline" type="submit">Remove</button></form></li>)}</ul>
            {(assigned.data ?? []).length === 0 && <p className="mt-2 text-sm text-ink-600">No worker assigned.</p>}
            {(workers.data ?? []).filter((w: any) => !assignedIds.has(w.id)).length > 0 && (
              <form action={assignWorkerAction} className="mt-3 flex gap-2"><input type="hidden" name="id" value={b.id} /><input type="hidden" name="op" value="assign" />
                <label className="sr-only" htmlFor="worker">Worker</label><select id="worker" name="worker" className="input">{(workers.data ?? []).filter((w: any) => !assignedIds.has(w.id)).map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}</select>
                <button className="btn-secondary btn-sm" type="submit">Assign</button></form>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
