import { describe, expect, it } from 'vitest';
import { STATUSES, TRANSITIONS, canTransition, reasonRequired } from '@/lib/booking/rules';

describe('status transitions', () => {
  it('follows the allowed workflow', () => {
    expect(canTransition('pending', 'confirmed')).toBe(true);
    expect(canTransition('pending', 'rejected')).toBe(true);
    expect(canTransition('confirmed', 'in_progress')).toBe(true);
    expect(canTransition('in_progress', 'completed')).toBe(true);
  });
  it('blocks skipping steps and leaving terminal states', () => {
    expect(canTransition('pending', 'completed')).toBe(false);
    expect(canTransition('pending', 'in_progress')).toBe(false);
    for (const t of ['completed', 'cancelled', 'rejected'] as const) expect(TRANSITIONS[t]).toEqual([]);
  });
  it('never allows a self transition', () => STATUSES.forEach((s) => expect(canTransition(s, s)).toBe(false)));
  it('requires a reason to cancel or reject', () => {
    expect(reasonRequired('cancelled')).toBe(true); expect(reasonRequired('rejected')).toBe(true); expect(reasonRequired('confirmed')).toBe(false);
  });
});
