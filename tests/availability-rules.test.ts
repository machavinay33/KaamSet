import { describe, expect, it } from 'vitest';
import { bookableDateBounds, customerCanAct, hasCapacity, slotStart } from '@/lib/booking/rules';

describe('capacity and time rules', () => {
  it('enforces slot capacity', () => { expect(hasCapacity(2, 3)).toBe(true); expect(hasCapacity(3, 3)).toBe(false); expect(hasCapacity(4, 3)).toBe(false); });
  it('interprets slot times in India time', () => expect(slotStart('2026-11-02', '09:00:00').toISOString()).toBe('2026-11-02T03:30:00.000Z'));
  it('computes lead and advance bounds', () => {
    const now = new Date('2026-11-01T06:30:00Z'); // 12:00 IST
    expect(bookableDateBounds(now, 4, 14)).toEqual({ earliest: '2026-11-01', latest: '2026-11-15' });
    expect(bookableDateBounds(new Date('2026-11-01T17:30:00Z'), 4, 14).earliest).toBe('2026-11-02'); // 23:00 IST + 4h
  });
  const base = { status: 'confirmed' as const, date: '2026-11-02', startTime: '09:00:00', now: new Date('2026-11-01T18:30:00Z'), allowed: true, minHoursBefore: 6 };
  it('allows customer changes only inside the configured window', () => {
    expect(customerCanAct({ ...base, now: new Date('2026-11-01T10:00:00Z') })).toBe(true);   // 15:30 IST the day before
    expect(customerCanAct({ ...base, now: new Date('2026-11-02T00:00:00Z') })).toBe(false);  // 05:30 IST, 3.5h before
    expect(customerCanAct({ ...base, allowed: false, now: new Date('2026-11-01T10:00:00Z') })).toBe(false);
    expect(customerCanAct({ ...base, status: 'completed', now: new Date('2026-11-01T10:00:00Z') })).toBe(false);
    expect(customerCanAct({ ...base, status: 'in_progress', now: new Date('2026-11-01T10:00:00Z') })).toBe(false);
  });
});
