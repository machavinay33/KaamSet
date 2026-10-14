import { NextResponse } from 'next/server';
import { publicEnv, serverEnv } from '@/lib/env';
import { serviceClient } from '@/lib/supabase/service';
import { hashForRateLimit } from '@/lib/security/tokens';
import { log } from '@/lib/logger';

type HeaderReader = { get(name: string): string | null };

export function clientIp(headers: HeaderReader): string {
  return headers.get('x-forwarded-for')?.split(',')[0]?.trim() || headers.get('x-real-ip') || 'unknown';
}

/** DB-backed fixed-window limiter. Fails closed if the limiter itself errors. */
export async function rateLimit(scope: string, limit: number, windowSeconds: number, headers: HeaderReader): Promise<boolean> {
  try {
    const key = `${scope}:${hashForRateLimit(clientIp(headers), serverEnv().APP_SECRET)}`;
    const { data, error } = await serviceClient().rpc('check_rate_limit', { p_key: key, p_limit: limit, p_window_seconds: windowSeconds });
    if (error) throw error;
    return data === true;
  } catch (e) {
    log('error', 'rate_limit_failure', { scope, message: (e as Error).message });
    return false;
  }
}

/** Basic CSRF defence for cookie-less JSON endpoints: reject cross-site browser requests. */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return true; // non-browser clients
  try {
    const o = new URL(origin);
    const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
    return o.host === host || o.origin === new URL(publicEnv().NEXT_PUBLIC_SITE_URL).origin;
  } catch {
    return false;
  }
}

export async function readJson(req: Request, maxBytes = 10_000): Promise<unknown | null> {
  const text = await req.text();
  if (text.length > maxBytes) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export const jsonError = (status: number, code: string, message: string, extra?: Record<string, unknown>) =>
  NextResponse.json({ ok: false, code, message, ...extra }, { status, headers: { 'Cache-Control': 'no-store' } });
export const jsonOk = (body: Record<string, unknown>, status = 200) =>
  NextResponse.json({ ok: true, ...body }, { status, headers: { 'Cache-Control': 'no-store' } });
