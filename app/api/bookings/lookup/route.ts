import { lookupSchema } from '@/lib/validation/booking';
import { serviceClient } from '@/lib/supabase/service';
import { hashAccessKey } from '@/lib/security/tokens';
import { jsonError, jsonOk, rateLimit, readJson, sameOrigin } from '@/lib/security/request';
import { log } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/** Returns a booking only when BOTH the reference and its private access key match. Mobile numbers or references alone reveal nothing. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return jsonError(403, 'forbidden', 'Request blocked.');
  if (!(await rateLimit('lookup', 30, 600, req.headers))) return jsonError(429, 'rate_limited', 'Too many attempts. Please wait a few minutes.');
  const parsed = lookupSchema.safeParse(await readJson(req));
  if (!parsed.success) return jsonError(400, 'invalid', 'Invalid request.');
  const db = serviceClient();
  const results = await Promise.all(parsed.data.items.map(async ({ reference, key }) => {
    const { data, error } = await db.rpc('lookup_booking', { p_reference: reference, p_token_hash: hashAccessKey(key) });
    if (error) log('error', 'lookup_failed', { code: error.code });
    return { reference, booking: error ? null : data ?? null }; // identical shape for "wrong key" and "no such booking"
  }));
  return jsonOk({ results });
}
