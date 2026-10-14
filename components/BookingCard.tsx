'use client';
import { useState } from 'react';
import { CalendarClock, Loader2, XCircle } from 'lucide-react';
import { StatusBadge, PaymentBadge } from '@/components/StatusBadge';
import { SlotPicker } from '@/components/SlotPicker';
import { formatDate, formatINR, formatTime, addDays, todayIST } from '@/lib/format';
import type { BookingView } from '@/lib/client/saved-bookings';

/** Shows one booking and (when the business rules allow) lets the customer cancel or reschedule it. */
export function BookingCard({ booking, accessKey, onChanged }: { booking: BookingView; accessKey: string; onChanged: () => void }) {
  const [mode, setMode] = useState<'view' | 'cancel' | 'reschedule'>('view');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reason, setReason] = useState('');
  const [date, setDate] = useState(''); const [slotId, setSlotId] = useState('');

  async function call(path: string, body: Record<string, unknown>) {
    setBusy(true); setError('');
    try {
      const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reference: booking.reference, key: accessKey, ...body }) });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) { setMode('view'); onChanged(); } else setError(json.message ?? 'Something went wrong. Please try again.');
    } catch { setError('Network problem. Please check your connection and try again.'); } finally { setBusy(false); }
  }

  return (
    <article className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-xs font-medium text-ink-500">Reference</p><p className="font-display text-lg font-bold tracking-wide">{booking.reference}</p></div>
        <div className="flex gap-2"><StatusBadge status={booking.status} /><PaymentBadge status={booking.payment_status} /></div>
      </div>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div><dt className="text-ink-500">Service</dt><dd className="font-medium">{booking.service_name}</dd></div>
        <div><dt className="text-ink-500">Amount (pay after service)</dt><dd className="font-medium">{formatINR(booking.price_inr)}</dd></div>
        <div><dt className="text-ink-500">Date</dt><dd className="font-medium">{formatDate(booking.booking_date)}</dd></div>
        <div><dt className="text-ink-500">Time</dt><dd className="font-medium">{booking.slot_label}, {formatTime(booking.slot_start_time)} - {formatTime(booking.slot_end_time)}</dd></div>
        <div><dt className="text-ink-500">Flat</dt><dd className="font-medium">{booking.flat_identifier}</dd></div>
        {booking.instructions && <div><dt className="text-ink-500">Your instructions</dt><dd className="font-medium">{booking.instructions}</dd></div>}
      </dl>
      {booking.status === 'pending' && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Request received. It is confirmed only when the KaamSet team accepts it.</p>}
      {(booking.status === 'cancelled' || booking.status === 'rejected') && booking.cancellation_reason && <p className="mt-4 text-sm text-ink-600">Reason: {booking.cancellation_reason}</p>}

      {mode === 'view' && (booking.can_cancel || booking.can_reschedule) && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
          {booking.can_reschedule && <button className="btn-secondary btn-sm" onClick={() => setMode('reschedule')}><CalendarClock className="h-4 w-4" aria-hidden /> Reschedule</button>}
          {booking.can_cancel && <button className="btn-danger btn-sm" onClick={() => setMode('cancel')}><XCircle className="h-4 w-4" aria-hidden /> Cancel booking</button>}
        </div>
      )}
      {mode === 'view' && !booking.can_cancel && !booking.can_reschedule && (booking.status === 'pending' || booking.status === 'confirmed') && (
        <p className="mt-4 border-t border-line pt-4 text-xs text-ink-500">Online changes are closed for this booking. Please contact us if you need help.</p>
      )}

      {mode === 'cancel' && (
        <div className="mt-4 space-y-3 border-t border-line pt-4">
          <label className="label" htmlFor={`r-${booking.reference}`}>Reason (optional)</label>
          <input id={`r-${booking.reference}`} className="input" maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} />
          <div className="flex gap-2">
            <button className="btn-danger btn-sm" disabled={busy} onClick={() => call('/api/bookings/cancel', { reason })}>{busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Yes, cancel booking</button>
            <button className="btn-secondary btn-sm" onClick={() => setMode('view')}>Keep booking</button>
          </div>
        </div>
      )}
      {mode === 'reschedule' && (
        <div className="mt-4 space-y-3 border-t border-line pt-4">
          <label className="label" htmlFor={`d-${booking.reference}`}>New date</label>
          <input id={`d-${booking.reference}`} type="date" className="input" min={todayIST()} max={addDays(todayIST(), 60)} value={date} onChange={(e) => { setDate(e.target.value); setSlotId(''); }} />
          <SlotPicker serviceId={booking.service_id} date={date} value={slotId} onChange={setSlotId} />
          <p className="text-xs text-ink-500">If automatic confirmation is off, a rescheduled booking returns to Pending until the team confirms it.</p>
          <div className="flex gap-2">
            <button className="btn-primary btn-sm" disabled={busy || !date || !slotId} onClick={() => call('/api/bookings/reschedule', { bookingDate: date, slotId })}>{busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Confirm new time</button>
            <button className="btn-secondary btn-sm" onClick={() => setMode('view')}>Back</button>
          </div>
        </div>
      )}
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    </article>
  );
}
