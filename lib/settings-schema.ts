export type FieldType = 'text' | 'textarea' | 'number' | 'bool' | 'methods';
export type FieldDef = {
  key: string; label: string; group: string; type: FieldType; default: unknown; public: boolean;
  help?: string; min?: number; max?: number; kind?: 'phone' | 'email';
};
export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' }, { value: 'upi', label: 'UPI' }, { value: 'card', label: 'Card' }, { value: 'bank_transfer', label: 'Bank transfer' },
] as const;

/** Allow-list of editable settings. Anything not listed here can never be written (no mass assignment). No secrets live here. */
export const SETTING_FIELDS: FieldDef[] = [
  { key: 'society.name', label: 'Service area', group: 'Society', type: 'text', default: 'MIHAN', public: true },
  { key: 'society.location', label: 'Location', group: 'Society', type: 'text', default: 'Nagpur, Maharashtra', public: true },
  { key: 'notice.banner', label: 'Customer notice (shown site-wide)', group: 'Society', type: 'text', default: '', public: true, help: 'Leave empty to hide.' },
  { key: 'contact.phone', label: 'Phone number', group: 'Contact', type: 'text', default: '', public: true, kind: 'phone', help: 'Shown to customers only when filled in.' },
  { key: 'contact.whatsapp', label: 'WhatsApp number', group: 'Contact', type: 'text', default: '+91 95293 41654', public: true, kind: 'phone', help: 'Creates a normal wa.me chat link. No WhatsApp API is used.' },
  { key: 'contact.email', label: 'Email', group: 'Contact', type: 'text', default: '', public: true, kind: 'email' },
  { key: 'contact.hours', label: 'Business operating hours', group: 'Contact', type: 'text', default: '', public: true, help: 'e.g. Mon-Sat, 9 AM - 6 PM' },
  { key: 'booking.enabled', label: 'Accept new bookings', group: 'Booking', type: 'bool', default: true, public: true, help: 'Turn off to pause all bookings temporarily.' },
  { key: 'booking.min_lead_hours', label: 'Minimum lead time (hours)', group: 'Booking', type: 'number', default: 4, public: true, min: 0, max: 720 },
  { key: 'booking.max_advance_days', label: 'Book up to (days ahead)', group: 'Booking', type: 'number', default: 14, public: true, min: 1, max: 365 },
  { key: 'booking.max_active_per_phone', label: 'Max active bookings per mobile number', group: 'Booking', type: 'number', default: 5, public: false, min: 1, max: 50 },
  { key: 'cancellation.customer_allowed', label: 'Customers may cancel online', group: 'Cancellation & rescheduling', type: 'bool', default: true, public: true },
  { key: 'cancellation.min_hours_before', label: 'Cancel allowed until (hours before requested time)', group: 'Cancellation & rescheduling', type: 'number', default: 6, public: true, min: 0, max: 720 },
  { key: 'reschedule.customer_allowed', label: 'Customers may reschedule online', group: 'Cancellation & rescheduling', type: 'bool', default: true, public: true },
  { key: 'reschedule.min_hours_before', label: 'Reschedule allowed until (hours before requested time)', group: 'Cancellation & rescheduling', type: 'number', default: 12, public: true, min: 0, max: 720 },
  { key: 'payments.methods', label: 'Payment methods accepted after service', group: 'Payments', type: 'methods', default: ['cash', 'upi'], public: true },
  { key: 'payments.note', label: 'Payment explanation', group: 'Payments', type: 'textarea', default: 'Pay after the service is completed.', public: true },
  { key: 'policy.terms', label: 'Service terms', group: 'Policies', type: 'textarea', default: '', public: true },
  { key: 'policy.privacy', label: 'Privacy policy', group: 'Policies', type: 'textarea', default: '', public: true },
  { key: 'policy.cancellation', label: 'Cancellation policy', group: 'Policies', type: 'textarea', default: '', public: true },
  { key: 'policy.payment', label: 'Payment policy', group: 'Policies', type: 'textarea', default: '', public: true },
];

export type Settings = Record<string, any>;

export function defaultSettings(): Settings {
  return Object.fromEntries(SETTING_FIELDS.map((f) => [f.key, f.default]));
}

export function parseSettingsForm(fd: FormData): { rows: { key: string; value: unknown; is_public: boolean }[]; errors: string[] } {
  const rows: { key: string; value: unknown; is_public: boolean }[] = [];
  const errors: string[] = [];
  for (const f of SETTING_FIELDS) {
    let value: unknown;
    if (f.type === 'bool') value = fd.get(f.key) === 'on';
    else if (f.type === 'methods') {
      const allowed: string[] = PAYMENT_METHODS.map((m) => m.value);
      value = fd.getAll(f.key).map(String).filter((v) => allowed.includes(v));
    } else if (f.type === 'number') {
      const n = Number(fd.get(f.key));
      if (!Number.isInteger(n) || n < (f.min ?? 0) || n > (f.max ?? 100000)) { errors.push(`${f.label}: enter a whole number between ${f.min ?? 0} and ${f.max}`); continue; }
      value = n;
    } else {
      const raw = String(fd.get(f.key) ?? '').replace(/\r/g, '').replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, '').trim();
      const max = f.type === 'textarea' ? 8000 : 200;
      if (raw.length > max) { errors.push(`${f.label}: too long`); continue; }
      if (raw && f.kind === 'phone' && !/^\+?[0-9 \-]{8,16}$/.test(raw)) { errors.push(`${f.label}: enter a valid phone number`); continue; }
      if (raw && f.kind === 'email' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(raw)) { errors.push(`${f.label}: enter a valid email`); continue; }
      value = raw;
    }
    rows.push({ key: f.key, value, is_public: f.public });
  }
  return { rows, errors };
}
