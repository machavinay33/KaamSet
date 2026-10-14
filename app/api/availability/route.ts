import { z } from 'zod';
import { publicClient } from '@/lib/supabase/public';
import { jsonError, jsonOk, rateLimit } from '@/lib/security/request';
import { log } from '@/lib/logger';

export const dynamic = 'force-dynamic';
const schema = z.object({ serviceId: z.string().uuid(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });

export async function GET(req: Request) {
  if (!(await rateLimit('avail', 90, 600, req.headers))) return jsonError(429, 'rate_limited', 'Too many requests. Please wait a moment.');
  const url = new URL(req.url);
  const parsed = schema.safeParse({ serviceId: url.searchParams.get('serviceId'), date: url.searchParams.get('date') });
  if (!parsed.success) return jsonError(400, 'invalid', 'Invalid request.');
  const { data, error } = await publicClient().rpc('get_available_slots', { p_service: parsed.data.serviceId, p_date: parsed.data.date });
  if (error) {
    log('error', 'availability_failed', { code: error.code });
    return jsonError(500, 'server_error', 'Could not load availability.');
  }
  return jsonOk({ status: data.status, slots: data.slots });
}
