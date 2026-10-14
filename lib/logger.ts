const REDACT = /token|key|secret|password|phone|authorization|cookie|otp/i;

function scrub(value: unknown, depth = 0): unknown {
  if (depth > 4 || value == null) return value;
  if (Array.isArray(value)) return value.map((v) => scrub(v, depth + 1));
  if (typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, REDACT.test(k) ? '[redacted]' : scrub(v, depth + 1)]));
  }
  return value;
}

/** Structured JSON logs with sensitive keys redacted. Never pass raw tokens or phone numbers as message text. */
export function log(level: 'info' | 'warn' | 'error', event: string, data?: Record<string, unknown>) {
  const line = JSON.stringify({ level, event, time: new Date().toISOString(), ...(data ? { data: scrub(data) } : {}) });
  (level === 'error' ? console.error : level === 'warn' ? console.warn : console.log)(line);
}
