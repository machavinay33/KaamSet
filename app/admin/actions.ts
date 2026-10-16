'use server';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/admin';
import { messageFor } from '@/lib/booking/messages';
import { cleanMultiline, cleanText } from '@/lib/validation/booking';
import { parseSettingsForm } from '@/lib/settings-schema';
import { serviceClient } from '@/lib/supabase/service';

const uuid = z.string().uuid();
const dateRe = /^\d{4}-\d{2}-\d{2}$/;
const slugRe = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const f = (fd: FormData, k: string) => String(fd.get(k) ?? '');
const blank = (v: string) => (v.trim() === '' ? undefined : v.trim());
const optInt = (min: number, max: number) => z.preprocess((v) => (v === '' || v == null ? undefined : v), z.coerce.number().int().min(min).max(max).optional());
const slugify = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
const SERVICE_IMAGE_BUCKET = 'service-images';

function supportedImageSignature(bytes: Uint8Array, mime: string): boolean {
  if (mime === 'image/jpeg') return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mime === 'image/png') return bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  if (mime === 'image/webp') return bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
  return false;
}

function back(path: string, kind: 'ok' | 'err', msg: string): never {
  const safe = path.startsWith('/admin') && !path.startsWith('//') ? path : '/admin';
  redirect(`${safe}${safe.includes('?') ? '&' : '?'}${kind}=${encodeURIComponent(msg)}`);
}
function dbMessage(error: { code?: string; message?: string }): string {
  if (error.code === '42501') return 'You are not authorised to do that.';
  if (error.code === '23505') return 'That name or slug is already in use.';
  if (error.code === '23503') return 'This item is still in use (for example by existing bookings), so it cannot be removed. Deactivate it instead.';
  if (error.code === '23514') return 'One of the values is outside the allowed range.';
  return 'Could not save. Please try again.';
}

/* ---------------- bookings ---------------- */
export async function changeStatusAction(fd: FormData) {
  const { supabase } = await requireAdmin();
  const p = z.object({ id: uuid, to: z.enum(['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'rejected']), reason: z.string().max(300) })
    .safeParse({ id: f(fd, 'id'), to: f(fd, 'to'), reason: cleanText(f(fd, 'reason')) });
  if (!p.success) back('/admin/bookings', 'err', 'Invalid request.');
  const path = `/admin/bookings/${p.data.id}`;
  const { data, error } = await supabase.rpc('admin_change_status', { p_booking_id: p.data.id, p_to: p.data.to, p_reason: p.data.reason });
  if (error) back(path, 'err', dbMessage(error));
  if (!data?.ok) back(path, 'err', messageFor(data?.code));
  back(path, 'ok', 'Status updated.');
}

export async function rescheduleAction(fd: FormData) {
  const { supabase } = await requireAdmin();
  const p = z.object({ id: uuid, date: z.string().regex(dateRe), preferredTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/), reason: z.string().max(300) })
    .safeParse({ id: f(fd, 'id'), date: f(fd, 'date'), preferredTime: f(fd, 'preferred_time'), reason: cleanText(f(fd, 'reason')) });
  if (!p.success) back('/admin/bookings', 'err', 'Choose a valid date and preferred time.');
  const path = `/admin/bookings/${p.data.id}`;
  const { data, error } = await supabase.rpc('admin_set_preferred_time', { p_booking_id: p.data.id, p_date: p.data.date, p_preferred_time: p.data.preferredTime, p_reason: p.data.reason });
  if (error) back(path, 'err', dbMessage(error));
  if (!data?.ok) back(path, 'err', messageFor(data?.code));
  back(path, 'ok', 'Preferred date and time updated. A pending request remains pending until you confirm it.');
}

export async function recordPaymentAction(fd: FormData) {
  const { supabase } = await requireAdmin();
  const p = z.object({ id: uuid, kind: z.enum(['payment', 'refund']), amount: z.coerce.number().positive().max(1_000_000), method: z.enum(['cash', 'upi', 'card', 'bank_transfer', 'other']), note: z.string().max(300) })
    .safeParse({ id: f(fd, 'id'), kind: f(fd, 'kind'), amount: f(fd, 'amount'), method: f(fd, 'method'), note: cleanText(f(fd, 'note')) });
  if (!p.success) back(`/admin/bookings/${f(fd, 'id')}`, 'err', 'Enter a valid amount and method.');
  const path = `/admin/bookings/${p.data.id}`;
  const { data, error } = await supabase.rpc('admin_record_payment', { p_booking_id: p.data.id, p_kind: p.data.kind, p_amount: p.data.amount, p_method: p.data.method, p_note: p.data.note });
  if (error) back(path, 'err', dbMessage(error));
  if (!data?.ok) back(path, 'err', messageFor(data?.code));
  back(path, 'ok', p.data.kind === 'payment' ? 'Payment recorded.' : 'Refund recorded.');
}

export async function addNoteAction(fd: FormData) {
  const { supabase, user } = await requireAdmin();
  const p = z.object({ id: uuid, body: z.string().min(1).max(2000) }).safeParse({ id: f(fd, 'id'), body: cleanMultiline(f(fd, 'body')) });
  if (!p.success) back(`/admin/bookings/${f(fd, 'id')}`, 'err', 'Write a note (up to 2000 characters).');
  const { error } = await supabase.from('booking_notes').insert({ booking_id: p.data.id, author_id: user.id, body: p.data.body });
  if (error) back(`/admin/bookings/${p.data.id}`, 'err', dbMessage(error));
  back(`/admin/bookings/${p.data.id}`, 'ok', 'Internal note added.');
}

export async function assignWorkerAction(fd: FormData) {
  const { supabase, user } = await requireAdmin();
  const p = z.object({ id: uuid, worker: uuid, op: z.enum(['assign', 'remove']) }).safeParse({ id: f(fd, 'id'), worker: f(fd, 'worker'), op: f(fd, 'op') });
  if (!p.success) back('/admin/bookings', 'err', 'Invalid request.');
  const path = `/admin/bookings/${p.data.id}`;
  const { error } = p.data.op === 'assign'
    ? await supabase.from('booking_assignments').upsert({ booking_id: p.data.id, worker_id: p.data.worker, assigned_by: user.id }, { onConflict: 'booking_id,worker_id' })
    : await supabase.from('booking_assignments').delete().eq('booking_id', p.data.id).eq('worker_id', p.data.worker);
  if (error) back(path, 'err', dbMessage(error));
  back(path, 'ok', p.data.op === 'assign' ? 'Worker assigned.' : 'Worker removed.');
}

/* ---------------- services ---------------- */
export async function saveServiceAction(fd: FormData) {
  const { supabase } = await requireAdmin();
  const raw = {
    id: blank(f(fd, 'id')), name: f(fd, 'name'), slug: blank(f(fd, 'slug')), category_id: blank(f(fd, 'category_id')),
    description: cleanMultiline(f(fd, 'description')), price_inr: f(fd, 'price_inr'),
    price_note: blank(f(fd, 'price_note')), duration_minutes: f(fd, 'duration_minutes'),
    min_lead_hours: f(fd, 'min_lead_hours'), max_advance_days: f(fd, 'max_advance_days'), unavailable_message: blank(f(fd, 'unavailable_message')),
  };
  const p = z.object({
    id: uuid.optional(), name: z.string().trim().min(2).max(80), slug: z.string().trim().toLowerCase().regex(slugRe).optional(), category_id: uuid.optional(),
    description: z.string().max(600), price_inr: z.coerce.number().min(0).max(1_000_000),
    price_note: z.string().max(40).optional(), duration_minutes: optInt(5, 1440), min_lead_hours: optInt(0, 720),
    max_advance_days: optInt(1, 365), unavailable_message: z.string().max(200).optional(),
  }).safeParse(raw);
  if (!p.success) back('/admin/services', 'err', `Check the service form: ${p.error.issues[0]?.path.join('.')} is invalid.`);
  const d = p.data;
  const days = [...new Set(fd.getAll('weekdays').map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6))];
  if (days.length === 0) back('/admin/services', 'err', 'Choose at least one day the service can be booked.');
  let existing: { image_path: string | null; icon: string } | null = null;
  if (d.id) {
    const { data, error } = await supabase.from('services').select('image_path, icon').eq('id', d.id).maybeSingle();
    if (error) back('/admin/services', 'err', dbMessage(error));
    existing = data;
  }
  const fileValue = fd.get('service_image');
  const imageFile = fileValue instanceof File && fileValue.size > 0 ? fileValue : null;
  let uploadedImagePath: string | null = null;
  if (imageFile) {
    if (imageFile.size > 3 * 1024 * 1024) back('/admin/services', 'err', 'Choose an image no larger than 3 MB.');
    const extension = imageFile.type === 'image/jpeg' ? 'jpg' : imageFile.type === 'image/png' ? 'png' : imageFile.type === 'image/webp' ? 'webp' : null;
    if (!extension) back('/admin/services', 'err', 'Use a JPEG, PNG or WebP image.');
    const bytes = new Uint8Array(await imageFile.arrayBuffer());
    if (!supportedImageSignature(bytes, imageFile.type)) back('/admin/services', 'err', 'The selected file is not a valid JPEG, PNG or WebP image.');
    uploadedImagePath = `services/${crypto.randomUUID()}.${extension}`;
    const { error } = await serviceClient().storage.from(SERVICE_IMAGE_BUCKET).upload(uploadedImagePath, bytes, {
      contentType: imageFile.type, cacheControl: '31536000', upsert: false,
    });
    if (error) back('/admin/services', 'err', 'Could not upload the image. Please try again.');
  }
  const row = {
    name: cleanText(d.name), slug: d.slug ?? (slugify(d.name) || 'service'), category_id: d.category_id ?? null, description: d.description,
    icon: existing?.icon ?? 'sparkles', image_path: uploadedImagePath ?? existing?.image_path ?? null,
    price_inr: d.price_inr, price_note: d.price_note ?? null, duration_minutes: d.duration_minutes ?? null,
    min_lead_hours: d.min_lead_hours ?? null, max_advance_days: d.max_advance_days ?? null, unavailable_message: d.unavailable_message ?? null,
    allowed_weekdays: days.length === 7 ? null : days, is_active: fd.get('is_active') === 'on', is_bookable: fd.get('is_bookable') === 'on',
  };
  let id = d.id;
  if (id) {
    const { error } = await supabase.from('services').update(row).eq('id', id);
    if (error) {
      if (uploadedImagePath) await serviceClient().storage.from(SERVICE_IMAGE_BUCKET).remove([uploadedImagePath]);
      back('/admin/services', 'err', dbMessage(error));
    }
  } else {
    const { data: last } = await supabase.from('services').select('sort_order').order('sort_order', { ascending: false }).limit(1).maybeSingle();
    const { data, error } = await supabase.from('services').insert({ ...row, sort_order: (last?.sort_order ?? 0) + 10 }).select('id').single();
    if (error) {
      if (uploadedImagePath) await serviceClient().storage.from(SERVICE_IMAGE_BUCKET).remove([uploadedImagePath]);
      back('/admin/services', 'err', dbMessage(error));
    }
    id = data!.id;
  }
  if (uploadedImagePath && existing?.image_path) await serviceClient().storage.from(SERVICE_IMAGE_BUCKET).remove([existing.image_path]);
  back('/admin/services', 'ok', d.id ? 'Service updated.' : 'Service created.');
}

export async function setServiceFlagAction(fd: FormData) {
  const { supabase } = await requireAdmin();
  const p = z.object({ id: uuid, flag: z.enum(['is_active', 'is_bookable']), value: z.enum(['true', 'false']) }).safeParse({ id: f(fd, 'id'), flag: f(fd, 'flag'), value: f(fd, 'value') });
  if (!p.success) back('/admin/services', 'err', 'Invalid request.');
  const { error } = await supabase.from('services').update({ [p.data.flag]: p.data.value === 'true' }).eq('id', p.data.id);
  if (error) back('/admin/services', 'err', dbMessage(error));
  back('/admin/services', 'ok', 'Service updated.');
}

export async function moveServiceAction(fd: FormData) {
  const { supabase } = await requireAdmin();
  const p = z.object({ id: uuid, dir: z.enum(['up', 'down']) }).safeParse({ id: f(fd, 'id'), dir: f(fd, 'dir') });
  if (!p.success) back('/admin/services', 'err', 'Invalid request.');
  const { data } = await supabase.from('services').select('id').order('sort_order').order('name');
  const ids = (data ?? []).map((r: any) => r.id as string);
  const i = ids.indexOf(p.data.id); const j = p.data.dir === 'up' ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= ids.length) back('/admin/services', 'ok', 'Order unchanged.');
  [ids[i], ids[j]] = [ids[j], ids[i]];
  const results = await Promise.all(ids.map((id, idx) => supabase.from('services').update({ sort_order: (idx + 1) * 10 }).eq('id', id)));
  if (results.some((r) => r.error)) back('/admin/services', 'err', 'Could not reorder.');
  back('/admin/services', 'ok', 'Order updated.');
}

export async function saveCategoryAction(fd: FormData) {
  const { supabase } = await requireAdmin();
  const p = z.object({ id: uuid.optional(), name: z.string().trim().min(2).max(60), sort: z.coerce.number().int().min(0).max(10000) })
    .safeParse({ id: blank(f(fd, 'id')), name: cleanText(f(fd, 'name')), sort: f(fd, 'sort_order') || '0' });
  if (!p.success) back('/admin/services', 'err', 'Enter a category name (2-60 characters).');
  const row = { name: p.data.name, sort_order: p.data.sort, is_active: fd.get('is_active') === 'on' };
  const { error } = p.data.id ? await supabase.from('service_categories').update(row).eq('id', p.data.id) : await supabase.from('service_categories').insert({ ...row, slug: slugify(p.data.name) || 'category' });
  if (error) back('/admin/services', 'err', dbMessage(error));
  back('/admin/services', 'ok', 'Category saved.');
}

/* ---------------- availability ---------------- */
export async function addBlockedDateAction(fd: FormData) {
  const { supabase } = await requireAdmin();
  const p = z.object({ date: z.string().regex(dateRe), service: uuid.optional(), reason: z.string().max(120) }).safeParse({ date: f(fd, 'blocked_on'), service: blank(f(fd, 'service_id')), reason: cleanText(f(fd, 'reason')) });
  if (!p.success) back('/admin/availability', 'err', 'Choose a date.');
  const { error } = await supabase.from('blocked_dates').insert({ blocked_on: p.data.date, service_id: p.data.service ?? null, reason: p.data.reason || null });
  if (error) back('/admin/availability', 'err', error.code === '23505' ? 'That date is already blocked.' : dbMessage(error));
  back('/admin/availability', 'ok', 'Date blocked.');
}

export async function deleteBlockedDateAction(fd: FormData) {
  const { supabase } = await requireAdmin();
  const id = uuid.safeParse(f(fd, 'id'));
  if (!id.success) back('/admin/availability', 'err', 'Invalid request.');
  const { error } = await supabase.from('blocked_dates').delete().eq('id', id.data);
  if (error) back('/admin/availability', 'err', dbMessage(error));
  back('/admin/availability', 'ok', 'Block removed.');
}

/* ---------------- workers ---------------- */
export async function saveWorkerAction(fd: FormData) {
  const { supabase } = await requireAdmin();
  const p = z.object({ id: uuid.optional(), name: z.string().trim().min(2).max(80), phone: z.string().max(20).optional(), notes: z.string().max(500).optional() })
    .safeParse({ id: blank(f(fd, 'id')), name: cleanText(f(fd, 'name')), phone: blank(f(fd, 'phone')), notes: blank(cleanMultiline(f(fd, 'notes'))) });
  if (!p.success) back('/admin/workers', 'err', 'Enter a worker name (2-80 characters).');
  const row = { name: p.data.name, phone: p.data.phone ?? null, notes: p.data.notes ?? null, is_active: fd.get('is_active') === 'on' };
  let id = p.data.id;
  if (id) { const { error } = await supabase.from('workers').update(row).eq('id', id); if (error) back('/admin/workers', 'err', dbMessage(error)); }
  else { const { data, error } = await supabase.from('workers').insert(row).select('id').single(); if (error) back('/admin/workers', 'err', dbMessage(error)); id = data!.id; }
  const svc = fd.getAll('service_ids').map(String).filter((s) => uuid.safeParse(s).success);
  await supabase.from('worker_services').delete().eq('worker_id', id!);
  if (svc.length) await supabase.from('worker_services').insert(svc.map((service_id) => ({ worker_id: id!, service_id })));
  back('/admin/workers', 'ok', 'Worker saved.');
}

/* ---------------- settings ---------------- */
export async function saveSettingsAction(fd: FormData) {
  const { supabase, user } = await requireAdmin();
  const { rows, errors } = parseSettingsForm(fd);
  if (errors.length) back('/admin/settings', 'err', errors[0]);
  const { error } = await supabase.from('business_settings').upsert(rows.map((r) => ({ ...r, updated_by: user.id })), { onConflict: 'key' });
  if (error) back('/admin/settings', 'err', dbMessage(error));
  back('/admin/settings', 'ok', 'Settings saved.');
}
