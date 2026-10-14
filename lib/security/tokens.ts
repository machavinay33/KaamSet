import { createHash, createHmac, randomInt } from 'node:crypto';

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O/1/I/L
export const REFERENCE_RE = /^KS-[A-Z0-9]{8}$/;
export const ACCESS_KEY_RE = /^[A-Za-z0-9_-]{32}$/;

/** Non-sequential booking reference, e.g. KS-7K3M9QXA (~40 bits, uniqueness enforced by the DB). */
export function generateReference(): string {
  let s = '';
  for (let i = 0; i < 8; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return `KS-${s}`;
}

/**
 * Private access key for a booking, derived from the client's idempotency key with a server secret.
 * Deterministic so a retried submission (lost response) returns the same key; unguessable without the secret.
 */
export function deriveAccessKey(idempotencyKey: string, secret: string): string {
  return createHmac('sha256', secret).update(`booking-access:${idempotencyKey}`).digest('base64url').slice(0, 32);
}

/** Only this SHA-256 hash is stored in the database. */
export function hashAccessKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

export function hashForRateLimit(value: string, secret: string): string {
  return createHmac('sha256', secret).update(`rl:${value}`).digest('hex').slice(0, 32);
}
