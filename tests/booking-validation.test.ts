import { describe, expect, it } from 'vitest';
import { bookingRequestSchema, cleanText, normalizePhone, lookupSchema, MIHAN_TOWNSHIPS, rescheduleSchema } from '@/lib/validation/booking';

const valid = {
  serviceId: '11111111-1111-4111-8111-111111111111', customerName: "Anita D'Souza", customerPhone: '+91 98765-43210',
  township: 'Shiv Khailasa township', buildingName: 'Tower B', flatNumber: '402',
  bookingDate: '2026-11-02', preferredTime: '13:00', instructions: '', acceptTerms: true, website: '',
  idempotencyKey: '33333333-3333-4333-8333-333333333333',
};

describe('booking validation', () => {
  it('accepts a valid request', () => expect(bookingRequestSchema.safeParse(valid).success).toBe(true));
  it.each(MIHAN_TOWNSHIPS)('accepts the township %s', (township) =>
    expect(bookingRequestSchema.safeParse({ ...valid, township }).success).toBe(true));
  it.each(['01:00', '12:00', '13:00', '23:59'])('accepts preferred time %s', (preferredTime) =>
    expect(bookingRequestSchema.safeParse({ ...valid, preferredTime }).success).toBe(true));
  it('accepts customer rescheduling with a preferred time and no slot ID', () =>
    expect(rescheduleSchema.safeParse({ reference: 'KS-ABCDEFGH', key: 'a'.repeat(32), bookingDate: '2026-11-02', preferredTime: '13:00' }).success).toBe(true));
  it('rejects an invalid time when rescheduling', () =>
    expect(rescheduleSchema.safeParse({ reference: 'KS-ABCDEFGH', key: 'a'.repeat(32), bookingDate: '2026-11-02', preferredTime: '25:00' }).success).toBe(false));
  it('normalises Indian mobile numbers', () => {
    expect(normalizePhone('+91 98765-43210')).toBe('9876543210');
    expect(normalizePhone('09876543210')).toBe('9876543210');
  });
  it.each([['customerPhone', '12345'], ['customerPhone', '5876543210'], ['customerName', 'A'], ['customerName', '<script>'], ['township', 'Other'], ['township', ''], ['buildingName', ''], ['flatNumber', ''], ['bookingDate', '2026-02-31'], ['preferredTime', '25:00'], ['acceptTerms', false]])(
    'rejects invalid %s', (field, value) => expect(bookingRequestSchema.safeParse({ ...valid, [field]: value }).success).toBe(false));
  it('rejects over-long instructions', () => expect(bookingRequestSchema.safeParse({ ...valid, instructions: 'x'.repeat(501) }).success).toBe(false));
  it('requires an idempotency key', () => expect(bookingRequestSchema.safeParse({ ...valid, idempotencyKey: undefined }).success).toBe(false));
  it('rejects a filled honeypot', () => expect(bookingRequestSchema.safeParse({ ...valid, website: 'http://spam' }).success).toBe(false));
  it('ignores client-supplied price/status fields (mass assignment)', () => {
    const r = bookingRequestSchema.parse({ ...valid, price_inr: 0, status: 'completed', payment_status: 'paid' } as any);
    expect(r).not.toHaveProperty('price_inr'); expect(r).not.toHaveProperty('status'); expect(r).not.toHaveProperty('payment_status');
  });
  it('strips control characters', () => expect(cleanText('Hi\u0000  there\n')).toBe('Hi there'));
  it('lookup needs both reference and a 32-char key', () => {
    expect(lookupSchema.safeParse({ items: [{ reference: 'KS-ABCDEFGH', key: 'short' }] }).success).toBe(false);
    expect(lookupSchema.safeParse({ items: [{ reference: 'KS-ABCDEFGH', key: 'a'.repeat(32) }] }).success).toBe(true);
    expect(lookupSchema.safeParse({ items: [{ reference: '9876543210', key: 'a'.repeat(32) }] }).success).toBe(false);
  });
});
