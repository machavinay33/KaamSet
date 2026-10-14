import { z } from 'zod';

export const PAGE_SIZE = 25;
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const filterSchema = z.object({
  q: z.string().max(60).optional(),
  status: z.enum(['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'rejected']).optional(),
  payment: z.enum(['unpaid', 'paid', 'refunded']).optional(),
  service: z.string().uuid().optional(),
  from: date.optional(),
  to: date.optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
});
export type BookingFilters = z.infer<typeof filterSchema>;

export function parseFilters(sp: Record<string, string | string[] | undefined> | URLSearchParams): BookingFilters {
  const get = (k: string) => {
    const v = sp instanceof URLSearchParams ? sp.get(k) ?? undefined : Array.isArray(sp[k]) ? (sp[k] as string[])[0] : (sp[k] as string | undefined);
    return v === '' ? undefined : v;
  };
  const parsed = filterSchema.safeParse({ q: get('q'), status: get('status'), payment: get('payment'), service: get('service'), from: get('from'), to: get('to'), page: get('page') });
  return parsed.success ? parsed.data : { page: 1 };
}

/** Applies validated filters. Search text is stripped of PostgREST filter syntax characters before use. */
export function applyFilters<T>(query: T, f: BookingFilters): T {
  let q: any = query;
  if (f.status) q = q.eq('status', f.status);
  if (f.payment) q = q.eq('payment_status', f.payment);
  if (f.service) q = q.eq('service_id', f.service);
  if (f.from) q = q.gte('booking_date', f.from);
  if (f.to) q = q.lte('booking_date', f.to);
  if (f.q) {
    const t = f.q.replace(/[%,()*\\:"'.]/g, ' ').trim();
    if (t) q = q.or(`reference.ilike.%${t}%,customer_name.ilike.%${t}%,customer_phone.ilike.%${t}%,flat_identifier.ilike.%${t}%`);
  }
  return q as T;
}

/** Prevents CSV/Excel formula injection. */
export function csvCell(v: unknown): string {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}
