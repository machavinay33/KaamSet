import { bookingRequestSchema, cleanMultiline, cleanText, normalizePhone } from '@/lib/validation/booking';
import { serverEnv } from '@/lib/env';
import { serviceClient } from '@/lib/supabase/service';
import { deriveAccessKey, generateReference, hashAccessKey } from '@/lib/security/tokens';
import { jsonError, jsonOk, rateLimit, readJson, sameOrigin } from '@/lib/security/request';
import { messageFor } from '@/lib/booking/messages';
import { log } from '@/lib/logger';

export const dynamic = 'force-dynamic';
const STATUS_FOR: Record<string, number> = { slot_full: 409, already_booked: 409, too_many_active: 409 };

export async function POST(req: Request) {
  if (!sameOrigin(req)) return jsonError(403, 'forbidden', 'Request blocked.');
  if (!(await rateLimit('book', 8, 600, req.headers))) return jsonError(429, 'rate_limited', 'Too many booking attempts. Please wait a few minutes and try again.');

  const body = await readJson(req);
  const parsed = bookingRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(422, 'validation', 'Please check the highlighted fields.', { fieldErrors: parsed.error.flatten().fieldErrors });
  }
  const v = parsed.data;
  if (v.website) return jsonError(400, 'rejected', 'Request rejected.'); // honeypot

  const secret = serverEnv().APP_SECRET;
  const accessKey = deriveAccessKey(v.idempotencyKey, secret);
  const db = serviceClient();

  for (let attempt = 0; attempt < 3; attempt++) {
    const reference = generateReference();
    // Price, status and payment status are NEVER taken from the client: the DB snapshots them from the services table.
    const { data, error } = await db.rpc('create_booking', {
      p_service_id: v.serviceId, p_date: v.bookingDate, p_slot_id: v.slotId,
      p_name: cleanText(v.customerName), p_phone: normalizePhone(v.customerPhone), p_township: v.township,
      p_building_name: cleanText(v.buildingName), p_flat_number: cleanText(v.flatNumber),
      p_instructions: cleanMultiline(v.instructions ?? ''), p_reference: reference,
      p_token_hash: hashAccessKey(accessKey), p_idempotency: v.idempotencyKey,
    });
    if (error) {
      log('error', 'create_booking_failed', { code: error.code, message: error.message });
      return jsonError(500, 'server_error', 'We could not save your booking. Please try again.');
    }
    if (data?.ok) {
      log('info', 'booking_created', { reference: data.reference, duplicate: data.duplicate });
      return jsonOk({ reference: data.reference, accessKey, status: data.status, duplicate: !!data.duplicate }, data.duplicate ? 200 : 201);
    }
    if (data?.code === 'reference_collision') continue;
    return jsonError(STATUS_FOR[data?.code] ?? 422, data?.code ?? 'rejected', messageFor(data?.code));
  }
  return jsonError(500, 'server_error', 'We could not save your booking. Please try again.');
}
