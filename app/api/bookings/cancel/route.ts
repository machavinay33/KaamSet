import { cancelSchema, cleanText } from '@/lib/validation/booking';
import { serviceClient } from '@/lib/supabase/service';
import { hashAccessKey } from '@/lib/security/tokens';
import { jsonError, jsonOk, rateLimit, readJson, sameOrigin } from '@/lib/security/request';
import { messageFor } from '@/lib/booking/messages';
import { log } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!sameOrigin(req)) return jsonError(403, 'forbidden', 'Request blocked.');
  if (!(await rateLimit('cancel', 10, 600, req.headers))) return jsonError(429, 'rate_limited', 'Too many attempts. Please wait a few minutes.');
  const parsed = cancelSchema.safeParse(await readJson(req));
  if (!parsed.success) return jsonError(400, 'invalid', 'Invalid request.');
  const { reference, key, reason } = parsed.data;
  const { data, error } = await serviceClient().rpc('customer_cancel_booking', { p_reference: reference, p_token_hash: hashAccessKey(key), p_reason: cleanText(reason) });
  if (error) { log('error', 'cancel_failed', { code: error.code }); return jsonError(500, 'server_error', 'Could not cancel. Please try again.'); }
  if (!data?.ok) return jsonError(data?.code === 'not_found' ? 404 : 409, data?.code, messageFor(data?.code));
  log('info', 'booking_cancelled_by_customer', { reference });
  return jsonOk({});
}
