import { describe, expect, it } from 'vitest';
import { isActiveAdmin } from '@/lib/auth/roles';
import { ACCESS_KEY_RE, REFERENCE_RE, deriveAccessKey, generateReference, hashAccessKey } from '@/lib/security/tokens';
import { csvCell } from '@/lib/admin/bookings-query';
import { parseSettingsForm, SETTING_FIELDS } from '@/lib/settings-schema';

const profile = { user_id: 'u1', full_name: 'A', role: 'admin', is_active: true };

describe('admin access control', () => {
  it('accepts only an active admin whose profile matches the signed-in user', () => {
    expect(isActiveAdmin(profile, 'u1')).toBe(true);
    expect(isActiveAdmin(null, 'u1')).toBe(false);
    expect(isActiveAdmin(profile, null)).toBe(false);
    expect(isActiveAdmin(profile, 'u2')).toBe(false);
    expect(isActiveAdmin({ ...profile, is_active: false }, 'u1')).toBe(false);
    expect(isActiveAdmin({ ...profile, role: 'customer' }, 'u1')).toBe(false);
  });
});

describe('private booking access', () => {
  const secret = 's'.repeat(40);
  it('generates non-sequential references', () => {
    const refs = new Set(Array.from({ length: 200 }, generateReference));
    expect(refs.size).toBe(200); refs.forEach((r) => expect(r).toMatch(REFERENCE_RE));
  });
  it('derives a stable 32-char key per idempotency key and secret', () => {
    const k = deriveAccessKey('abc', secret);
    expect(k).toMatch(ACCESS_KEY_RE); expect(deriveAccessKey('abc', secret)).toBe(k);
    expect(deriveAccessKey('abd', secret)).not.toBe(k); expect(deriveAccessKey('abc', 'x'.repeat(40))).not.toBe(k);
  });
  it('stores only a 64-char hash, never the key', () => {
    const k = deriveAccessKey('abc', secret); const h = hashAccessKey(k);
    expect(h).toMatch(/^[0-9a-f]{64}$/); expect(h).not.toContain(k);
  });
});

describe('admin helpers', () => {
  it('neutralises CSV formula injection', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`); expect(csvCell('+91')).toBe(`"'+91"`); expect(csvCell('plain')).toBe('"plain"');
  });
  it('settings form writes only allow-listed keys and validates', () => {
    const fd = new FormData(); fd.set('evil.key', 'x'); fd.set('booking.min_lead_hours', '-5');
    const r = parseSettingsForm(fd);
    expect(r.errors.length).toBeGreaterThan(0); expect(r.rows.every((x) => SETTING_FIELDS.some((f) => f.key === x.key))).toBe(true);
  });
});
