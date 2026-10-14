import { z } from 'zod';

export function normalizePhone(v: string): string {
  const s = v.replace(/[\s\-().]/g, '');
  return s.replace(/^(\+91|91|0)(?=[6-9]\d{9}$)/, '');
}
export const isValidIndianMobile = (v: string) => /^[6-9]\d{9}$/.test(normalizePhone(v));

/** Strips control characters, collapses whitespace. */
export function cleanText(v: string): string {
  return v.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim();
}
/** Keeps line breaks but strips other control characters and runs of blank lines. */
export function cleanMultiline(v: string): string {
  return v.replace(/\r/g, '').replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, '').replace(/\n{3,}/g, '\n\n').trim();
}

const isRealDate = (s: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};

/** Shared by the browser form and the server endpoint. */
export const bookingFormSchema = z.object({
  serviceId: z.string().uuid('Choose a service'),
  customerName: z.string().trim().min(2, 'Enter your full name').max(80, 'Name is too long')
    .regex(/^[\p{L}\p{M}][\p{L}\p{M}\s.'-]*$/u, 'Use letters only'),
  customerPhone: z.string().trim().refine(isValidIndianMobile, 'Enter a valid 10-digit mobile number'),
  flatIdentifier: z.string().trim().min(1, 'Enter your flat / block').max(40, 'Too long')
    .regex(/^[A-Za-z0-9][A-Za-z0-9\s\-/,.#]*$/, 'Use letters, numbers, - / , . only'),
  bookingDate: z.string().refine(isRealDate, 'Choose a date'),
  slotId: z.string().uuid('Choose a time slot'),
  instructions: z.string().max(500, 'Keep instructions under 500 characters').optional().default(''),
  acceptTerms: z.boolean().refine((v) => v === true, 'Please accept the terms and cancellation policy'),
  website: z.string().max(0).optional().default(''), // honeypot, must stay empty
});
export type BookingFormValues = z.input<typeof bookingFormSchema>;

export const bookingRequestSchema = bookingFormSchema.extend({ idempotencyKey: z.string().uuid() });

export const lookupItemSchema = z.object({
  reference: z.string().regex(/^KS-[A-Z0-9]{8}$/),
  key: z.string().regex(/^[A-Za-z0-9_-]{32}$/),
});
export const lookupSchema = z.object({ items: z.array(lookupItemSchema).min(1).max(10) });
export const cancelSchema = lookupItemSchema.extend({ reason: z.string().max(300).optional().default('') });
export const rescheduleSchema = lookupItemSchema.extend({
  bookingDate: z.string().refine(isRealDate), slotId: z.string().uuid(),
});
