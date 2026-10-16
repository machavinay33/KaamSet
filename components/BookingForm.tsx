'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { bookingFormSchema, MIHAN_TOWNSHIPS, type BookingFormValues } from '@/lib/validation/booking';
import { saveBooking } from '@/lib/client/saved-bookings';
import { addDays, formatDate, formatINR, formatTime, todayIST } from '@/lib/format';

export type ServiceOpt = {
  id: string; slug: string; name: string; price_inr: number; price_note: string | null; duration_minutes: number | null;
  is_bookable: boolean; unavailable_message: string | null; max_advance_days: number | null;
};
type Props = { services: ServiceOpt[]; initialServiceId?: string; bookingEnabled: boolean; maxAdvanceDays: number; paymentNote: string };

export function BookingForm({ services, initialServiceId, bookingEnabled, maxAdvanceDays, paymentNote }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [banner, setBanner] = useState<{ kind: 'error' | 'warn'; text: string } | null>(null);
  // One idempotency key per form session: a retry after a lost response returns the same booking instead of creating a second.
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const today = useMemo(() => todayIST(), []);

  const { register, handleSubmit, watch, setError, formState: { errors } } = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: { serviceId: initialServiceId ?? '', customerName: '', customerPhone: '', buildingName: '', flatNumber: '', bookingDate: '', preferredTime: '', instructions: '', acceptTerms: false, website: '' },
  });
  const serviceId = watch('serviceId'); const bookingDate = watch('bookingDate'); const preferredTime = watch('preferredTime');
  const service = services.find((s) => s.id === serviceId);
  const maxDate = addDays(today, service?.max_advance_days ?? maxAdvanceDays);

  async function onSubmit(values: BookingFormValues) {
    if (submitting) return;
    setSubmitting(true); setBanner(null);
    try {
      const res = await fetch('/api/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...values, idempotencyKey }) });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) {
        saveBooking(json.reference, json.accessKey);
        router.push(`/booking/confirmed?ref=${encodeURIComponent(json.reference)}`);
        return;
      }
      if (res.status === 422 && json.fieldErrors) {
        Object.entries(json.fieldErrors as Record<string, string[]>).forEach(([k, v]) => setError(k as keyof BookingFormValues, { message: v[0] }));
        setBanner({ kind: 'error', text: json.message });
      } else if (res.status === 409 || json.code === 'too_soon' || json.code === 'blocked_date') {
        setBanner({ kind: 'warn', text: json.message });
      } else {
        setBanner({ kind: 'error', text: json.message ?? 'Something went wrong. Please try again.' });
      }
    } catch {
      setBanner({ kind: 'error', text: 'Network problem. Your details are kept - check your connection and try again.' });
    } finally { setSubmitting(false); }
  }

  if (!bookingEnabled) return <div role="status" className="card p-6 text-ink-700">Bookings are paused right now. Please check back soon, or see <Link className="font-semibold text-brand-800 underline" href="/contact">contact details</Link>.</div>;
  if (services.length === 0) return <div className="card p-6 text-ink-700">No services are open for booking yet.</div>;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <input type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" {...register('website')} />
        {banner && <div role="alert" className={`flex gap-3 rounded-xl p-4 text-sm ${banner.kind === 'warn' ? 'bg-amber-50 text-amber-900' : 'bg-red-50 text-red-800'}`}><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />{banner.text}</div>}

        <fieldset className="card space-y-4 p-5"><legend className="px-1 text-base font-semibold">1. Service and schedule</legend>
          <div>
            <label htmlFor="serviceId" className="label">Service</label>
            <select id="serviceId" className="input" {...register('serviceId')} aria-invalid={!!errors.serviceId}>
              <option value="">Choose a service</option>
              {services.map((s) => <option key={s.id} value={s.id} disabled={!s.is_bookable}>{s.name} - {formatINR(s.price_inr)}{!s.is_bookable ? ' (temporarily unavailable)' : ''}</option>)}
            </select>
            {errors.serviceId && <p className="field-error">{errors.serviceId.message}</p>}
            {service && !service.is_bookable && <p className="field-error">{service.unavailable_message ?? 'This service is temporarily unavailable.'}</p>}
          </div>
          <div>
            <label htmlFor="bookingDate" className="label">Preferred date</label>
            <input id="bookingDate" type="date" className="input" min={today} max={maxDate} {...register('bookingDate')} aria-invalid={!!errors.bookingDate} />
            {errors.bookingDate && <p className="field-error">{errors.bookingDate.message}</p>}
          </div>
          <div>
            <label htmlFor="preferredTime" className="label">Preferred time</label>
            <input id="preferredTime" type="time" className="input" {...register('preferredTime')} aria-invalid={!!errors.preferredTime} />
            <p className="text-xs text-ink-500">Choose the time you prefer, such as 1:00 PM. The KaamSet team will review and confirm it.</p>
            {errors.preferredTime && <p className="field-error">{errors.preferredTime.message}</p>}
          </div>
        </fieldset>

        <fieldset className="card space-y-4 p-5"><legend className="px-1 text-base font-semibold">2. Your details</legend>
          <div><label htmlFor="customerName" className="label">Name</label><input id="customerName" autoComplete="name" className="input" {...register('customerName')} aria-invalid={!!errors.customerName} />{errors.customerName && <p className="field-error">{errors.customerName.message}</p>}</div>
          <div><label htmlFor="customerPhone" className="label">Mobile number</label><input id="customerPhone" inputMode="tel" autoComplete="tel" placeholder="10-digit mobile number" className="input" {...register('customerPhone')} aria-invalid={!!errors.customerPhone} />{errors.customerPhone && <p className="field-error">{errors.customerPhone.message}</p>}</div>
          <div><label htmlFor="township" className="label">Location / township</label><select id="township" className="input" defaultValue="" {...register('township')} aria-invalid={!!errors.township}><option value="" disabled>Choose your township</option>{MIHAN_TOWNSHIPS.map((township) => <option key={township} value={township}>{township}</option>)}</select>{errors.township && <p className="field-error">{errors.township.message}</p>}</div>
          <div><label htmlFor="buildingName" className="label">Wing/apartment name</label><input id="buildingName" autoComplete="address-line1" placeholder="e.g. Tower A" className="input" {...register('buildingName')} aria-invalid={!!errors.buildingName} />{errors.buildingName && <p className="field-error">{errors.buildingName.message}</p>}</div>
          <div><label htmlFor="flatNumber" className="label">Flat number</label><input id="flatNumber" autoComplete="address-line2" placeholder="e.g. 402" className="input" {...register('flatNumber')} aria-invalid={!!errors.flatNumber} />{errors.flatNumber && <p className="field-error">{errors.flatNumber.message}</p>}</div>
          <div><label htmlFor="instructions" className="label">Instructions <span className="font-normal text-ink-500">(optional)</span></label><textarea id="instructions" rows={3} maxLength={500} className="input" {...register('instructions')} />{errors.instructions && <p className="field-error">{errors.instructions.message}</p>}</div>
        </fieldset>

        <div className="card p-5">
          <label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1 h-5 w-5 rounded border-line accent-orange-600" {...register('acceptTerms')} />
            <span>I accept the <Link href="/policies/terms" target="_blank" className="font-semibold text-brand-800 underline">service terms</Link> and <Link href="/policies/cancellation" target="_blank" className="font-semibold text-brand-800 underline">cancellation policy</Link>.</span></label>
          {errors.acceptTerms && <p className="field-error">{errors.acceptTerms.message}</p>}
        </div>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="card space-y-3 p-5" aria-live="polite">
          <h2 className="text-base font-semibold">Booking summary</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-ink-600">Service</dt><dd className="text-right font-medium">{service?.name ?? '-'}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-ink-600">Date</dt><dd className="text-right font-medium">{bookingDate ? formatDate(bookingDate) : '-'}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-ink-600">Preferred time</dt><dd className="text-right font-medium">{preferredTime ? formatTime(preferredTime) : '-'}</dd></div>
            <div className="flex justify-between gap-3 border-t border-line pt-3 text-base"><dt className="font-semibold">Price</dt><dd className="font-display font-bold">{service ? formatINR(service.price_inr) : '-'}</dd></div>
          </dl>
          <p className="text-xs text-ink-600">{paymentNote}</p>
          <p className="rounded-xl bg-brand-50 p-3 text-xs text-ink-700">Submitting sends a request. Your preferred time is confirmed only when the KaamSet team accepts it.</p>
          <button type="submit" className="btn-primary w-full" disabled={submitting || (!!service && !service.is_bookable)}>
            {submitting ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Submitting...</> : 'Submit booking request'}
          </button>
        </div>
      </aside>
    </form>
  );
}
